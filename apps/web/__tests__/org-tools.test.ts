import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { executeTool } from "@/lib/ai/tool-executor";
import {
  createMockRestaurant,
  createMockOrder,
  createMockInventoryItem,
} from "@/__tests__/fixtures";
import { Decimal } from "@prisma/client/runtime/library";

const orgAdminContext = {
  userId: "org_admin_1",
  restaurantId: "rest_1",
  organizationId: "org_1",
  userRole: "ORG_ADMIN",
};

const staffContext = {
  userId: "user_1",
  restaurantId: "rest_1",
  organizationId: null,
  userRole: "STAFF",
};

const orgAdminNoOrgContext = {
  userId: "org_admin_1",
  restaurantId: "rest_1",
  organizationId: null,
  userRole: "ORG_ADMIN",
};

// ============================================
// compare_restaurants
// ============================================
describe("compare_restaurants", () => {
  it("returns side-by-side comparison for org restaurants", async () => {
    const rest1 = createMockRestaurant({ id: "rest_1", name: "Downtown" });
    const rest2 = createMockRestaurant({ id: "rest_2", name: "Uptown" });

    // Resolve restaurant IDs (no input IDs, so fetch all org restaurants)
    prismaMock.restaurant.findMany.mockResolvedValueOnce([
      { id: "rest_1" },
      { id: "rest_2" },
    ] as any);

    // Fetch restaurant names
    prismaMock.restaurant.findMany.mockResolvedValueOnce([
      { id: "rest_1", name: "Downtown" },
      { id: "rest_2", name: "Uptown" },
    ] as any);

    // Spend queries per restaurant
    prismaMock.order.findMany.mockResolvedValueOnce([
      createMockOrder({ total: new Decimal("500.00") }),
    ] as any);
    prismaMock.order.count.mockResolvedValueOnce(3);
    prismaMock.inventoryLog.findMany.mockResolvedValueOnce([]);
    prismaMock.inventoryItem.findMany.mockResolvedValueOnce([]);

    prismaMock.order.findMany.mockResolvedValueOnce([
      createMockOrder({ total: new Decimal("800.00") }),
    ] as any);
    prismaMock.order.count.mockResolvedValueOnce(5);
    prismaMock.inventoryLog.findMany.mockResolvedValueOnce([]);
    prismaMock.inventoryItem.findMany.mockResolvedValueOnce([]);

    const result = await executeTool("compare_restaurants", {}, orgAdminContext);

    expect(result.restaurantsCompared).toBe(2);
    expect(result.comparison).toHaveLength(2);
    expect(result.rankings).toBeDefined();
  });

  it("returns error for non-ORG_ADMIN", async () => {
    const result = await executeTool("compare_restaurants", {}, staffContext);
    expect(result.error).toContain("only available to organization admins");
  });

  it("returns error when no organizationId", async () => {
    const result = await executeTool(
      "compare_restaurants",
      {},
      orgAdminNoOrgContext
    );
    expect(result.error).toContain("No organization found");
  });

  it("compares all org restaurants when no IDs specified", async () => {
    prismaMock.restaurant.findMany.mockResolvedValueOnce([
      { id: "rest_1" },
      { id: "rest_2" },
      { id: "rest_3" },
    ] as any);

    prismaMock.restaurant.findMany.mockResolvedValueOnce([
      { id: "rest_1", name: "A" },
      { id: "rest_2", name: "B" },
      { id: "rest_3", name: "C" },
    ] as any);

    // Mock queries for each of 3 restaurants
    for (let i = 0; i < 3; i++) {
      prismaMock.order.findMany.mockResolvedValueOnce([]);
      prismaMock.order.count.mockResolvedValueOnce(0);
      prismaMock.inventoryLog.findMany.mockResolvedValueOnce([]);
      prismaMock.inventoryItem.findMany.mockResolvedValueOnce([]);
    }

    const result = await executeTool("compare_restaurants", {}, orgAdminContext);

    expect(result.restaurantsCompared).toBe(3);
    expect(result.comparison).toHaveLength(3);
  });
});

// ============================================
// org_summary
// ============================================
describe("org_summary", () => {
  it("returns aggregate metrics across org", async () => {
    prismaMock.restaurant.findMany.mockResolvedValueOnce([
      { id: "rest_1", name: "Downtown" },
      { id: "rest_2", name: "Uptown" },
    ] as any);

    prismaMock.order.findMany.mockResolvedValueOnce([
      {
        ...createMockOrder({ total: new Decimal("500.00"), restaurantId: "rest_1" }),
        supplier: { name: "Supplier A" },
      },
      {
        ...createMockOrder({ id: "order_2", total: new Decimal("300.00"), restaurantId: "rest_2" }),
        supplier: { name: "Supplier A" },
      },
    ] as any);

    prismaMock.inventoryItem.findMany.mockResolvedValueOnce([
      createMockInventoryItem({
        currentQuantity: new Decimal("5.000"),
        parLevel: new Decimal("20.000"),
      }),
    ] as any);

    prismaMock.invoice.count.mockResolvedValueOnce(1);

    const result = await executeTool("org_summary", {}, orgAdminContext);

    expect(result.totalSpend).toBe(800);
    expect(result.totalOrders).toBe(2);
    expect(result.totalRestaurants).toBe(2);
    expect(result.topSuppliers).toBeDefined();
    expect(result.perRestaurant).toHaveLength(2);
  });

  it("returns error for non-ORG_ADMIN", async () => {
    const result = await executeTool("org_summary", {}, staffContext);
    expect(result.error).toContain("only available to organization admins");
  });

  it("handles org with no order data gracefully", async () => {
    prismaMock.restaurant.findMany.mockResolvedValueOnce([
      { id: "rest_1", name: "Empty Restaurant" },
    ] as any);

    prismaMock.order.findMany.mockResolvedValueOnce([]);
    prismaMock.inventoryItem.findMany.mockResolvedValueOnce([]);
    prismaMock.invoice.count.mockResolvedValueOnce(0);

    const result = await executeTool("org_summary", {}, orgAdminContext);

    expect(result.totalSpend).toBe(0);
    expect(result.totalOrders).toBe(0);
    expect(result.overdueInvoices).toBe(0);
  });
});

// ============================================
// get_benchmarks with org scope
// ============================================
describe("get_benchmarks with org scope", () => {
  it("filters to org restaurants when scope is organization", async () => {
    // Org restaurants query
    prismaMock.restaurant.findMany.mockResolvedValueOnce([
      { id: "rest_1" },
      { id: "rest_2" },
    ] as any);

    // Waste rate logs (filtered to org restaurants)
    prismaMock.inventoryLog.findMany.mockResolvedValueOnce([]);

    // Spend per cover - restaurants query (filtered to org)
    prismaMock.restaurant.findMany.mockResolvedValueOnce([
      { id: "rest_1", seatingCapacity: 50 },
    ] as any);

    // Supplier pricing - user items
    prismaMock.orderItem.findMany.mockResolvedValueOnce([]);

    const result = await executeTool(
      "get_benchmarks",
      { scope: "organization" },
      orgAdminContext
    );

    expect(result).toBeDefined();
    // The org restaurants query was called to get org IDs
    expect(prismaMock.restaurant.findMany).toHaveBeenCalled();
  });

  it("falls back to platform when no organizationId", async () => {
    // Waste rate logs (platform-wide)
    prismaMock.inventoryLog.findMany.mockResolvedValueOnce([]);

    // Spend per cover - all restaurants
    prismaMock.restaurant.findMany.mockResolvedValueOnce([]);

    // Supplier pricing - user items
    prismaMock.orderItem.findMany.mockResolvedValueOnce([]);

    const result = await executeTool(
      "get_benchmarks",
      { scope: "organization" },
      staffContext
    );

    expect(result).toBeDefined();
    // Should not filter by org since no organizationId
    expect(result.metrics).toBeDefined();
  });
});
