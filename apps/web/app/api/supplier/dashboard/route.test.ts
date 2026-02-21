import { describe, it, expect } from "vitest";
import { GET } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockSupplierUserWithSupplier,
  createMockOrder,
} from "@/__tests__/fixtures";
import { createRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

describe("GET /api/supplier/dashboard", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when supplier not found", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockSupplierUserWithSupplier(),
      supplier: null,
    } as any);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Supplier not found");
  });

  it("returns dashboard stats", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    prismaMock.supplierProduct.count.mockResolvedValueOnce(15);
    prismaMock.order.count.mockResolvedValueOnce(3); // pending
    prismaMock.order.count.mockResolvedValueOnce(2); // confirmed
    prismaMock.order.count.mockResolvedValueOnce(1); // shipped
    prismaMock.order.count.mockResolvedValueOnce(5); // delivered this month
    prismaMock.order.findMany.mockResolvedValueOnce([]); // recent orders
    prismaMock.order.aggregate.mockResolvedValueOnce({
      _sum: { total: new Decimal("5000.00") },
      _count: 0,
      _avg: {},
      _min: {},
      _max: {},
    } as any);

    // top products
    prismaMock.orderItem.groupBy.mockResolvedValueOnce([] as any);
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([]);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.stats.totalProducts).toBe(15);
    expect(data.data.stats.pendingOrders).toBe(3);
    expect(data.data.stats.confirmedOrders).toBe(2);
    expect(data.data.stats.shippedOrders).toBe(1);
    expect(data.data.stats.deliveredOrdersThisMonth).toBe(5);
    expect(data.data.stats.totalRevenue).toBe(5000);
  });

  it("returns Decimal→Number conversion on recentOrders", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    prismaMock.supplierProduct.count.mockResolvedValueOnce(0);
    prismaMock.order.count.mockResolvedValueOnce(0);
    prismaMock.order.count.mockResolvedValueOnce(0);
    prismaMock.order.count.mockResolvedValueOnce(0);
    prismaMock.order.count.mockResolvedValueOnce(0);

    const order = {
      ...createMockOrder({ status: "PENDING" }),
      restaurant: { id: "rest_1", name: "Test Restaurant" },
    };
    prismaMock.order.findMany.mockResolvedValueOnce([order] as any);
    prismaMock.order.aggregate.mockResolvedValueOnce({
      _sum: { total: null },
      _count: 0,
      _avg: {},
      _min: {},
      _max: {},
    } as any);

    prismaMock.orderItem.groupBy.mockResolvedValueOnce([] as any);
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([]);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.recentOrders).toHaveLength(1);
    expect(typeof data.data.recentOrders[0].subtotal).toBe("number");
    expect(typeof data.data.recentOrders[0].total).toBe("number");
    expect(typeof data.data.recentOrders[0].tax).toBe("number");
    expect(typeof data.data.recentOrders[0].deliveryFee).toBe("number");
  });

  it("returns supplier info", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    prismaMock.supplierProduct.count.mockResolvedValueOnce(0);
    prismaMock.order.count.mockResolvedValueOnce(0);
    prismaMock.order.count.mockResolvedValueOnce(0);
    prismaMock.order.count.mockResolvedValueOnce(0);
    prismaMock.order.count.mockResolvedValueOnce(0);
    prismaMock.order.findMany.mockResolvedValueOnce([]);
    prismaMock.order.aggregate.mockResolvedValueOnce({
      _sum: { total: null },
      _count: 0,
      _avg: {},
      _min: {},
      _max: {},
    } as any);
    prismaMock.orderItem.groupBy.mockResolvedValueOnce([] as any);
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([]);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.supplier.id).toBe("sup_1");
    expect(data.data.supplier.name).toBe("Test Supplier");
    expect(data.data.supplier.status).toBe("VERIFIED");
  });

  it("returns topProducts with orderCount and totalRevenue", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    prismaMock.supplierProduct.count.mockResolvedValueOnce(5);
    prismaMock.order.count.mockResolvedValueOnce(0);
    prismaMock.order.count.mockResolvedValueOnce(0);
    prismaMock.order.count.mockResolvedValueOnce(0);
    prismaMock.order.count.mockResolvedValueOnce(0);
    prismaMock.order.findMany.mockResolvedValueOnce([]);
    prismaMock.order.aggregate.mockResolvedValueOnce({
      _sum: { total: null },
      _count: 0,
      _avg: {},
      _min: {},
      _max: {},
    } as any);

    prismaMock.orderItem.groupBy.mockResolvedValueOnce([
      {
        productId: "prod_1",
        _count: { productId: 10 },
        _sum: { subtotal: new Decimal("500.00") },
      },
    ] as any);

    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([
      {
        id: "prod_1",
        name: "Organic Tomatoes",
        category: "PRODUCE",
        price: new Decimal("4.99"),
      },
    ] as any);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.topProducts).toHaveLength(1);
    expect(data.data.topProducts[0].name).toBe("Organic Tomatoes");
    expect(data.data.topProducts[0].orderCount).toBe(10);
    expect(data.data.topProducts[0].totalRevenue).toBe(500);
  });
});
