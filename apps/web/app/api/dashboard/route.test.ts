import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import { createMockUserWithRestaurant } from "@/__tests__/fixtures";
import { createRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

function setupDashboardMocks({
  allOrders = [],
  thisMonthOrders = [],
  lastMonthOrders = [],
  recentOrders = [],
  pendingOrders = 0,
  suppliers = [],
  priceComparisons = [],
}: {
  allOrders?: any[];
  thisMonthOrders?: any[];
  lastMonthOrders?: any[];
  recentOrders?: any[];
  pendingOrders?: number;
  suppliers?: any[];
  priceComparisons?: any[];
} = {}) {
  // The route uses Promise.all with 7 parallel queries.
  // These are resolved in order via sequential mockResolvedValueOnce calls.
  prismaMock.order.findMany
    .mockResolvedValueOnce(allOrders as any)       // allOrders
    .mockResolvedValueOnce(thisMonthOrders as any)  // thisMonthOrders
    .mockResolvedValueOnce(lastMonthOrders as any)  // lastMonthOrders
    .mockResolvedValueOnce(recentOrders as any);    // recentOrders
  prismaMock.order.count.mockResolvedValueOnce(pendingOrders as any);
  prismaMock.order.groupBy.mockResolvedValueOnce(suppliers as any);
  prismaMock.supplierProduct.groupBy.mockResolvedValueOnce(priceComparisons as any);

  // supplierDetails follow-up query
  prismaMock.supplier.findMany.mockResolvedValueOnce(
    suppliers.map((s: any) => ({ id: s.supplierId, name: `Supplier ${s.supplierId}` })) as any
  );
}

describe("GET /api/dashboard", () => {
  beforeEach(() => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when user has no restaurant", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockUserWithRestaurant(),
      restaurant: null,
    } as any);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Restaurant not found");
  });

  it("calculates thisMonthSpend and lastMonthSpend", async () => {
    setupDashboardMocks({
      thisMonthOrders: [
        { total: new Decimal("100.00") },
        { total: new Decimal("200.00") },
      ],
      lastMonthOrders: [
        { total: new Decimal("150.00") },
      ],
    });

    const response = await GET();
    const { data } = await parseResponse(response);

    expect(data.data.stats.thisMonthSpend).toBe(300);
    expect(data.data.stats.lastMonthSpend).toBe(150);
  });

  it("calculates spendChange percentage", async () => {
    setupDashboardMocks({
      thisMonthOrders: [{ total: new Decimal("200.00") }],
      lastMonthOrders: [{ total: new Decimal("100.00") }],
    });

    const response = await GET();
    const { data } = await parseResponse(response);

    expect(data.data.stats.spendChange).toBe(100);
  });

  it("spendChange is 0 when last month is 0", async () => {
    setupDashboardMocks({
      thisMonthOrders: [{ total: new Decimal("200.00") }],
      lastMonthOrders: [],
    });

    const response = await GET();
    const { data } = await parseResponse(response);

    expect(data.data.stats.spendChange).toBe(0);
  });

  it("returns totalOrders count", async () => {
    setupDashboardMocks({
      allOrders: [
        { id: "o1", total: new Decimal("50.00"), status: "DELIVERED", supplierId: "sup_1" },
        { id: "o2", total: new Decimal("75.00"), status: "PENDING", supplierId: "sup_1" },
        { id: "o3", total: new Decimal("25.00"), status: "DRAFT", supplierId: "sup_2" },
      ],
    });

    const response = await GET();
    const { data } = await parseResponse(response);

    expect(data.data.stats.totalOrders).toBe(3);
  });

  it("returns pendingOrders count", async () => {
    setupDashboardMocks({ pendingOrders: 5 });

    const response = await GET();
    const { data } = await parseResponse(response);

    expect(data.data.stats.pendingOrders).toBe(5);
  });

  it("returns activeSuppliers count", async () => {
    setupDashboardMocks({
      allOrders: [
        { id: "o1", total: new Decimal("50.00"), status: "DELIVERED", supplierId: "sup_1" },
        { id: "o2", total: new Decimal("75.00"), status: "PENDING", supplierId: "sup_2" },
        { id: "o3", total: new Decimal("25.00"), status: "DRAFT", supplierId: "sup_1" },
      ],
    });

    const response = await GET();
    const { data } = await parseResponse(response);

    expect(data.data.stats.activeSuppliers).toBe(2);
  });

  it("groups orders by status", async () => {
    setupDashboardMocks({
      allOrders: [
        { id: "o1", total: new Decimal("50.00"), status: "DELIVERED", supplierId: "sup_1" },
        { id: "o2", total: new Decimal("75.00"), status: "DELIVERED", supplierId: "sup_1" },
        { id: "o3", total: new Decimal("25.00"), status: "PENDING", supplierId: "sup_1" },
      ],
    });

    const response = await GET();
    const { data } = await parseResponse(response);

    expect(data.data.ordersByStatus).toEqual({
      DELIVERED: 2,
      PENDING: 1,
    });
  });

  it("formats recent orders", async () => {
    setupDashboardMocks({
      recentOrders: [
        {
          id: "o1",
          orderNumber: "ORD-001",
          status: "DELIVERED",
          total: new Decimal("100.00"),
          supplier: { id: "sup_1", name: "Test Supplier" },
          _count: { items: 3 },
          createdAt: new Date("2024-06-01"),
        },
      ],
    });

    const response = await GET();
    const { data } = await parseResponse(response);

    expect(data.data.recentOrders).toHaveLength(1);
    expect(data.data.recentOrders[0]).toMatchObject({
      id: "o1",
      orderNumber: "ORD-001",
      status: "DELIVERED",
      total: 100,
      supplier: "Test Supplier",
      supplierId: "sup_1",
      itemCount: 3,
    });
  });

  it("formats top suppliers", async () => {
    setupDashboardMocks({
      suppliers: [
        { supplierId: "sup_1", _count: { id: 10 }, _sum: { total: new Decimal("500.00") } },
      ],
    });

    const response = await GET();
    const { data } = await parseResponse(response);

    expect(data.data.topSuppliers).toHaveLength(1);
    expect(data.data.topSuppliers[0]).toMatchObject({
      id: "sup_1",
      name: "Supplier sup_1",
      orderCount: 10,
      totalSpend: 500,
    });
  });

  it("calculates savings opportunities with potentialSavings", async () => {
    setupDashboardMocks({
      priceComparisons: [
        {
          name: "Tomatoes",
          _count: { name: 3 },
          _min: { price: new Decimal("2.00") },
          _max: { price: new Decimal("5.00") },
        },
      ],
    });

    const response = await GET();
    const { data } = await parseResponse(response);

    expect(data.data.savingsOpportunities).toHaveLength(1);
    expect(data.data.savingsOpportunities[0]).toMatchObject({
      productName: "Tomatoes",
      supplierCount: 3,
      lowestPrice: 2,
      highestPrice: 5,
      potentialSavings: 3,
    });
  });

  it("includes restaurant info", async () => {
    setupDashboardMocks();

    const response = await GET();
    const { data } = await parseResponse(response);

    expect(data.data.restaurant).toEqual({
      name: "Test Restaurant",
      cuisineType: "American",
    });
  });

  it("handles empty data gracefully", async () => {
    setupDashboardMocks();

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.stats.totalOrders).toBe(0);
    expect(data.data.stats.thisMonthSpend).toBe(0);
    expect(data.data.stats.lastMonthSpend).toBe(0);
    expect(data.data.recentOrders).toHaveLength(0);
    expect(data.data.topSuppliers).toHaveLength(0);
  });
});
