import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUser,
  createMockOrgAdmin,
  createMockOrder,
} from "@/__tests__/fixtures";
import { createRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

describe("GET /api/org/summary", () => {
  let GET: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/org/summary/route");
    GET = mod.GET;
  });

  it("returns 403 for non-ORG_ADMIN", async () => {
    const user = createMockUser({ role: "STAFF" });
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const res = await GET(createRequest("http://localhost/api/org/summary"));
    const { status } = await parseResponse(res);

    expect(status).toBe(403);
  });

  it("returns aggregated metrics", async () => {
    const user = createMockOrgAdmin();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    // Restaurants
    prismaMock.restaurant.findMany.mockResolvedValueOnce([
      { id: "rest_1", name: "Downtown" },
      { id: "rest_2", name: "Uptown" },
    ] as any);

    // This month orders
    prismaMock.order.findMany.mockResolvedValueOnce([
      {
        ...createMockOrder({ total: new Decimal("500.00"), restaurantId: "rest_1" }),
        supplier: { name: "Supplier A" },
      },
    ] as any);

    // Last month orders
    prismaMock.order.findMany.mockResolvedValueOnce([
      {
        ...createMockOrder({ total: new Decimal("400.00") }),
        supplier: { name: "Supplier A" },
      },
    ] as any);

    // Low stock items
    prismaMock.inventoryItem.findMany.mockResolvedValueOnce([
      {
        currentQuantity: new Decimal("3.000"),
        parLevel: new Decimal("10.000"),
      },
    ] as any);

    // Supplier orders for top suppliers
    prismaMock.order.findMany.mockResolvedValueOnce([
      {
        ...createMockOrder({ total: new Decimal("500.00") }),
        supplier: { name: "Supplier A" },
      },
    ] as any);

    const res = await GET(createRequest("http://localhost/api/org/summary"));
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.data.totalSpend).toBe(500);
    expect(data.data.totalRestaurants).toBe(2);
    expect(data.data.totalLowStockAlerts).toBe(1);
  });

  it("handles empty org gracefully", async () => {
    const user = createMockOrgAdmin();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    prismaMock.restaurant.findMany.mockResolvedValueOnce([]);
    prismaMock.order.findMany.mockResolvedValueOnce([]);
    prismaMock.order.findMany.mockResolvedValueOnce([]);
    prismaMock.inventoryItem.findMany.mockResolvedValueOnce([]);
    prismaMock.order.findMany.mockResolvedValueOnce([]);

    const res = await GET(createRequest("http://localhost/api/org/summary"));
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.data.totalSpend).toBe(0);
    expect(data.data.totalOrders).toBe(0);
    expect(data.data.totalRestaurants).toBe(0);
  });
});
