import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import { createMockUserWithRestaurant } from "@/__tests__/fixtures";
import { createRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

function makeOrder(overrides?: Record<string, unknown>) {
  return {
    id: "o1",
    orderNumber: "ORD-001",
    total: new Decimal("100.00"),
    status: "DELIVERED",
    createdAt: new Date("2024-06-01"),
    supplier: { id: "sup_1", name: "Farm Fresh" },
    items: [
      {
        id: "item_1",
        subtotal: new Decimal("50.00"),
        quantity: new Decimal("10"),
        product: { id: "prod_1", name: "Tomatoes", category: "PRODUCE" },
      },
      {
        id: "item_2",
        subtotal: new Decimal("50.00"),
        quantity: new Decimal("5"),
        product: { id: "prod_2", name: "Lettuce", category: "PRODUCE" },
      },
    ],
    ...overrides,
  };
}

describe("GET /api/analytics", () => {
  beforeEach(() => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(createRequest("http://localhost/api/analytics"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when user has no restaurant", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockUserWithRestaurant(),
      restaurant: null,
    } as any);

    const response = await GET(createRequest("http://localhost/api/analytics"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Restaurant not found");
  });

  it("calculates overview totalSpend", async () => {
    prismaMock.order.findMany.mockResolvedValueOnce([
      makeOrder({ total: new Decimal("100.00") }),
      makeOrder({ id: "o2", total: new Decimal("200.00") }),
    ] as any);

    const response = await GET(createRequest("http://localhost/api/analytics"));
    const { data } = await parseResponse(response);

    expect(data.data.overview.totalSpend).toBe(300);
  });

  it("calculates avgOrderValue", async () => {
    prismaMock.order.findMany.mockResolvedValueOnce([
      makeOrder({ total: new Decimal("100.00") }),
      makeOrder({ id: "o2", total: new Decimal("200.00") }),
    ] as any);

    const response = await GET(createRequest("http://localhost/api/analytics"));
    const { data } = await parseResponse(response);

    expect(data.data.overview.avgOrderValue).toBe(150);
  });

  it("avgOrderValue is 0 when no orders", async () => {
    prismaMock.order.findMany.mockResolvedValueOnce([] as any);

    const response = await GET(createRequest("http://localhost/api/analytics"));
    const { data } = await parseResponse(response);

    expect(data.data.overview.avgOrderValue).toBe(0);
  });

  it("calculates totalItems", async () => {
    prismaMock.order.findMany.mockResolvedValueOnce([
      makeOrder({ items: [{ id: "i1", subtotal: new Decimal("10"), quantity: new Decimal("1"), product: { id: "p1", name: "A", category: "PRODUCE" } }] }),
      makeOrder({ id: "o2", items: [
        { id: "i2", subtotal: new Decimal("10"), quantity: new Decimal("1"), product: { id: "p2", name: "B", category: "PRODUCE" } },
        { id: "i3", subtotal: new Decimal("10"), quantity: new Decimal("1"), product: { id: "p3", name: "C", category: "DAIRY" } },
      ] }),
    ] as any);

    const response = await GET(createRequest("http://localhost/api/analytics"));
    const { data } = await parseResponse(response);

    expect(data.data.overview.totalItems).toBe(3);
  });

  it("calculates uniqueSuppliers count", async () => {
    prismaMock.order.findMany.mockResolvedValueOnce([
      makeOrder({ supplier: { id: "sup_1", name: "Farm A" } }),
      makeOrder({ id: "o2", supplier: { id: "sup_2", name: "Farm B" } }),
      makeOrder({ id: "o3", supplier: { id: "sup_1", name: "Farm A" } }),
    ] as any);

    const response = await GET(createRequest("http://localhost/api/analytics"));
    const { data } = await parseResponse(response);

    expect(data.data.overview.uniqueSuppliers).toBe(2);
  });

  it("calculates spend by supplier sorted desc", async () => {
    prismaMock.order.findMany.mockResolvedValueOnce([
      makeOrder({ total: new Decimal("100.00"), supplier: { id: "sup_1", name: "Farm A" } }),
      makeOrder({ id: "o2", total: new Decimal("300.00"), supplier: { id: "sup_2", name: "Farm B" } }),
      makeOrder({ id: "o3", total: new Decimal("50.00"), supplier: { id: "sup_1", name: "Farm A" } }),
    ] as any);

    const response = await GET(createRequest("http://localhost/api/analytics"));
    const { data } = await parseResponse(response);

    expect(data.data.spendBySupplier[0].name).toBe("Farm B");
    expect(data.data.spendBySupplier[0].total).toBe(300);
    expect(data.data.spendBySupplier[1].name).toBe("Farm A");
    expect(data.data.spendBySupplier[1].total).toBe(150);
  });

  it("calculates spend by category sorted desc", async () => {
    const order = makeOrder({
      items: [
        { id: "i1", subtotal: new Decimal("200.00"), quantity: new Decimal("10"), product: { id: "p1", name: "Tomatoes", category: "PRODUCE" } },
        { id: "i2", subtotal: new Decimal("50.00"), quantity: new Decimal("5"), product: { id: "p2", name: "Milk", category: "DAIRY" } },
      ],
    });
    prismaMock.order.findMany.mockResolvedValueOnce([order] as any);

    const response = await GET(createRequest("http://localhost/api/analytics"));
    const { data } = await parseResponse(response);

    expect(data.data.spendByCategory[0].category).toBe("PRODUCE");
    expect(data.data.spendByCategory[0].total).toBe(200);
    expect(data.data.spendByCategory[1].category).toBe("DAIRY");
    expect(data.data.spendByCategory[1].total).toBe(50);
  });

  it("returns top 10 products by spend", async () => {
    const items = Array.from({ length: 12 }, (_, i) => ({
      id: `item_${i}`,
      subtotal: new Decimal(`${(12 - i) * 10}`),
      quantity: new Decimal("1"),
      product: { id: `prod_${i}`, name: `Product ${i}`, category: "PRODUCE" },
    }));
    prismaMock.order.findMany.mockResolvedValueOnce([
      makeOrder({ items }),
    ] as any);

    const response = await GET(createRequest("http://localhost/api/analytics"));
    const { data } = await parseResponse(response);

    expect(data.data.topProducts).toHaveLength(10);
    expect(data.data.topProducts[0].total).toBeGreaterThanOrEqual(data.data.topProducts[9].total);
  });

  it("initializes 30-day time series with zeros", async () => {
    prismaMock.order.findMany.mockResolvedValueOnce([] as any);

    const response = await GET(createRequest("http://localhost/api/analytics"));
    const { data } = await parseResponse(response);

    expect(data.data.spendOverTime).toHaveLength(30);
    data.data.spendOverTime.forEach((day: any) => {
      expect(day.total).toBe(0);
      expect(day.orders).toBe(0);
    });
  });

  it("groups orders by day in time series", async () => {
    const today = new Date();
    const todayStr = today.toISOString().split("T")[0];

    prismaMock.order.findMany.mockResolvedValueOnce([
      makeOrder({
        total: new Decimal("100.00"),
        createdAt: new Date(todayStr + "T10:00:00Z"),
      }),
      makeOrder({
        id: "o2",
        total: new Decimal("50.00"),
        createdAt: new Date(todayStr + "T15:00:00Z"),
      }),
    ] as any);

    const response = await GET(createRequest("http://localhost/api/analytics"));
    const { data } = await parseResponse(response);

    const todayEntry = data.data.spendOverTime.find((d: any) => d.date === todayStr);
    expect(todayEntry).toBeDefined();
    expect(todayEntry.total).toBe(150);
    expect(todayEntry.orders).toBe(2);
  });

  it("sorts time series chronologically", async () => {
    prismaMock.order.findMany.mockResolvedValueOnce([] as any);

    const response = await GET(createRequest("http://localhost/api/analytics"));
    const { data } = await parseResponse(response);

    for (let i = 1; i < data.data.spendOverTime.length; i++) {
      expect(new Date(data.data.spendOverTime[i].date).getTime())
        .toBeGreaterThanOrEqual(new Date(data.data.spendOverTime[i - 1].date).getTime());
    }
  });

  it("calculates orders by status distribution", async () => {
    prismaMock.order.findMany.mockResolvedValueOnce([
      makeOrder({ status: "DELIVERED" }),
      makeOrder({ id: "o2", status: "DELIVERED" }),
      makeOrder({ id: "o3", status: "PENDING" }),
      makeOrder({ id: "o4", status: "CANCELLED" }),
    ] as any);

    const response = await GET(createRequest("http://localhost/api/analytics"));
    const { data } = await parseResponse(response);

    const statusMap = Object.fromEntries(
      data.data.ordersByStatus.map((s: any) => [s.status, s.count])
    );
    expect(statusMap.DELIVERED).toBe(2);
    expect(statusMap.PENDING).toBe(1);
    expect(statusMap.CANCELLED).toBe(1);
  });

  it("handles empty orders gracefully", async () => {
    prismaMock.order.findMany.mockResolvedValueOnce([] as any);

    const response = await GET(createRequest("http://localhost/api/analytics"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.overview.totalSpend).toBe(0);
    expect(data.data.overview.totalOrders).toBe(0);
    expect(data.data.overview.totalItems).toBe(0);
    expect(data.data.overview.avgOrderValue).toBe(0);
    expect(data.data.spendBySupplier).toHaveLength(0);
    expect(data.data.spendByCategory).toHaveLength(0);
    expect(data.data.topProducts).toHaveLength(0);
    expect(data.data.ordersByStatus).toHaveLength(0);
    expect(data.data.recentOrders).toHaveLength(0);
  });
});
