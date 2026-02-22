import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { executeTool } from "@/lib/ai/tool-executor";
import {
  createMockSupplier,
  createMockProduct,
  createMockOrder,
  createMockOrderItem,
  createMockRestaurant,
} from "@/__tests__/fixtures";
import { Decimal } from "@prisma/client/runtime/library";

const context = { userId: "user_1", restaurantId: "rest_1" };

// ============================================
// GET_BENCHMARKS TESTS
// ============================================
describe("get_benchmarks", () => {
  it("returns waste_rate benchmark with percentile ranking", async () => {
    // Two restaurants: user rest_1 has 10% waste, rest_2 has 30% waste
    const logs = [
      // rest_1 waste
      {
        id: "log_1",
        inventoryItemId: "item_1",
        changeType: "WASTE",
        quantity: new Decimal("10"),
        createdAt: new Date(),
        inventoryItem: { restaurantId: "rest_1" },
      },
      // rest_1 used
      {
        id: "log_2",
        inventoryItemId: "item_1",
        changeType: "USED",
        quantity: new Decimal("90"),
        createdAt: new Date(),
        inventoryItem: { restaurantId: "rest_1" },
      },
      // rest_2 waste
      {
        id: "log_3",
        inventoryItemId: "item_2",
        changeType: "WASTE",
        quantity: new Decimal("30"),
        createdAt: new Date(),
        inventoryItem: { restaurantId: "rest_2" },
      },
      // rest_2 used
      {
        id: "log_4",
        inventoryItemId: "item_2",
        changeType: "USED",
        quantity: new Decimal("70"),
        createdAt: new Date(),
        inventoryItem: { restaurantId: "rest_2" },
      },
    ];

    prismaMock.inventoryLog.findMany.mockResolvedValue(logs as any);

    const result = await executeTool(
      "get_benchmarks",
      { metric: "waste_rate" },
      context
    );

    expect(result.metrics.waste_rate.yourRate).toBe(10);
    expect(result.metrics.waste_rate.restaurantsCompared).toBe(2);
    expect(result.metrics.waste_rate.platformAvg).toBeDefined();
    expect(result.metrics.waste_rate.percentile).toBeDefined();
  });

  it("returns spend_per_cover benchmark with comparison", async () => {
    // Two restaurants with seating capacity and orders
    const restaurants = [
      { id: "rest_1", seatingCapacity: 50 },
      { id: "rest_2", seatingCapacity: 100 },
    ];

    prismaMock.restaurant.findMany.mockResolvedValue(restaurants as any);

    // rest_1: $500 spend / 50 seats = $10/cover
    prismaMock.order.findMany
      .mockResolvedValueOnce([
        { total: new Decimal("500.00") },
      ] as any)
      // rest_2: $800 spend / 100 seats = $8/cover
      .mockResolvedValueOnce([
        { total: new Decimal("800.00") },
      ] as any);

    const result = await executeTool(
      "get_benchmarks",
      { metric: "spend_per_cover" },
      context
    );

    expect(result.metrics.spend_per_cover.yourValue).toBe(10);
    expect(result.metrics.spend_per_cover.restaurantsCompared).toBe(2);
    expect(result.metrics.spend_per_cover.platformAvg).toBeDefined();
    expect(result.metrics.spend_per_cover.percentile).toBeDefined();
  });

  it("returns supplier_pricing comparisons with overpaying flag", async () => {
    // User's order items
    const userItems = [
      {
        productId: "prod_1",
        unitPrice: new Decimal("12.00"),
        product: { id: "prod_1", name: "Tomatoes" },
      },
    ];

    // Platform-wide items (user + others): avg should be ~$10
    const platformItems = [
      { productId: "prod_1", unitPrice: new Decimal("12.00") },
      { productId: "prod_1", unitPrice: new Decimal("9.00") },
      { productId: "prod_1", unitPrice: new Decimal("9.00") },
    ];

    prismaMock.orderItem.findMany
      .mockResolvedValueOnce(userItems as any)
      .mockResolvedValueOnce(platformItems as any);

    const result = await executeTool(
      "get_benchmarks",
      { metric: "supplier_pricing" },
      context
    );

    expect(result.metrics.supplier_pricing.productsCompared).toBe(1);
    expect(result.metrics.supplier_pricing.overpayingCount).toBe(1);
    expect(result.metrics.supplier_pricing.comparisons[0].overpaying).toBe(true);
  });

  it("returns all metrics when no metric specified", async () => {
    // Waste rate data
    const logs = [
      {
        id: "log_1",
        changeType: "WASTE",
        quantity: new Decimal("5"),
        inventoryItem: { restaurantId: "rest_1" },
      },
      {
        id: "log_2",
        changeType: "USED",
        quantity: new Decimal("95"),
        inventoryItem: { restaurantId: "rest_1" },
      },
      {
        id: "log_3",
        changeType: "WASTE",
        quantity: new Decimal("20"),
        inventoryItem: { restaurantId: "rest_2" },
      },
      {
        id: "log_4",
        changeType: "USED",
        quantity: new Decimal("80"),
        inventoryItem: { restaurantId: "rest_2" },
      },
    ];
    prismaMock.inventoryLog.findMany.mockResolvedValue(logs as any);

    // Spend per cover data
    prismaMock.restaurant.findMany.mockResolvedValue([
      { id: "rest_1", seatingCapacity: 50 },
      { id: "rest_2", seatingCapacity: 100 },
    ] as any);
    prismaMock.order.findMany
      .mockResolvedValueOnce([{ total: new Decimal("500.00") }] as any)
      .mockResolvedValueOnce([{ total: new Decimal("800.00") }] as any);

    // Supplier pricing data
    prismaMock.orderItem.findMany
      .mockResolvedValueOnce([
        {
          productId: "prod_1",
          unitPrice: new Decimal("10.00"),
          product: { id: "prod_1", name: "Tomatoes" },
        },
      ] as any)
      .mockResolvedValueOnce([
        { productId: "prod_1", unitPrice: new Decimal("10.00") },
        { productId: "prod_1", unitPrice: new Decimal("10.00") },
      ] as any);

    const result = await executeTool("get_benchmarks", {}, context);

    expect(result.metrics.waste_rate).toBeDefined();
    expect(result.metrics.spend_per_cover).toBeDefined();
    expect(result.metrics.supplier_pricing).toBeDefined();
  });

  it("handles insufficient data gracefully", async () => {
    // No logs
    prismaMock.inventoryLog.findMany.mockResolvedValue([]);

    const result = await executeTool(
      "get_benchmarks",
      { metric: "waste_rate" },
      context
    );

    expect(result.metrics.waste_rate.message).toContain("Insufficient");
  });

  it("filters by category when provided", async () => {
    prismaMock.inventoryLog.findMany.mockResolvedValue([]);

    await executeTool(
      "get_benchmarks",
      { metric: "waste_rate", category: "PRODUCE" },
      context
    );

    expect(prismaMock.inventoryLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          inventoryItem: { category: "PRODUCE" },
        }),
      })
    );
  });
});

// ============================================
// GET_NEGOTIATION_BRIEF TESTS
// ============================================
describe("get_negotiation_brief", () => {
  const supplier = {
    ...createMockSupplier({ id: "sup_1", name: "Fresh Farms" }),
    products: [
      createMockProduct({ id: "prod_1", name: "Tomatoes", price: new Decimal("5.00") }),
      createMockProduct({ id: "prod_2", name: "Lettuce", price: new Decimal("3.00") }),
    ],
    deliveryFee: new Decimal("15.00"),
  };

  it("returns full briefing with all sections", async () => {
    prismaMock.supplier.findFirst.mockResolvedValue(supplier as any);

    // Order history
    prismaMock.order.findMany
      .mockResolvedValueOnce([
        { total: new Decimal("200.00"), createdAt: new Date() },
        { total: new Decimal("300.00"), createdAt: new Date() },
      ] as any)
      // Delivered orders for delivery performance
      .mockResolvedValueOnce([] as any);

    // Price history
    prismaMock.priceHistory.findMany.mockResolvedValue([]);

    // No cheaper alternatives
    prismaMock.supplierProduct.findMany.mockResolvedValue([] as any);

    const result = await executeTool(
      "get_negotiation_brief",
      { supplier_name: "Fresh Farms" },
      context
    );

    expect(result.supplier).toBe("Fresh Farms");
    expect(result.orderHistory).toBeDefined();
    expect(result.orderHistory.totalOrders).toBe(2);
    expect(result.orderHistory.totalSpend).toBe(500);
    expect(result.priceChanges).toBeDefined();
    expect(result.deliveryPerformance).toBeDefined();
    expect(result.marketAlternatives).toBeDefined();
    expect(result.leveragePoints).toBeDefined();
  });

  it("returns error when supplier not found", async () => {
    prismaMock.supplier.findFirst.mockResolvedValue(null);

    const result = await executeTool(
      "get_negotiation_brief",
      { supplier_name: "Nonexistent" },
      context
    );

    expect(result.error).toBe("Supplier not found.");
  });

  it("returns error when no identifier provided", async () => {
    const result = await executeTool("get_negotiation_brief", {}, context);

    expect(result.error).toContain("supplier_name or supplier_id");
  });

  it("generates leverage points for price increases", async () => {
    prismaMock.supplier.findFirst.mockResolvedValue(supplier as any);

    // Orders (>= 10 for high volume leverage)
    const manyOrders = Array.from({ length: 12 }, (_, i) => ({
      total: new Decimal("100.00"),
      createdAt: new Date(),
    }));
    prismaMock.order.findMany
      .mockResolvedValueOnce(manyOrders as any)
      .mockResolvedValueOnce([] as any);

    // Price history showing increases
    prismaMock.priceHistory.findMany.mockResolvedValue([
      { productId: "prod_1", price: new Decimal("4.00"), recordedAt: new Date("2025-12-01") },
      { productId: "prod_1", price: new Decimal("5.50"), recordedAt: new Date("2026-02-01") },
    ] as any);

    prismaMock.supplierProduct.findMany.mockResolvedValue([] as any);

    const result = await executeTool(
      "get_negotiation_brief",
      { supplier_name: "Fresh Farms" },
      context
    );

    expect(result.leveragePoints.length).toBeGreaterThan(0);
    // Should have high volume leverage
    const volumePoint = result.leveragePoints.find((p: string) => p.includes("volume"));
    expect(volumePoint).toBeDefined();
    // Should have price increase leverage
    const pricePoint = result.leveragePoints.find((p: string) => p.includes("increases"));
    expect(pricePoint).toBeDefined();
  });

  it("finds cheaper market alternatives from other suppliers", async () => {
    prismaMock.supplier.findFirst.mockResolvedValue(supplier as any);

    prismaMock.order.findMany
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);

    prismaMock.priceHistory.findMany.mockResolvedValue([]);

    // Return a cheaper alternative for each product query
    prismaMock.supplierProduct.findMany.mockResolvedValue([
      {
        ...createMockProduct({ name: "Tomatoes Organic", price: new Decimal("3.50") }),
        supplier: { name: "Cheaper Farms" },
      },
    ] as any);

    const result = await executeTool(
      "get_negotiation_brief",
      { supplier_name: "Fresh Farms" },
      context
    );

    expect(result.marketAlternatives.count).toBeGreaterThan(0);
    expect(result.marketAlternatives.alternatives[0].savings).toBeGreaterThan(0);
    expect(result.marketAlternatives.alternatives[0].alternativeSupplier).toBe("Cheaper Farms");
  });

  it("calculates on-time and invoice accuracy rates", async () => {
    prismaMock.supplier.findFirst.mockResolvedValue(supplier as any);

    prismaMock.order.findMany
      // Regular order history
      .mockResolvedValueOnce([
        { total: new Decimal("100.00"), createdAt: new Date() },
      ] as any)
      // Delivered orders for performance
      .mockResolvedValueOnce([
        {
          ...createMockOrder({
            deliveryDate: new Date("2026-02-10"),
            deliveredAt: new Date("2026-02-10"), // on time
            total: new Decimal("100.00"),
          }),
          invoice: { total: new Decimal("100.50") }, // within 1%
        },
        {
          ...createMockOrder({
            deliveryDate: new Date("2026-02-12"),
            deliveredAt: new Date("2026-02-15"), // late (> 1 day grace)
            total: new Decimal("200.00"),
          }),
          invoice: { total: new Decimal("250.00") }, // inaccurate (>1%)
        },
      ] as any);

    prismaMock.priceHistory.findMany.mockResolvedValue([]);
    prismaMock.supplierProduct.findMany.mockResolvedValue([] as any);

    const result = await executeTool(
      "get_negotiation_brief",
      { supplier_name: "Fresh Farms" },
      context
    );

    expect(result.deliveryPerformance.onTimePercent).toBe(50);
    expect(result.deliveryPerformance.invoiceAccuracyPercent).toBe(50);
    expect(result.deliveryPerformance.onTimeOrders).toBe(1);
    expect(result.deliveryPerformance.accurateInvoices).toBe(1);
  });
});
