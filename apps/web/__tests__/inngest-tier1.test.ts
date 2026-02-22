import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "./mocks/prisma";
import {
  createMockUser,
  createMockRestaurant,
  createMockSupplier,
  createMockInventoryItem,
  createMockProduct,
  createMockOrder,
  createMockOrderItem,
  createMockInvoice,
} from "./fixtures";
import { Decimal } from "@prisma/client/runtime/library";

// ============================================
// AUTO-INVENTORY RECONCILIATION TESTS
// ============================================
describe("Auto-Inventory Reconciliation", () => {
  let handler: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    await import("@/lib/inngest/functions/inventory-reconciliation");
    const { getInngestHandler } = await import("./mocks/inngest");
    handler = getInngestHandler("inventory-reconciliation")!;
  });

  it("updates inventory quantities for matched items on delivery", async () => {
    const supplier = createMockSupplier();
    const product = createMockProduct({ id: "prod_1", name: "Organic Tomatoes" });
    const order = createMockOrder({
      id: "order_1",
      orderNumber: "ORD-001",
      status: "DELIVERED",
      supplier: { name: supplier.name },
      items: [
        createMockOrderItem({
          productId: "prod_1",
          quantity: new Decimal("10"),
          product: { id: "prod_1", name: "Organic Tomatoes" },
        }),
      ],
    });
    const owner = createMockUser();
    const inventoryItem = createMockInventoryItem({
      id: "inv_1",
      supplierProductId: "prod_1",
      currentQuantity: new Decimal("5.000"),
    });

    prismaMock.order.findUnique.mockResolvedValue(order as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.inventoryItem.findFirst.mockResolvedValue(inventoryItem as any);
    prismaMock.inventoryItem.update.mockResolvedValue({} as any);
    prismaMock.inventoryLog.create.mockResolvedValue({} as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler({
      event: { data: { orderId: "order_1", restaurantId: "rest_1" } },
    });

    expect(result.action).toBe("reconciled");
    expect(result.reconciled).toBe(1);
    expect(result.skipped).toBe(0);

    const updateCall = prismaMock.inventoryItem.update.mock.calls[0][0] as any;
    expect(updateCall.data.currentQuantity).toBe(15); // 5 + 10
  });

  it("creates inventory log with RECEIVED type and order reference", async () => {
    const order = createMockOrder({
      id: "order_1",
      orderNumber: "ORD-001",
      supplier: { name: "Test Supplier" },
      items: [
        createMockOrderItem({
          productId: "prod_1",
          quantity: new Decimal("10"),
          product: { id: "prod_1", name: "Tomatoes" },
        }),
      ],
    });
    const owner = createMockUser({ id: "user_1" });
    const inventoryItem = createMockInventoryItem({
      supplierProductId: "prod_1",
      currentQuantity: new Decimal("5.000"),
    });

    prismaMock.order.findUnique.mockResolvedValue(order as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.inventoryItem.findFirst.mockResolvedValue(inventoryItem as any);
    prismaMock.inventoryItem.update.mockResolvedValue({} as any);
    prismaMock.inventoryLog.create.mockResolvedValue({} as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    await handler({
      event: { data: { orderId: "order_1", restaurantId: "rest_1" } },
    });

    const logCall = prismaMock.inventoryLog.create.mock.calls[0][0] as any;
    expect(logCall.data.changeType).toBe("RECEIVED");
    expect(logCall.data.reference).toBe("order_1");
    expect(logCall.data.quantity).toBe(10);
    expect(logCall.data.previousQuantity).toBe(5);
    expect(logCall.data.newQuantity).toBe(15);
  });

  it("skips items with no matching inventory item", async () => {
    const order = createMockOrder({
      id: "order_1",
      supplier: { name: "Test Supplier" },
      items: [
        createMockOrderItem({
          productId: "prod_no_match",
          product: { id: "prod_no_match", name: "Unknown Item" },
        }),
      ],
    });
    const owner = createMockUser();

    prismaMock.order.findUnique.mockResolvedValue(order as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.inventoryItem.findFirst.mockResolvedValue(null);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler({
      event: { data: { orderId: "order_1", restaurantId: "rest_1" } },
    });

    expect(result.reconciled).toBe(0);
    expect(result.skipped).toBe(1);
    expect(prismaMock.inventoryItem.update).not.toHaveBeenCalled();
  });

  it("creates summary notification with reconciled/skipped counts", async () => {
    const order = createMockOrder({
      id: "order_1",
      orderNumber: "ORD-001",
      supplier: { name: "Farm Fresh" },
      items: [
        createMockOrderItem({
          productId: "prod_1",
          quantity: new Decimal("10"),
          product: { id: "prod_1", name: "Tomatoes" },
        }),
      ],
    });
    const owner = createMockUser();
    const inventoryItem = createMockInventoryItem({
      supplierProductId: "prod_1",
      currentQuantity: new Decimal("5.000"),
    });

    prismaMock.order.findUnique.mockResolvedValue(order as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.inventoryItem.findFirst.mockResolvedValue(inventoryItem as any);
    prismaMock.inventoryItem.update.mockResolvedValue({} as any);
    prismaMock.inventoryLog.create.mockResolvedValue({} as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    await handler({
      event: { data: { orderId: "order_1", restaurantId: "rest_1" } },
    });

    const notifCall = prismaMock.notification.create.mock.calls[0][0] as any;
    expect(notifCall.data.type).toBe("DELIVERY_UPDATE");
    expect(notifCall.data.title).toBe("Inventory Reconciled");
    expect(notifCall.data.metadata.reconciled).toBe(1);
    expect(notifCall.data.metadata.skipped).toBe(0);
    expect(notifCall.data.metadata.actionUrl).toBe("/inventory");
  });

  it("skips when order not found", async () => {
    prismaMock.order.findUnique.mockResolvedValue(null);

    const result = await handler({
      event: { data: { orderId: "nonexistent", restaurantId: "rest_1" } },
    });

    expect(result.action).toBe("skipped");
    expect(result.reason).toBe("order_not_found");
  });

  it("skips when no owner found", async () => {
    const order = createMockOrder({
      supplier: { name: "Test" },
      items: [],
    });

    prismaMock.order.findUnique.mockResolvedValue(order as any);
    prismaMock.user.findFirst.mockResolvedValue(null);

    const result = await handler({
      event: { data: { orderId: "order_1", restaurantId: "rest_1" } },
    });

    expect(result.action).toBe("skipped");
    expect(result.reason).toBe("no_owner");
  });
});

// ============================================
// SMART DELIVERY SCHEDULING TESTS
// ============================================
describe("Smart Delivery Scheduling", () => {
  let handler: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    await import("@/lib/inngest/functions/delivery-scheduling");
    const { getInngestHandler } = await import("./mocks/inngest");
    handler = getInngestHandler("delivery-scheduling")!;
  });

  it("suggests consolidation when 2+ DRAFTs for same supplier", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();
    const supplier = createMockSupplier({ deliveryFee: new Decimal("15.00") });

    const drafts = [
      createMockOrder({
        id: "d1",
        orderNumber: "ORD-D1",
        status: "DRAFT",
        supplierId: supplier.id,
        supplier: { id: supplier.id, name: supplier.name, deliveryFee: supplier.deliveryFee },
        items: [createMockOrderItem()],
        total: new Decimal("50.00"),
      }),
      createMockOrder({
        id: "d2",
        orderNumber: "ORD-D2",
        status: "DRAFT",
        supplierId: supplier.id,
        supplier: { id: supplier.id, name: supplier.name, deliveryFee: supplier.deliveryFee },
        items: [createMockOrderItem()],
        total: new Decimal("75.00"),
      }),
    ];

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.order.findMany
      .mockResolvedValueOnce(drafts as any) // DRAFT orders
      .mockResolvedValueOnce([] as any); // active orders
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(result.suggestions).toBe(1);
    const notifCall = prismaMock.notification.create.mock.calls[0][0] as any;
    expect(notifCall.data.title).toBe("Delivery Consolidation Suggestion");
    expect(notifCall.data.metadata.orderIds).toEqual(["d1", "d2"]);
  });

  it("calculates correct delivery fee savings", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();
    const supplier = createMockSupplier({ deliveryFee: new Decimal("20.00") });

    const drafts = [
      createMockOrder({
        id: "d1", supplierId: supplier.id, status: "DRAFT",
        supplier: { id: supplier.id, name: supplier.name, deliveryFee: supplier.deliveryFee },
        items: [createMockOrderItem()], total: new Decimal("50.00"),
      }),
      createMockOrder({
        id: "d2", supplierId: supplier.id, status: "DRAFT",
        supplier: { id: supplier.id, name: supplier.name, deliveryFee: supplier.deliveryFee },
        items: [createMockOrderItem()], total: new Decimal("60.00"),
      }),
      createMockOrder({
        id: "d3", supplierId: supplier.id, status: "DRAFT",
        supplier: { id: supplier.id, name: supplier.name, deliveryFee: supplier.deliveryFee },
        items: [createMockOrderItem()], total: new Decimal("70.00"),
      }),
    ];

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.order.findMany
      .mockResolvedValueOnce(drafts as any)
      .mockResolvedValueOnce([] as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    await handler();

    const notifCall = prismaMock.notification.create.mock.calls[0][0] as any;
    // 3 orders, save 2 delivery fees: 20 * 2 = 40
    expect(notifCall.data.metadata.potentialSavings).toBe(40);
  });

  it("detects add-to-upcoming-delivery opportunity", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();
    const supplier = createMockSupplier();

    const drafts = [
      createMockOrder({
        id: "d1", supplierId: supplier.id, status: "DRAFT",
        supplier: { id: supplier.id, name: supplier.name, deliveryFee: supplier.deliveryFee },
        items: [createMockOrderItem()],
      }),
    ];

    const activeOrders = [
      createMockOrder({
        id: "active_1", supplierId: supplier.id, status: "CONFIRMED",
        supplier: { id: supplier.id, name: supplier.name },
      }),
    ];

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.order.findMany
      .mockResolvedValueOnce(drafts as any)
      .mockResolvedValueOnce(activeOrders as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(result.suggestions).toBe(1);
    const notifCall = prismaMock.notification.create.mock.calls[0][0] as any;
    expect(notifCall.data.title).toBe("Add Items to Upcoming Delivery");
  });

  it("skips supplier with only 1 draft order", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();
    const supplier = createMockSupplier();

    const drafts = [
      createMockOrder({
        id: "d1", supplierId: supplier.id, status: "DRAFT",
        supplier: { id: supplier.id, name: supplier.name, deliveryFee: supplier.deliveryFee },
        items: [createMockOrderItem()],
      }),
    ];

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.order.findMany
      .mockResolvedValueOnce(drafts as any)
      .mockResolvedValueOnce([] as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(result.suggestions).toBe(0);
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
  });

  it("skips restaurants with no owner", async () => {
    const restaurant = createMockRestaurant();

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(null);

    const result = await handler();

    expect(result.suggestions).toBe(0);
  });
});

// ============================================
// SUPPLIER PERFORMANCE SCORING TESTS
// ============================================
describe("Supplier Performance Scoring", () => {
  let handler: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    await import("@/lib/inngest/functions/supplier-performance");
    const { getInngestHandler } = await import("./mocks/inngest");
    handler = getInngestHandler("supplier-performance")!;
  });

  it("calculates on-time delivery % with 1-day grace", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();
    const supplier = createMockSupplier();

    const deliveryDate = new Date("2024-01-10");
    const onTimeDate = new Date("2024-01-11"); // 1 day grace - still on-time
    const lateDate = new Date("2024-01-13"); // 2 days late

    const orders = Array.from({ length: 5 }, (_, i) =>
      createMockOrder({
        id: `ord_${i}`,
        status: "DELIVERED",
        deliveryDate,
        deliveredAt: i < 4 ? onTimeDate : lateDate, // 4 on-time, 1 late
        invoice: null,
      })
    );

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.restaurantSupplier.findMany.mockResolvedValue([
      { supplier, restaurantId: restaurant.id, supplierId: supplier.id },
    ] as any);
    prismaMock.order.findMany.mockResolvedValue(orders as any);
    prismaMock.orderItem.findMany.mockResolvedValue([]);
    // on-time < 80% triggers alert (4/5 = 80%, borderline, no alert)
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(result.restaurantsProcessed).toBe(1);
  });

  it("calculates invoice accuracy %", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();
    const supplier = createMockSupplier();

    // 5 orders: 4 accurate, 1 inaccurate
    const orders = Array.from({ length: 5 }, (_, i) =>
      createMockOrder({
        id: `ord_${i}`,
        status: "DELIVERED",
        deliveredAt: new Date(),
        total: new Decimal("100.00"),
        invoice: i < 4
          ? { total: new Decimal("100.50") } // within 1%
          : { total: new Decimal("115.00") }, // 15% off
      })
    );

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.restaurantSupplier.findMany.mockResolvedValue([
      { supplier, restaurantId: restaurant.id, supplierId: supplier.id },
    ] as any);
    prismaMock.order.findMany.mockResolvedValue(orders as any);
    prismaMock.orderItem.findMany.mockResolvedValue([]);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    // accuracy at 80% < 90% should trigger alert
    expect(prismaMock.notification.create).toHaveBeenCalled();
    const notifCall = prismaMock.notification.create.mock.calls[0][0] as any;
    expect(notifCall.data.title).toBe("Supplier Performance Alert");
    expect(notifCall.data.metadata.accuracyPercent).toBe(80);
  });

  it("sends alert when on-time < 80%", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();
    const supplier = createMockSupplier();

    const deliveryDate = new Date("2024-01-10");
    const onTimeDate = new Date("2024-01-11");
    const lateDate = new Date("2024-01-15");

    // 3 on-time, 2 late = 60%
    const orders = Array.from({ length: 5 }, (_, i) =>
      createMockOrder({
        id: `ord_${i}`,
        status: "DELIVERED",
        deliveryDate,
        deliveredAt: i < 3 ? onTimeDate : lateDate,
        invoice: null,
      })
    );

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.restaurantSupplier.findMany.mockResolvedValue([
      { supplier, restaurantId: restaurant.id, supplierId: supplier.id },
    ] as any);
    prismaMock.order.findMany.mockResolvedValue(orders as any);
    prismaMock.orderItem.findMany.mockResolvedValue([]);
    prismaMock.notification.create.mockResolvedValue({} as any);

    await handler();

    expect(prismaMock.notification.create).toHaveBeenCalled();
    const notifCall = prismaMock.notification.create.mock.calls[0][0] as any;
    expect(notifCall.data.title).toBe("Supplier Performance Alert");
    expect(notifCall.data.metadata.onTimePercent).toBe(60);
  });

  it("skips suppliers with < 5 delivered orders", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();
    const supplier = createMockSupplier();

    const orders = Array.from({ length: 3 }, (_, i) =>
      createMockOrder({ id: `ord_${i}`, status: "DELIVERED" })
    );

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.restaurantSupplier.findMany.mockResolvedValue([
      { supplier, restaurantId: restaurant.id, supplierId: supplier.id },
    ] as any);
    prismaMock.order.findMany.mockResolvedValue(orders as any);

    const result = await handler();

    expect(prismaMock.notification.create).not.toHaveBeenCalled();
    expect(result.alertsSent).toBe(0);
  });

  it("skips restaurants with no owner", async () => {
    const restaurant = createMockRestaurant();

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(null);

    const result = await handler();

    expect(result.alertsSent).toBe(0);
  });
});

// ============================================
// PREDICTIVE BUDGET ALERTS TESTS
// ============================================
describe("Predictive Budget Alerts", () => {
  let handler: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    await import("@/lib/inngest/functions/budget-alerts");
    const { getInngestHandler } = await import("./mocks/inngest");
    handler = getInngestHandler("budget-alerts")!;
  });

  it("sends warning when projected > 110%", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();

    // Mock current MTD orders - high spending
    const mtdOrders = Array.from({ length: 5 }, (_, i) =>
      createMockOrder({
        id: `ord_${i}`,
        status: "DELIVERED",
        total: new Decimal("500.00"),
        items: [createMockOrderItem({ product: { category: "PRODUCE" } })],
      })
    );

    // Mock historical months - lower average
    const historicalOrders = [
      createMockOrder({ total: new Decimal("200.00") }),
    ];

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.order.findMany
      .mockResolvedValueOnce(mtdOrders as any) // MTD orders
      .mockResolvedValueOnce(historicalOrders as any) // month -1
      .mockResolvedValueOnce(historicalOrders as any) // month -2
      .mockResolvedValueOnce(historicalOrders as any); // month -3
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(prismaMock.notification.create).toHaveBeenCalled();
    const notifCall = prismaMock.notification.create.mock.calls[0][0] as any;
    // MTD = 2500, projected will be much higher than historical avg of 200
    expect(notifCall.data.title).toMatch(/Budget Alert/);
    expect(notifCall.data.metadata.alertLevel).toBeDefined();
  });

  it("sends critical alert when projected > 130%", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();

    const mtdOrders = Array.from({ length: 10 }, (_, i) =>
      createMockOrder({
        id: `ord_${i}`,
        status: "DELIVERED",
        total: new Decimal("1000.00"),
        items: [createMockOrderItem({ product: { category: "MEAT" } })],
      })
    );

    const historicalOrders = [
      createMockOrder({ total: new Decimal("300.00") }),
    ];

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.order.findMany
      .mockResolvedValueOnce(mtdOrders as any)
      .mockResolvedValueOnce(historicalOrders as any)
      .mockResolvedValueOnce(historicalOrders as any)
      .mockResolvedValueOnce(historicalOrders as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    await handler();

    const notifCall = prismaMock.notification.create.mock.calls[0][0] as any;
    expect(notifCall.data.title).toBe("Budget Alert: Significantly Over Pace");
    expect(notifCall.data.metadata.alertLevel).toBe("critical");
  });

  it("does not alert when within 110%", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();

    // Moderate MTD spending
    const mtdOrders = [
      createMockOrder({
        id: "ord_1",
        status: "DELIVERED",
        total: new Decimal("100.00"),
        items: [createMockOrderItem({ product: { category: "PRODUCE" } })],
      }),
    ];

    // Historical with similar or higher averages
    const historicalOrders = Array.from({ length: 5 }, (_, i) =>
      createMockOrder({ id: `hist_${i}`, total: new Decimal("500.00") })
    );

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.order.findMany
      .mockResolvedValueOnce(mtdOrders as any)
      .mockResolvedValueOnce(historicalOrders as any)
      .mockResolvedValueOnce(historicalOrders as any)
      .mockResolvedValueOnce(historicalOrders as any);

    const result = await handler();

    expect(prismaMock.notification.create).not.toHaveBeenCalled();
    expect(result.alertsSent).toBe(0);
  });

  it("skips when no historical data", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();

    const mtdOrders = [
      createMockOrder({
        id: "ord_1",
        total: new Decimal("100.00"),
        items: [createMockOrderItem({ product: { category: "PRODUCE" } })],
      }),
    ];

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.order.findMany
      .mockResolvedValueOnce(mtdOrders as any)
      .mockResolvedValueOnce([] as any) // no month -1
      .mockResolvedValueOnce([] as any) // no month -2
      .mockResolvedValueOnce([] as any); // no month -3

    const result = await handler();

    expect(prismaMock.notification.create).not.toHaveBeenCalled();
    expect(result.alertsSent).toBe(0);
  });

  it("includes category breakdown in metadata", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();

    const mtdOrders = Array.from({ length: 5 }, (_, i) =>
      createMockOrder({
        id: `ord_${i}`,
        status: "DELIVERED",
        total: new Decimal("500.00"),
        items: [
          createMockOrderItem({
            subtotal: new Decimal("200.00"),
            product: { category: "PRODUCE" },
          }),
          createMockOrderItem({
            subtotal: new Decimal("300.00"),
            product: { category: "MEAT" },
          }),
        ],
      })
    );

    const historicalOrders = [
      createMockOrder({ total: new Decimal("100.00") }),
    ];

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.order.findMany
      .mockResolvedValueOnce(mtdOrders as any)
      .mockResolvedValueOnce(historicalOrders as any)
      .mockResolvedValueOnce(historicalOrders as any)
      .mockResolvedValueOnce(historicalOrders as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    await handler();

    const notifCall = prismaMock.notification.create.mock.calls[0][0] as any;
    expect(notifCall.data.metadata.categoryBreakdown).toBeDefined();
    expect(notifCall.data.metadata.categoryBreakdown.PRODUCE).toBeDefined();
    expect(notifCall.data.metadata.categoryBreakdown.MEAT).toBeDefined();
  });
});

// ============================================
// CONSOLIDATE_ORDERS CHAT TOOL TESTS
// ============================================
describe("consolidate_orders Chat Tool", () => {
  let executeTool: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/lib/ai/tool-executor");
    executeTool = mod.executeTool;
  });

  it("merges draft orders and calculates savings", async () => {
    const supplier = createMockSupplier({ deliveryFee: new Decimal("15.00") });
    const product1 = createMockProduct({ id: "p1", name: "Tomatoes", price: new Decimal("5.00") });
    const product2 = createMockProduct({ id: "p2", name: "Lettuce", price: new Decimal("3.00") });

    const orders = [
      createMockOrder({
        id: "o1", orderNumber: "ORD-001", status: "DRAFT", supplierId: supplier.id,
        supplier: { id: supplier.id, name: supplier.name, deliveryFee: supplier.deliveryFee },
        items: [createMockOrderItem({
          productId: "p1", quantity: new Decimal("5"),
          product: { id: "p1", name: "Tomatoes", price: new Decimal("5.00"), unit: "POUND" },
        })],
      }),
      createMockOrder({
        id: "o2", orderNumber: "ORD-002", status: "DRAFT", supplierId: supplier.id,
        supplier: { id: supplier.id, name: supplier.name, deliveryFee: supplier.deliveryFee },
        items: [createMockOrderItem({
          productId: "p2", quantity: new Decimal("3"),
          product: { id: "p2", name: "Lettuce", price: new Decimal("3.00"), unit: "POUND" },
        })],
      }),
    ];

    prismaMock.order.findMany.mockResolvedValue(orders as any);
    prismaMock.order.create.mockResolvedValue({
      id: "consolidated_1",
      orderNumber: "ORD-CONSOLIDATED",
      status: "DRAFT",
      subtotal: new Decimal("34.00"),
      tax: new Decimal("2.81"),
      deliveryFee: new Decimal("15.00"),
      total: new Decimal("51.81"),
      supplier: { name: supplier.name },
      items: [
        { product: { name: "Tomatoes", unit: "POUND" }, quantity: new Decimal("5"), unitPrice: new Decimal("5.00"), subtotal: new Decimal("25.00") },
        { product: { name: "Lettuce", unit: "POUND" }, quantity: new Decimal("3"), unitPrice: new Decimal("3.00"), subtotal: new Decimal("9.00") },
      ],
    } as any);
    prismaMock.order.deleteMany.mockResolvedValue({ count: 2 } as any);

    const result = await executeTool(
      "consolidate_orders",
      { order_ids: ["o1", "o2"] },
      { userId: "user_1", restaurantId: "rest_1" }
    );

    expect(result.success).toBe(true);
    expect(result.deliveryFeeSavings).toBe(15); // saved 1 delivery fee
    expect(result.mergedOrderNumbers).toEqual(["ORD-001", "ORD-002"]);
    expect(prismaMock.order.deleteMany).toHaveBeenCalled();
  });

  it("rejects orders from different suppliers", async () => {
    const orders = [
      createMockOrder({
        id: "o1", status: "DRAFT", supplierId: "sup_1",
        supplier: { id: "sup_1", name: "Supplier A", deliveryFee: new Decimal("10.00") },
        items: [],
      }),
      createMockOrder({
        id: "o2", status: "DRAFT", supplierId: "sup_2",
        supplier: { id: "sup_2", name: "Supplier B", deliveryFee: new Decimal("10.00") },
        items: [],
      }),
    ];

    prismaMock.order.findMany.mockResolvedValue(orders as any);

    const result = await executeTool(
      "consolidate_orders",
      { order_ids: ["o1", "o2"] },
      { userId: "user_1", restaurantId: "rest_1" }
    );

    expect(result.error).toContain("same supplier");
  });

  it("rejects fewer than 2 order IDs", async () => {
    const result = await executeTool(
      "consolidate_orders",
      { order_ids: ["o1"] },
      { userId: "user_1", restaurantId: "rest_1" }
    );

    expect(result.error).toContain("At least 2");
  });
});
