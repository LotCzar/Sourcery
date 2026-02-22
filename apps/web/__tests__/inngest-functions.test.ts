import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "./mocks/prisma";
import { mockSendEmail, mockEmailTemplates } from "./mocks/email";
import {
  createMockUser,
  createMockRestaurant,
  createMockSupplier,
  createMockInventoryItem,
  createMockConsumptionInsight,
  createMockInvoice,
  createMockProduct,
  createMockOrder,
} from "./fixtures";
import { Decimal } from "@prisma/client/runtime/library";

// ============================================
// PROACTIVE ORDERING TESTS
// ============================================
describe("Proactive Ordering Autopilot", () => {
  let handler: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Import the module to register the handler
    await import("@/lib/inngest/functions/proactive-ordering");
    const { getInngestHandler } = await import("./mocks/inngest");
    handler = getInngestHandler("proactive-ordering")!;
  });

  it("creates draft orders for items approaching stockout within lead time", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();
    const supplier = createMockSupplier({ leadTimeDays: 3 });
    const product = createMockProduct({ supplierId: supplier.id });
    const item = createMockInventoryItem({
      currentQuantity: new Decimal("5.000"),
      parLevel: new Decimal("20.000"),
      supplierProductId: product.id,
      supplierProduct: { ...product, supplier },
      consumptionInsights: [
        createMockConsumptionInsight({
          daysUntilStockout: new Decimal("3.0"),
          avgWeeklyUsage: new Decimal("10.000"),
          suggestedParLevel: new Decimal("25.000"),
        }),
      ],
    });

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.inventoryItem.findMany.mockResolvedValue([item] as any);
    prismaMock.order.count.mockResolvedValue(5);
    prismaMock.order.create.mockResolvedValue({ id: "new_order", orderNumber: "ORD-00006" } as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(prismaMock.order.create).toHaveBeenCalledOnce();
    expect(prismaMock.notification.create).toHaveBeenCalledOnce();
    expect(result.ordersCreated).toBe(1);

    const notifCall = prismaMock.notification.create.mock.calls[0][0] as any;
    expect(notifCall.data.title).toBe("Proactive Order Created");
    expect(notifCall.data.metadata.orderId).toBe("new_order");
  });

  it("creates orders for critically low items without insights", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();
    const supplier = createMockSupplier();
    const product = createMockProduct({ supplierId: supplier.id });
    const item = createMockInventoryItem({
      currentQuantity: new Decimal("3.000"),
      parLevel: new Decimal("20.000"),
      supplierProductId: product.id,
      supplierProduct: { ...product, supplier },
      consumptionInsights: [], // No insights
    });

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.inventoryItem.findMany.mockResolvedValue([item] as any);
    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.order.create.mockResolvedValue({ id: "order_1", orderNumber: "ORD-00001" } as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(prismaMock.order.create).toHaveBeenCalledOnce();
    expect(result.ordersCreated).toBe(1);
  });

  it("groups items by supplier into separate orders", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();
    const supplier1 = createMockSupplier({ id: "sup_1", name: "Supplier A" });
    const supplier2 = createMockSupplier({ id: "sup_2", name: "Supplier B" });
    const product1 = createMockProduct({ id: "prod_1", supplierId: "sup_1" });
    const product2 = createMockProduct({ id: "prod_2", supplierId: "sup_2" });

    const items = [
      createMockInventoryItem({
        id: "item_1",
        currentQuantity: new Decimal("2.000"),
        parLevel: new Decimal("20.000"),
        supplierProductId: product1.id,
        supplierProduct: { ...product1, supplier: supplier1 },
        consumptionInsights: [],
      }),
      createMockInventoryItem({
        id: "item_2",
        currentQuantity: new Decimal("3.000"),
        parLevel: new Decimal("20.000"),
        supplierProductId: product2.id,
        supplierProduct: { ...product2, supplier: supplier2 },
        consumptionInsights: [],
      }),
    ];

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.inventoryItem.findMany.mockResolvedValue(items as any);
    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.order.create.mockResolvedValue({ id: "order_x" } as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(prismaMock.order.create).toHaveBeenCalledTimes(2);
    expect(result.ordersCreated).toBe(2);
  });

  it("flags below-minimum orders in notification metadata", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();
    const supplier = createMockSupplier({ minimumOrder: new Decimal("500.00") });
    const product = createMockProduct({ supplierId: supplier.id, price: new Decimal("2.00") });
    const item = createMockInventoryItem({
      currentQuantity: new Decimal("2.000"),
      parLevel: new Decimal("10.000"),
      supplierProductId: product.id,
      supplierProduct: { ...product, supplier },
      consumptionInsights: [],
    });

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.inventoryItem.findMany.mockResolvedValue([item] as any);
    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.order.create.mockResolvedValue({ id: "order_1" } as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    await handler();

    const notifCall = prismaMock.notification.create.mock.calls[0][0] as any;
    expect(notifCall.data.metadata.belowMinimumOrder).toBe(true);
  });

  it("includes per-item reasoning in notification", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();
    const supplier = createMockSupplier({ leadTimeDays: 2 });
    const product = createMockProduct({ supplierId: supplier.id });
    const item = createMockInventoryItem({
      name: "Tomatoes",
      currentQuantity: new Decimal("3.000"),
      parLevel: new Decimal("20.000"),
      supplierProductId: product.id,
      supplierProduct: { ...product, supplier },
      consumptionInsights: [],
    });

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.inventoryItem.findMany.mockResolvedValue([item] as any);
    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.order.create.mockResolvedValue({ id: "order_1" } as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    await handler();

    const notifCall = prismaMock.notification.create.mock.calls[0][0] as any;
    expect(notifCall.data.metadata.reasons).toBeDefined();
    expect(notifCall.data.metadata.reasons[0]).toContain("Tomatoes");
  });

  it("skips restaurants with no owner", async () => {
    const restaurant = createMockRestaurant();

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(null);

    const result = await handler();

    expect(prismaMock.order.create).not.toHaveBeenCalled();
    expect(result.ordersCreated).toBe(0);
  });

  it("skips items without supplier product links", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser();
    const item = createMockInventoryItem({
      currentQuantity: new Decimal("2.000"),
      parLevel: new Decimal("20.000"),
      supplierProductId: null,
      supplierProduct: null,
      consumptionInsights: [],
    });

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.inventoryItem.findMany.mockResolvedValue([item] as any);

    const result = await handler();

    expect(prismaMock.order.create).not.toHaveBeenCalled();
    expect(result.ordersCreated).toBe(0);
  });
});

// ============================================
// INVOICE REMINDERS TESTS
// ============================================
describe("Invoice Payment Reminders", () => {
  let handler: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    await import("@/lib/inngest/functions/invoice-reminders");
    const { getInngestHandler } = await import("./mocks/inngest");
    handler = getInngestHandler("invoice-reminders")!;
  });

  function makeDueDate(daysFromNow: number): Date {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + daysFromNow);
    return d;
  }

  it("sends notification for T-7 (upcoming)", async () => {
    const owner = createMockUser();
    const invoice = createMockInvoice({
      dueDate: makeDueDate(7),
      status: "PENDING",
      supplier: { name: "Test Supplier" },
      restaurant: { id: "rest_1" },
    });

    prismaMock.invoice.findMany.mockResolvedValue([invoice] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.notification.findFirst.mockResolvedValue(null);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(prismaMock.notification.create).toHaveBeenCalledOnce();
    const notifCall = prismaMock.notification.create.mock.calls[0][0] as any;
    expect(notifCall.data.title).toContain("Payment Due Soon");
    expect(notifCall.data.type).toBe("ORDER_UPDATE");
    expect(result.notificationsSent).toBe(1);
    expect(result.emailsSent).toBe(0);
  });

  it("sends notification + email for T-0 (due today)", async () => {
    const owner = createMockUser({ email: "owner@test.com" });
    const invoice = createMockInvoice({
      dueDate: makeDueDate(0),
      status: "PENDING",
      supplier: { name: "Test Supplier" },
      restaurant: { id: "rest_1" },
    });

    prismaMock.invoice.findMany.mockResolvedValue([invoice] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.notification.findFirst.mockResolvedValue(null);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(prismaMock.notification.create).toHaveBeenCalledOnce();
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockEmailTemplates.invoiceReminder).toHaveBeenCalled();
    expect(result.emailsSent).toBe(1);
  });

  it("auto-updates status to OVERDUE at T+1", async () => {
    const owner = createMockUser({ email: "owner@test.com" });
    const invoice = createMockInvoice({
      dueDate: makeDueDate(-1),
      status: "PENDING",
      supplier: { name: "Test Supplier" },
      restaurant: { id: "rest_1" },
    });

    prismaMock.invoice.findMany.mockResolvedValue([invoice] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.notification.findFirst.mockResolvedValue(null);
    prismaMock.notification.create.mockResolvedValue({} as any);
    prismaMock.invoice.update.mockResolvedValue({} as any);

    const result = await handler();

    expect(prismaMock.invoice.update).toHaveBeenCalledWith({
      where: { id: invoice.id },
      data: { status: "OVERDUE" },
    });
    expect(result.statusUpdates).toBe(1);
  });

  it("sends escalation at T+7", async () => {
    const owner = createMockUser({ email: "owner@test.com" });
    const invoice = createMockInvoice({
      dueDate: makeDueDate(-7),
      status: "OVERDUE",
      supplier: { name: "Test Supplier" },
      restaurant: { id: "rest_1" },
    });

    prismaMock.invoice.findMany.mockResolvedValue([invoice] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.notification.findFirst.mockResolvedValue(null);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(prismaMock.notification.create).toHaveBeenCalledOnce();
    const notifCall = prismaMock.notification.create.mock.calls[0][0] as any;
    expect(notifCall.data.title).toContain("Overdue 7 Days");
    expect(notifCall.data.type).toBe("SYSTEM");
    expect(mockEmailTemplates.invoiceOverdue).toHaveBeenCalled();
    expect(result.emailsSent).toBe(1);
  });

  it("skips already-sent notifications (idempotency)", async () => {
    const owner = createMockUser();
    const invoice = createMockInvoice({
      dueDate: makeDueDate(7),
      status: "PENDING",
      supplier: { name: "Test Supplier" },
      restaurant: { id: "rest_1" },
    });

    prismaMock.invoice.findMany.mockResolvedValue([invoice] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.notification.findFirst.mockResolvedValue({ id: "existing" } as any);

    const result = await handler();

    expect(prismaMock.notification.create).not.toHaveBeenCalled();
    expect(result.notificationsSent).toBe(0);
  });

  it("skips invoices with no matching milestone", async () => {
    const invoice = createMockInvoice({
      dueDate: makeDueDate(5), // Not a milestone day
      status: "PENDING",
      supplier: { name: "Test Supplier" },
      restaurant: { id: "rest_1" },
    });

    prismaMock.invoice.findMany.mockResolvedValue([invoice] as any);

    const result = await handler();

    expect(prismaMock.notification.create).not.toHaveBeenCalled();
    expect(result.notificationsSent).toBe(0);
  });

  it("handles missing owner gracefully", async () => {
    const invoice = createMockInvoice({
      dueDate: makeDueDate(7),
      status: "PENDING",
      supplier: { name: "Test Supplier" },
      restaurant: { id: "rest_1" },
    });

    prismaMock.invoice.findMany.mockResolvedValue([invoice] as any);
    prismaMock.user.findFirst.mockResolvedValue(null);

    const result = await handler();

    expect(prismaMock.notification.create).not.toHaveBeenCalled();
    expect(result.notificationsSent).toBe(0);
  });
});

// ============================================
// PAR LEVEL OPTIMIZER TESTS
// ============================================
describe("Par Level Optimizer (Chat Tool)", () => {
  let executeTool: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    const module = await import("@/lib/ai/tool-executor");
    executeTool = module.executeTool;
  });

  const context = { userId: "user_1", restaurantId: "rest_1" };

  it("returns suggestions for items >20% difference", async () => {
    const insight = createMockConsumptionInsight({
      dataPointCount: 35,
      avgDailyUsage: new Decimal("5.000"),
      trendDirection: "STABLE",
      suggestedParLevel: new Decimal("30.000"),
      inventoryItem: {
        ...createMockInventoryItem({
          parLevel: new Decimal("10.000"), // Way off from optimal
        }),
        supplierProduct: {
          ...createMockProduct(),
          supplier: { leadTimeDays: 3 },
        },
      },
    });

    prismaMock.consumptionInsight.findMany.mockResolvedValue([insight] as any);

    const result = await executeTool("optimize_par_levels", {}, context);

    expect(result.totalSuggestions).toBeGreaterThan(0);
    expect(result.suggestions[0].direction).toBeDefined();
  });

  it("calculates correct buffer per trend (UP=3, STABLE=2, DOWN=1)", async () => {
    const makeInsight = (trend: string, avgDaily: number) =>
      createMockConsumptionInsight({
        dataPointCount: 35,
        avgDailyUsage: new Decimal(avgDaily.toFixed(3)),
        trendDirection: trend,
        suggestedParLevel: new Decimal("30.000"),
        inventoryItem: {
          ...createMockInventoryItem({ parLevel: new Decimal("5.000") }),
          supplierProduct: {
            ...createMockProduct(),
            supplier: { leadTimeDays: 2 },
          },
        },
      });

    // UP trend: leadTime(2) + buffer(3) = 5, optimal = ceil(10 * 5) = 50
    prismaMock.consumptionInsight.findMany.mockResolvedValue([
      makeInsight("UP", 10),
    ] as any);
    const upResult = await executeTool("optimize_par_levels", {}, context);
    expect(upResult.suggestions[0].optimalPar).toBe(50);

    // DOWN trend: leadTime(2) + buffer(1) = 3, optimal = ceil(10 * 3) = 30
    prismaMock.consumptionInsight.findMany.mockResolvedValue([
      makeInsight("DOWN", 10),
    ] as any);
    const downResult = await executeTool("optimize_par_levels", {}, context);
    expect(downResult.suggestions[0].optimalPar).toBe(30);
  });

  it("applies changes when apply is true", async () => {
    const insight = createMockConsumptionInsight({
      dataPointCount: 35,
      avgDailyUsage: new Decimal("10.000"),
      trendDirection: "STABLE",
      suggestedParLevel: new Decimal("50.000"),
      inventoryItemId: "inv_item_1",
      inventoryItem: {
        ...createMockInventoryItem({
          id: "inv_item_1",
          name: "Tomatoes",
          parLevel: new Decimal("5.000"),
        }),
        supplierProduct: {
          ...createMockProduct(),
          supplier: { leadTimeDays: 2 },
        },
      },
    });

    prismaMock.consumptionInsight.findMany.mockResolvedValue([insight] as any);
    prismaMock.inventoryItem.update.mockResolvedValue({} as any);

    const result = await executeTool("optimize_par_levels", { apply: true }, context);

    expect(result.applied).toBe(true);
    expect(prismaMock.inventoryItem.update).toHaveBeenCalledWith({
      where: { id: "inv_item_1" },
      data: { parLevel: expect.any(Number) },
    });
  });

  it("returns 'no adjustments' when all within 20%", async () => {
    const insight = createMockConsumptionInsight({
      dataPointCount: 35,
      avgDailyUsage: new Decimal("4.000"),
      trendDirection: "STABLE",
      suggestedParLevel: new Decimal("20.000"),
      inventoryItem: {
        ...createMockInventoryItem({
          parLevel: new Decimal("20.000"), // Already optimal
        }),
        supplierProduct: {
          ...createMockProduct(),
          supplier: { leadTimeDays: 3 },
        },
      },
    });

    prismaMock.consumptionInsight.findMany.mockResolvedValue([insight] as any);

    const result = await executeTool("optimize_par_levels", {}, context);

    expect(result.totalSuggestions).toBe(0);
    expect(result.message).toContain("No adjustments needed");
  });

  it("filters by category", async () => {
    prismaMock.consumptionInsight.findMany.mockResolvedValue([] as any);

    await executeTool("optimize_par_levels", { category: "PRODUCE" }, context);

    const whereArg = prismaMock.consumptionInsight.findMany.mock.calls[0][0] as any;
    expect(whereArg.where.inventoryItem).toEqual({ category: "PRODUCE" });
  });
});

// ============================================
// CONSUMPTION ANALYSIS PAR NOTIFICATION TEST
// ============================================
describe("Consumption Analysis - Par Level Notification", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  it("creates par notification when mature insights have >20% diff", async () => {
    await import("@/lib/inngest/functions/consumption-analysis");
    const { getInngestHandler } = await import("./mocks/inngest");
    const handler = getInngestHandler("consumption-analysis")!;

    const restaurant = createMockRestaurant();
    const owner = createMockUser();

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.inventoryItem.findMany.mockResolvedValue([] as any); // No items for main analysis

    // Par optimization query
    const matureInsight = createMockConsumptionInsight({
      dataPointCount: 35,
      avgDailyUsage: new Decimal("10.000"),
      trendDirection: "STABLE",
      suggestedParLevel: new Decimal("50.000"),
      inventoryItem: {
        ...createMockInventoryItem({
          name: "Lettuce",
          parLevel: new Decimal("5.000"),
        }),
        supplierProduct: {
          ...createMockProduct(),
          supplier: { leadTimeDays: 2 },
        },
      },
    });

    prismaMock.consumptionInsight.findMany.mockResolvedValue([matureInsight] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    await handler();

    // Check that par level notification was created
    const notifCalls = prismaMock.notification.create.mock.calls;
    const parNotif = notifCalls.find(
      (call: any) => call[0].data.title === "Par Level Review Suggested"
    );
    expect(parNotif).toBeDefined();
    expect(parNotif![0].data.metadata.adjustments.length).toBeGreaterThan(0);
  });
});

// ============================================
// WEEKLY DIGEST TESTS
// ============================================
describe("Smart Weekly Digest", () => {
  let handler: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    await import("@/lib/inngest/functions/weekly-digest");
    const { getInngestHandler } = await import("./mocks/inngest");
    handler = getInngestHandler("weekly-digest")!;
  });

  it("aggregates correct metrics", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser({ email: "owner@test.com" });

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);

    // This week orders
    prismaMock.order.findMany.mockResolvedValueOnce([
      createMockOrder({ total: new Decimal("100.00") }),
      createMockOrder({ total: new Decimal("200.00") }),
    ] as any);

    // Last week orders
    prismaMock.order.findMany.mockResolvedValueOnce([
      createMockOrder({ total: new Decimal("250.00") }),
    ] as any);

    // Low stock items
    prismaMock.inventoryItem.findMany.mockResolvedValue([
      createMockInventoryItem({
        currentQuantity: new Decimal("5.000"),
        parLevel: new Decimal("20.000"),
      }),
    ] as any);

    prismaMock.priceAlert.count.mockResolvedValue(2);
    prismaMock.inventoryLog.count
      .mockResolvedValueOnce(5) // waste
      .mockResolvedValueOnce(45); // used
    prismaMock.invoice.count.mockResolvedValue(1);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(result.digestsSent).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledOnce();
    const templateCall = mockEmailTemplates.weeklyDigest.mock.calls[0];
    expect(templateCall[0]).toBe(restaurant.name);
    expect(templateCall[2]).toMatchObject({
      totalSpend: 300,
      orderCount: 2,
      lowStockCount: 1,
      priceAlerts: 2,
      overdueInvoices: 1,
    });
  });

  it("falls back when Anthropic unavailable", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser({ email: "owner@test.com" });

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.order.findMany.mockResolvedValue([] as any);
    prismaMock.inventoryItem.findMany.mockResolvedValue([] as any);
    prismaMock.priceAlert.count.mockResolvedValue(0);
    prismaMock.inventoryLog.count.mockResolvedValue(0);
    prismaMock.invoice.count.mockResolvedValue(0);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(result.digestsSent).toBe(1);
    // Should use fallback since anthropic returns null by default
    expect(mockEmailTemplates.weeklyDigest).toHaveBeenCalled();
    const summaryArg = mockEmailTemplates.weeklyDigest.mock.calls[0][1];
    expect(summaryArg).toContain(restaurant.name);
  });

  it("sends email using weeklyDigest template", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser({ email: "owner@test.com" });

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.order.findMany.mockResolvedValue([] as any);
    prismaMock.inventoryItem.findMany.mockResolvedValue([] as any);
    prismaMock.priceAlert.count.mockResolvedValue(0);
    prismaMock.inventoryLog.count.mockResolvedValue(0);
    prismaMock.invoice.count.mockResolvedValue(0);
    prismaMock.notification.create.mockResolvedValue({} as any);

    await handler();

    expect(mockSendEmail).toHaveBeenCalledWith({
      to: "owner@test.com",
      subject: expect.stringContaining("Weekly Digest"),
      html: expect.any(String),
    });
  });

  it("creates notification after sending", async () => {
    const restaurant = createMockRestaurant();
    const owner = createMockUser({ email: "owner@test.com" });

    prismaMock.restaurant.findMany.mockResolvedValue([restaurant] as any);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);
    prismaMock.order.findMany.mockResolvedValue([] as any);
    prismaMock.inventoryItem.findMany.mockResolvedValue([] as any);
    prismaMock.priceAlert.count.mockResolvedValue(0);
    prismaMock.inventoryLog.count.mockResolvedValue(0);
    prismaMock.invoice.count.mockResolvedValue(0);
    prismaMock.notification.create.mockResolvedValue({} as any);

    await handler();

    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: "SYSTEM",
          title: "Weekly Digest Sent",
          metadata: expect.objectContaining({
            actionUrl: "/dashboard",
          }),
        }),
      })
    );
  });
});
