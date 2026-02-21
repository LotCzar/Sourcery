import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { executeTool } from "@/lib/ai/tool-executor";
import {
  createMockInventoryItem,
  createMockProduct,
  createMockSupplier,
  createMockInvoice,
  createMockOrder,
  createMockOrderItem,
  createMockConsumptionInsight,
  createMockInventoryLog,
  createMockUser,
} from "@/__tests__/fixtures";
import { Decimal } from "@prisma/client/runtime/library";

const context = { userId: "user_1", restaurantId: "rest_1" };

describe("generate_restock_list", () => {
  it("returns grouped restock list for items below par", async () => {
    const item = {
      ...createMockInventoryItem({ currentQuantity: new Decimal("5.000") }),
      supplierProduct: {
        ...createMockProduct(),
        supplier: { id: "sup_1", name: "Test Supplier", deliveryFee: new Decimal("10.00") },
      },
      consumptionInsights: [],
    };

    prismaMock.inventoryItem.findMany.mockResolvedValue([item] as any);

    const result = await executeTool("generate_restock_list", {}, context);

    expect(result.totalItems).toBe(1);
    expect(result.supplierGroups).toHaveLength(1);
    expect(result.supplierGroups[0].supplier).toBe("Test Supplier");
    expect(result.supplierGroups[0].items[0].suggestedQuantity).toBeGreaterThan(0);
  });

  it("creates draft orders when auto_create_orders is true", async () => {
    const item = {
      ...createMockInventoryItem({ currentQuantity: new Decimal("5.000") }),
      supplierProduct: {
        ...createMockProduct(),
        supplier: { id: "sup_1", name: "Test Supplier", deliveryFee: new Decimal("10.00") },
      },
      consumptionInsights: [],
    };

    prismaMock.inventoryItem.findMany.mockResolvedValue([item] as any);
    prismaMock.user.findFirst.mockResolvedValue(createMockUser() as any);
    prismaMock.order.create.mockResolvedValue({
      id: "order_1",
      orderNumber: "ORD-TEST",
      supplier: { name: "Test Supplier" },
    } as any);

    const result = await executeTool(
      "generate_restock_list",
      { auto_create_orders: true },
      context
    );

    expect(result.ordersCreated).toBeDefined();
    expect(result.ordersCreated.length).toBe(1);
    expect(prismaMock.order.create).toHaveBeenCalled();
  });

  it("handles empty inventory", async () => {
    prismaMock.inventoryItem.findMany.mockResolvedValue([]);

    const result = await executeTool("generate_restock_list", {}, context);
    expect(result.message).toContain("above par level");
  });
});

describe("check_invoice", () => {
  it("flags discrepancies between invoice and order", async () => {
    const invoice = {
      ...createMockInvoice({ subtotal: new Decimal("120.00"), total: new Decimal("130.00") }),
      order: {
        ...createMockOrder({ subtotal: new Decimal("100.00"), total: new Decimal("118.25") }),
        orderNumber: "ORD-TEST-001",
        items: [
          {
            ...createMockOrderItem(),
            unitPrice: new Decimal("4.99"),
            product: { name: "Tomatoes", price: new Decimal("5.49"), unit: "POUND" },
          },
        ],
      },
      supplier: { name: "Test Supplier" },
    };

    prismaMock.invoice.findFirst.mockResolvedValue(invoice as any);

    const result = await executeTool(
      "check_invoice",
      { invoice_number: "INV-001" },
      context
    );

    expect(result.status).toBe("DISCREPANCIES_FOUND");
    expect(result.discrepancies.length).toBeGreaterThan(0);
  });

  it("returns MATCH when invoice matches order", async () => {
    const matchingTotal = new Decimal("108.25");
    const matchingSubtotal = new Decimal("100.00");
    const matchingTax = new Decimal("8.25");
    const invoice = {
      ...createMockInvoice({ subtotal: matchingSubtotal, tax: matchingTax, total: matchingTotal }),
      order: {
        ...createMockOrder({ subtotal: matchingSubtotal, tax: matchingTax, total: matchingTotal }),
        orderNumber: "ORD-TEST-001",
        items: [
          {
            ...createMockOrderItem(),
            unitPrice: new Decimal("4.99"),
            product: { name: "Tomatoes", price: new Decimal("4.99"), unit: "POUND" },
          },
        ],
      },
      supplier: { name: "Test Supplier" },
    };

    prismaMock.invoice.findFirst.mockResolvedValue(invoice as any);

    const result = await executeTool(
      "check_invoice",
      { invoice_id: "inv_1" },
      context
    );

    expect(result.status).toBe("MATCH");
    expect(result.discrepancies).toHaveLength(0);
  });

  it("handles invoice without linked order", async () => {
    const invoice = {
      ...createMockInvoice({ orderId: null }),
      order: null,
      supplier: { name: "Test Supplier" },
    };

    prismaMock.invoice.findFirst.mockResolvedValue(invoice as any);

    const result = await executeTool(
      "check_invoice",
      { invoice_number: "INV-001" },
      context
    );

    expect(result.status).toBe("NO_LINKED_ORDER");
  });
});

describe("calculate_menu_cost", () => {
  it("calculates per-plate cost and suggests price", async () => {
    const product = {
      ...createMockProduct({ price: new Decimal("3.00") }),
      supplier: { name: "Fresh Farms" },
    };

    prismaMock.supplierProduct.findMany.mockResolvedValue([product] as any);

    const result = await executeTool(
      "calculate_menu_cost",
      {
        dish_name: "Caesar Salad",
        ingredients: [{ name: "romaine", quantity: 0.5 }],
        target_food_cost_percent: 30,
      },
      context
    );

    expect(result.dishName).toBe("Caesar Salad");
    expect(result.totalCostPerPlate).toBe(1.5);
    expect(result.suggestedMenuPrice).toBe(5);
    expect(result.ingredients).toHaveLength(1);
    expect(result.ingredients[0].status).toBe("FOUND");
  });

  it("handles missing ingredients", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValue([]);

    const result = await executeTool(
      "calculate_menu_cost",
      {
        dish_name: "Mystery Dish",
        ingredients: [{ name: "unicorn tears", quantity: 1 }],
      },
      context
    );

    expect(result.missingIngredients).toContain("unicorn tears");
    expect(result.ingredients[0].status).toBe("NOT_FOUND");
  });

  it("uses custom food cost percentage", async () => {
    const product = {
      ...createMockProduct({ price: new Decimal("10.00") }),
      supplier: { name: "Supplier A" },
    };

    prismaMock.supplierProduct.findMany.mockResolvedValue([product] as any);

    const result = await executeTool(
      "calculate_menu_cost",
      {
        dish_name: "Premium Steak",
        ingredients: [{ name: "ribeye", quantity: 1 }],
        target_food_cost_percent: 25,
      },
      context
    );

    expect(result.targetFoodCostPercent).toBe(25);
    expect(result.suggestedMenuPrice).toBe(40);
  });
});

describe("recommend_supplier", () => {
  it("ranks suppliers by composite score", async () => {
    const products = [
      {
        ...createMockProduct({ id: "p1", price: new Decimal("3.00") }),
        supplier: {
          id: "sup_1",
          name: "Cheap Supplier",
          rating: new Decimal("4.00"),
          leadTimeDays: 2,
          deliveryFee: new Decimal("5.00"),
          minimumOrder: new Decimal("25.00"),
          status: "VERIFIED",
          reviewCount: 20,
        },
      },
      {
        ...createMockProduct({ id: "p2", price: new Decimal("5.00") }),
        supplier: {
          id: "sup_2",
          name: "Premium Supplier",
          rating: new Decimal("5.00"),
          leadTimeDays: 1,
          deliveryFee: new Decimal("0.00"),
          minimumOrder: new Decimal("50.00"),
          status: "VERIFIED",
          reviewCount: 50,
        },
      },
    ];

    prismaMock.supplierProduct.findMany.mockResolvedValue(products as any);
    prismaMock.order.groupBy.mockResolvedValue([
      { supplierId: "sup_1", _count: { id: 10 } },
      { supplierId: "sup_2", _count: { id: 5 } },
    ] as any);

    const result = await executeTool(
      "recommend_supplier",
      { product_name: "tomatoes" },
      context
    );

    expect(result.recommendations).toHaveLength(2);
    expect(result.recommendations[0].score).toBeGreaterThanOrEqual(
      result.recommendations[1].score
    );
    expect(result.topPick).toBeDefined();
  });

  it("excludes non-verified suppliers", async () => {
    const products = [
      {
        ...createMockProduct(),
        supplier: {
          id: "sup_1",
          name: "Unverified",
          rating: new Decimal("5.00"),
          leadTimeDays: 1,
          deliveryFee: new Decimal("0.00"),
          minimumOrder: null,
          status: "PENDING",
          reviewCount: 0,
        },
      },
    ];

    prismaMock.supplierProduct.findMany.mockResolvedValue(products as any);

    const result = await executeTool(
      "recommend_supplier",
      { product_name: "tomatoes" },
      context
    );

    expect(result.message).toContain("No verified suppliers");
  });

  it("returns error when no search criteria provided", async () => {
    const result = await executeTool("recommend_supplier", {}, context);
    expect(result.error).toBeDefined();
  });
});

describe("analyze_waste", () => {
  it("aggregates waste logs and calculates dollar loss", async () => {
    const items = [
      createMockInventoryItem({
        id: "item_1",
        costPerUnit: new Decimal("4.00"),
        parLevel: new Decimal("20.000"),
      }),
    ];

    const wasteLogs = [
      createMockInventoryLog({
        id: "log_w1",
        changeType: "WASTE",
        quantity: new Decimal("10.000"),
        inventoryItemId: "item_1",
      }),
    ];

    const usedLogs = [
      createMockInventoryLog({
        id: "log_u1",
        changeType: "USED",
        quantity: new Decimal("30.000"),
        inventoryItemId: "item_1",
      }),
    ];

    prismaMock.inventoryItem.findMany.mockResolvedValue(items as any);
    prismaMock.inventoryLog.findMany
      .mockResolvedValueOnce(wasteLogs as any) // WASTE logs
      .mockResolvedValueOnce(usedLogs as any); // USED logs

    const result = await executeTool("analyze_waste", { days: 30 }, context);

    expect(result.itemsWithWaste).toBe(1);
    expect(result.totalDollarLoss).toBe(40);
    expect(result.items[0].wastePercent).toBe(25);
    expect(result.items[0].dollarLoss).toBe(40);
  });

  it("suggests par reductions for high-waste items", async () => {
    const items = [
      createMockInventoryItem({
        id: "item_1",
        costPerUnit: new Decimal("4.00"),
        parLevel: new Decimal("50.000"),
      }),
    ];

    const wasteLogs = [
      createMockInventoryLog({
        changeType: "WASTE",
        quantity: new Decimal("30.000"),
        inventoryItemId: "item_1",
      }),
    ];

    const usedLogs = [
      createMockInventoryLog({
        changeType: "USED",
        quantity: new Decimal("20.000"),
        inventoryItemId: "item_1",
      }),
    ];

    prismaMock.inventoryItem.findMany.mockResolvedValue(items as any);
    prismaMock.inventoryLog.findMany
      .mockResolvedValueOnce(wasteLogs as any)
      .mockResolvedValueOnce(usedLogs as any);

    const result = await executeTool("analyze_waste", {}, context);

    expect(result.items[0].wastePercent).toBe(60);
    expect(result.items[0].suggestion).toBeDefined();
    expect(result.items[0].suggestedParLevel).toBeLessThan(50);
    expect(result.highWasteItemCount).toBe(1);
  });

  it("returns empty message when no waste logs exist", async () => {
    prismaMock.inventoryItem.findMany.mockResolvedValue([
      createMockInventoryItem(),
    ] as any);
    prismaMock.inventoryLog.findMany.mockResolvedValue([]);

    const result = await executeTool("analyze_waste", {}, context);

    expect(result.items).toHaveLength(0);
    expect(result.message).toContain("No waste recorded");
  });
});
