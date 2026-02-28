import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prismaMock } from "./mocks/prisma";
import { mockInngestSend } from "./mocks/inngest";
import {
  createMockSupplier,
  createMockProduct,
  createMockOrder,
  createMockInvoice,
  createMockReturnRequest,
  createMockSupplierUser,
  createMockRestaurant,
} from "./fixtures";
import { Decimal } from "@prisma/client/runtime/library";

// ============================================
// INNGEST BACKGROUND FUNCTIONS
// ============================================

describe("Supplier Route Optimizer", () => {
  let handler: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    await import("@/lib/inngest/functions/supplier-route-optimizer");
    const { getInngestHandler } = await import("./mocks/inngest");
    handler = getInngestHandler("supplier-route-optimizer")!;
  });

  it("creates route optimization insight for suppliers with multiple deliveries", async () => {
    const supplier = createMockSupplier();
    prismaMock.supplier.findMany.mockResolvedValue([supplier] as any);

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const orders = [
      {
        ...createMockOrder({ id: "o1", status: "CONFIRMED", deliveryDate: tomorrow }),
        restaurant: { id: "r1", name: "Restaurant A", address: "100 Main St", city: "Austin", zipCode: "78701" },
        items: [{ quantity: new Decimal("5") }],
      },
      {
        ...createMockOrder({ id: "o2", status: "PROCESSING", deliveryDate: tomorrow }),
        restaurant: { id: "r2", name: "Restaurant B", address: "200 Oak Ave", city: "Austin", zipCode: "78702" },
        items: [{ quantity: new Decimal("3") }],
      },
    ];

    prismaMock.order.findMany.mockResolvedValue(orders as any);
    prismaMock.supplierInsight.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.supplierInsight.create.mockResolvedValue({} as any);
    prismaMock.user.findMany.mockResolvedValue([createMockSupplierUser()] as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(result.insightsCreated).toBe(1);
    expect(prismaMock.supplierInsight.create).toHaveBeenCalledOnce();
    const insightCall = prismaMock.supplierInsight.create.mock.calls[0][0] as any;
    expect(insightCall.data.type).toBe("ROUTE_OPTIMIZATION");
    expect(prismaMock.notification.create).toHaveBeenCalled();
  });

  it("skips suppliers with fewer than 2 deliveries", async () => {
    const supplier = createMockSupplier();
    prismaMock.supplier.findMany.mockResolvedValue([supplier] as any);
    prismaMock.order.findMany.mockResolvedValue([createMockOrder()] as any);

    const result = await handler();

    expect(result.insightsCreated).toBe(0);
    expect(prismaMock.supplierInsight.create).not.toHaveBeenCalled();
  });
});

describe("Supplier Expiration Prevention", () => {
  let handler: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    await import("@/lib/inngest/functions/supplier-expiration-prevention");
    const { getInngestHandler } = await import("./mocks/inngest");
    handler = getInngestHandler("supplier-expiration-prevention")!;
  });

  it("flags products at risk of expiring before being sold", async () => {
    const supplier = createMockSupplier();
    prismaMock.supplier.findMany.mockResolvedValue([supplier] as any);

    const expiringProduct = createMockProduct({
      expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days
      stockQuantity: 100,
      inStock: true,
    });
    prismaMock.supplierProduct.findMany.mockResolvedValue([expiringProduct] as any);

    // Low velocity: 2 units sold in 30 days = 0.067/day, 100 units would take 1500 days
    prismaMock.orderItem.findMany.mockResolvedValue([
      { quantity: new Decimal("2") },
    ] as any);

    prismaMock.supplierInsight.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.supplierInsight.create.mockResolvedValue({} as any);
    prismaMock.user.findMany.mockResolvedValue([createMockSupplierUser()] as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(result.insightsCreated).toBe(1);
    const insightCall = prismaMock.supplierInsight.create.mock.calls[0][0] as any;
    expect(insightCall.data.type).toBe("EXPIRATION_RISK");
  });

  it("skips suppliers with no expiring products", async () => {
    const supplier = createMockSupplier();
    prismaMock.supplier.findMany.mockResolvedValue([supplier] as any);
    prismaMock.supplierProduct.findMany.mockResolvedValue([] as any);

    const result = await handler();

    expect(result.insightsCreated).toBe(0);
  });
});

describe("Supplier Revenue Forecast", () => {
  let handler: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    await import("@/lib/inngest/functions/supplier-revenue-forecast");
    const { getInngestHandler } = await import("./mocks/inngest");
    handler = getInngestHandler("supplier-revenue-forecast")!;
  });

  it("creates revenue forecast with projections", async () => {
    const supplier = createMockSupplier();
    prismaMock.supplier.findMany.mockResolvedValue([supplier] as any);

    // Generate 12 orders spread over 12 weeks
    const orders = Array.from({ length: 12 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i * 7);
      return {
        total: new Decimal("500"),
        createdAt: date,
        restaurantId: "rest_1",
        items: [{ subtotal: new Decimal("500"), product: { category: "PRODUCE" } }],
      };
    });

    prismaMock.order.findMany.mockResolvedValue(orders as any);
    prismaMock.restaurant.findMany.mockResolvedValue([
      createMockRestaurant(),
    ] as any);
    prismaMock.supplierInsight.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.supplierInsight.create.mockResolvedValue({} as any);
    prismaMock.user.findMany.mockResolvedValue([createMockSupplierUser()] as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(result.insightsCreated).toBe(1);
    const insightCall = prismaMock.supplierInsight.create.mock.calls[0][0] as any;
    expect(insightCall.data.type).toBe("REVENUE_FORECAST");
    expect(insightCall.data.data.projections).toBeDefined();
    expect(insightCall.data.data.topCustomers).toBeDefined();
  });

  it("skips suppliers with fewer than 10 orders", async () => {
    const supplier = createMockSupplier();
    prismaMock.supplier.findMany.mockResolvedValue([supplier] as any);
    prismaMock.order.findMany.mockResolvedValue(
      Array.from({ length: 5 }, () => ({
        total: new Decimal("100"),
        createdAt: new Date(),
        restaurantId: "rest_1",
        items: [],
      })) as any
    );

    const result = await handler();

    expect(result.insightsCreated).toBe(0);
  });
});

describe("Supplier Churn Warning", () => {
  let handler: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    await import("@/lib/inngest/functions/supplier-churn-warning");
    const { getInngestHandler } = await import("./mocks/inngest");
    handler = getInngestHandler("supplier-churn-warning")!;
  });

  it("creates churn warning when at-risk customers found", async () => {
    const supplier = createMockSupplier();
    prismaMock.supplier.findMany.mockResolvedValue([supplier] as any);

    // Mock existing CUSTOMER_HEALTH insight with at-risk customer
    prismaMock.supplierInsight.findFirst.mockResolvedValue({
      data: {
        customers: [
          { restaurantId: "rest_1", name: "At Risk Diner", score: 30, riskLevel: "high" },
        ],
      },
    } as any);

    // Mock declining order history
    const oldOrders = Array.from({ length: 5 }, (_, i) => ({
      total: new Decimal("200"),
      createdAt: new Date(Date.now() - (20 + i * 7) * 24 * 60 * 60 * 1000),
    }));
    prismaMock.order.findMany.mockResolvedValue(oldOrders as any);

    prismaMock.supplierInsight.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.supplierInsight.create.mockResolvedValue({} as any);
    prismaMock.user.findMany.mockResolvedValue([createMockSupplierUser()] as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(result.insightsCreated).toBe(1);
    const insightCall = prismaMock.supplierInsight.create.mock.calls[0][0] as any;
    expect(insightCall.data.type).toBe("CHURN_WARNING");
  });

  it("skips when no health insight exists", async () => {
    const supplier = createMockSupplier();
    prismaMock.supplier.findMany.mockResolvedValue([supplier] as any);
    prismaMock.supplierInsight.findFirst.mockResolvedValue(null);

    const result = await handler();

    expect(result.insightsCreated).toBe(0);
  });
});

describe("Supplier Auto-Promotions", () => {
  let handler: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    await import("@/lib/inngest/functions/supplier-auto-promotions");
    const { getInngestHandler } = await import("./mocks/inngest");
    handler = getInngestHandler("supplier-auto-promotions")!;
  });

  it("creates draft promotions for declining-velocity products", async () => {
    const supplier = createMockSupplier();
    prismaMock.supplier.findMany.mockResolvedValue([supplier] as any);

    const product = createMockProduct({ stockQuantity: 200 });
    prismaMock.supplierProduct.findMany.mockResolvedValue([product] as any);

    // Recent 2 weeks: low velocity
    prismaMock.orderItem.findMany
      .mockResolvedValueOnce([{ quantity: new Decimal("5") }] as any)   // recent
      .mockResolvedValueOnce([{ quantity: new Decimal("20") }] as any); // prior (>30% drop)

    prismaMock.promotion.create.mockResolvedValue({} as any);
    prismaMock.supplierInsight.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.supplierInsight.create.mockResolvedValue({} as any);
    prismaMock.user.findMany.mockResolvedValue([createMockSupplierUser()] as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(result.insightsCreated).toBe(1);
    expect(prismaMock.promotion.create).toHaveBeenCalledOnce();
    const promoCall = prismaMock.promotion.create.mock.calls[0][0] as any;
    expect(promoCall.data.isActive).toBe(false); // Draft
    expect(promoCall.data.type).toBe("PERCENTAGE_OFF");
  });
});

describe("Supplier Quality Trends", () => {
  let handler: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    await import("@/lib/inngest/functions/supplier-quality-trends");
    const { getInngestHandler } = await import("./mocks/inngest");
    handler = getInngestHandler("supplier-quality-trends")!;
  });

  it("creates quality trend insight with flagged products", async () => {
    const supplier = createMockSupplier();
    prismaMock.supplier.findMany.mockResolvedValue([supplier] as any);

    const returns = [
      createMockReturnRequest({
        id: "ret_1",
        type: "QUALITY_ISSUE",
        items: [{ productId: "prod_1", productName: "Bad Tomatoes", quantity: 5, unitPrice: 4.99 }],
        creditAmount: new Decimal("24.95"),
        createdAt: new Date(), // recent
      }),
      createMockReturnRequest({
        id: "ret_2",
        type: "DAMAGED",
        items: [{ productId: "prod_1", productName: "Bad Tomatoes", quantity: 3, unitPrice: 4.99 }],
        creditAmount: new Decimal("14.97"),
        createdAt: new Date(),
      }),
    ];
    prismaMock.returnRequest.findMany.mockResolvedValue(returns as any);

    // Low sales = high return rate
    prismaMock.orderItem.findMany.mockResolvedValue([
      { productId: "prod_1", quantity: new Decimal("10"), product: { name: "Bad Tomatoes", category: "PRODUCE" }, order: { createdAt: new Date() } },
    ] as any);

    prismaMock.supplierInsight.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.supplierInsight.create.mockResolvedValue({} as any);
    prismaMock.user.findMany.mockResolvedValue([createMockSupplierUser()] as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(result.insightsCreated).toBe(1);
    const insightCall = prismaMock.supplierInsight.create.mock.calls[0][0] as any;
    expect(insightCall.data.type).toBe("QUALITY_TREND");
  });

  it("skips suppliers with no returns", async () => {
    const supplier = createMockSupplier();
    prismaMock.supplier.findMany.mockResolvedValue([supplier] as any);
    prismaMock.returnRequest.findMany.mockResolvedValue([] as any);

    const result = await handler();

    expect(result.insightsCreated).toBe(0);
  });
});

describe("Supplier Delivery Digest", () => {
  let handler: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    await import("@/lib/inngest/functions/supplier-delivery-digest");
    const { getInngestHandler } = await import("./mocks/inngest");
    handler = getInngestHandler("supplier-delivery-digest")!;
  });

  it("creates delivery performance digest", async () => {
    const supplier = createMockSupplier();
    prismaMock.supplier.findMany.mockResolvedValue([supplier] as any);

    const today = new Date();
    const deliveredOrders = [
      {
        id: "o1",
        deliveryDate: today,
        deliveredAt: today,
        shippedAt: new Date(today.getTime() - 2 * 60 * 60 * 1000),
        driverId: "driver_1",
        restaurant: { name: "Restaurant A" },
      },
    ];
    // First call = delivered orders, second call = pending deliveries
    prismaMock.order.findMany
      .mockResolvedValueOnce(deliveredOrders as any)
      .mockResolvedValueOnce([] as any);

    prismaMock.user.findMany.mockResolvedValue([
      { id: "driver_1", firstName: "John", lastName: "Driver" },
    ] as any);
    prismaMock.supplierInsight.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.supplierInsight.create.mockResolvedValue({} as any);
    // Second user.findMany call for notifications
    prismaMock.user.findMany
      .mockResolvedValueOnce([{ id: "driver_1", firstName: "John", lastName: "Driver" }] as any)
      .mockResolvedValueOnce([createMockSupplierUser()] as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(result.insightsCreated).toBe(1);
    const insightCall = prismaMock.supplierInsight.create.mock.calls[0][0] as any;
    expect(insightCall.data.type).toBe("DELIVERY_PERFORMANCE");
  });
});

describe("Supplier Payment Collection", () => {
  let handler: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    await import("@/lib/inngest/functions/supplier-payment-collection");
    const { getInngestHandler } = await import("./mocks/inngest");
    handler = getInngestHandler("supplier-payment-collection")!;
  });

  it("creates payment collection insight for overdue invoices", async () => {
    const supplier = createMockSupplier();
    prismaMock.supplier.findMany.mockResolvedValue([supplier] as any);

    const overdueInvoice = createMockInvoice({
      status: "OVERDUE",
      dueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    });
    prismaMock.invoice.findMany.mockResolvedValue([
      { ...overdueInvoice, restaurant: { id: "rest_1", name: "Test Restaurant", email: "test@test.com" } },
    ] as any);

    prismaMock.supplierInsight.findFirst.mockResolvedValue(null); // No previous tier tracking
    prismaMock.supplierInsight.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.supplierInsight.create.mockResolvedValue({} as any);
    prismaMock.user.findMany.mockResolvedValue([createMockSupplierUser()] as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(result.insightsCreated).toBe(1);
    const insightCall = prismaMock.supplierInsight.create.mock.calls[0][0] as any;
    expect(insightCall.data.type).toBe("PAYMENT_COLLECTION");
    expect(insightCall.data.data.tierTracking).toBeDefined();
  });

  it("skips suppliers with no overdue invoices", async () => {
    const supplier = createMockSupplier();
    prismaMock.supplier.findMany.mockResolvedValue([supplier] as any);
    prismaMock.invoice.findMany.mockResolvedValue([] as any);

    const result = await handler();

    expect(result.insightsCreated).toBe(0);
  });
});

describe("Supplier Seasonal Prep", () => {
  let handler: Function;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useRealTimers();
    await import("@/lib/inngest/functions/supplier-seasonal-prep");
    const { getInngestHandler } = await import("./mocks/inngest");
    handler = getInngestHandler("supplier-seasonal-prep")!;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("skips if not first week of month", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 15)); // Feb 15 — not first week

    const result = await handler();

    expect(result.skipped).toBe(true);
  });

  it("creates seasonal prep insight during first week", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 1, 3)); // Feb 3 — first week

    const supplier = createMockSupplier();
    prismaMock.supplier.findMany.mockResolvedValue([supplier] as any);

    // Historical demand last year March
    prismaMock.orderItem.findMany
      .mockResolvedValueOnce([
        { productId: "prod_1", quantity: new Decimal("200"), product: { name: "Tomatoes", category: "PRODUCE", stockQuantity: 50, price: new Decimal("4.99") } },
      ] as any)
      // Current velocity
      .mockResolvedValueOnce([
        { productId: "prod_1", quantity: new Decimal("10") },
      ] as any);

    prismaMock.supplierInsight.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.supplierInsight.create.mockResolvedValue({} as any);
    prismaMock.user.findMany.mockResolvedValue([createMockSupplierUser()] as any);
    prismaMock.notification.create.mockResolvedValue({} as any);

    const result = await handler();

    expect(result.insightsCreated).toBe(1);
    const insightCall = prismaMock.supplierInsight.create.mock.calls[0][0] as any;
    expect(insightCall.data.type).toBe("SEASONAL_PREP");
  });
});

// ============================================
// SUPPLIER AI CHAT TOOLS
// ============================================

describe("Supplier Chat Tools", () => {
  let executeSupplierTool: Function;
  const context = {
    userId: "sup_user_1",
    supplierId: "sup_1",
    userRole: "SUPPLIER_ADMIN",
    planTier: "PROFESSIONAL" as const,
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/lib/ai/supplier-tool-executor");
    executeSupplierTool = mod.executeSupplierTool;
  });

  // ── get_return_summary ──
  describe("get_return_summary", () => {
    it("returns aggregated return data with product breakdown", async () => {
      const returns = [
        {
          ...createMockReturnRequest({
            type: "DAMAGED",
            status: "CREDIT_ISSUED",
            creditAmount: new Decimal("24.95"),
            items: [{ productId: "prod_1", productName: "Tomatoes", quantity: 5, unitPrice: 4.99 }],
          }),
          order: { orderNumber: "ORD-001", restaurant: { name: "Test Diner" } },
        },
      ];
      prismaMock.returnRequest.findMany.mockResolvedValue(returns as any);
      prismaMock.orderItem.findMany.mockResolvedValue([
        { productId: "prod_1", quantity: new Decimal("100") },
      ] as any);

      const result = await executeSupplierTool("get_return_summary", { period: "last_30_days" }, context);

      expect(result.totalReturns).toBe(1);
      expect(result.totalCredited).toBe(24.95);
      expect(result.byType.DAMAGED).toBe(1);
      expect(result.productBreakdown.length).toBeGreaterThan(0);
    });
  });

  // ── adjust_supplier_inventory ──
  describe("adjust_supplier_inventory", () => {
    it("updates stock quantity for a product", async () => {
      const product = createMockProduct();
      prismaMock.supplierProduct.findFirst.mockResolvedValue(product as any);
      prismaMock.supplierProduct.update.mockResolvedValue({
        ...product,
        stockQuantity: 50,
        reorderPoint: null,
        expirationDate: null,
        inStock: true,
      } as any);

      const result = await executeSupplierTool(
        "adjust_supplier_inventory",
        { product_id: "prod_1", stock_quantity: 50 },
        context
      );

      expect(result.success).toBe(true);
      expect(prismaMock.supplierProduct.update).toHaveBeenCalledOnce();
    });

    it("returns error for non-existent product", async () => {
      prismaMock.supplierProduct.findFirst.mockResolvedValue(null);

      const result = await executeSupplierTool(
        "adjust_supplier_inventory",
        { product_id: "invalid" },
        context
      );

      expect(result.error).toBe("Product not found");
    });
  });

  // ── create_promotion ──
  describe("create_promotion", () => {
    it("creates a draft promotion", async () => {
      prismaMock.supplierProduct.findMany.mockResolvedValue([createMockProduct()] as any);
      prismaMock.promotion.create.mockResolvedValue({
        id: "promo_1",
        type: "PERCENTAGE_OFF",
        value: new Decimal("15"),
        description: "Summer sale",
        minOrderAmount: null,
        startDate: new Date("2026-03-01"),
        endDate: new Date("2026-03-15"),
        isActive: false,
        products: [{ id: "prod_1", name: "Tomatoes" }],
      } as any);

      const result = await executeSupplierTool(
        "create_promotion",
        {
          type: "PERCENTAGE_OFF",
          value: 15,
          description: "Summer sale",
          product_ids: ["prod_1"],
          start_date: "2026-03-01",
          end_date: "2026-03-15",
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.promotion.isActive).toBe(false);
      expect(result.promotion.value).toBe(15);
    });

    it("rejects if product IDs don't belong to supplier", async () => {
      prismaMock.supplierProduct.findMany.mockResolvedValue([] as any); // No matching products

      const result = await executeSupplierTool(
        "create_promotion",
        {
          type: "PERCENTAGE_OFF",
          value: 10,
          product_ids: ["invalid_prod"],
          start_date: "2026-03-01",
          end_date: "2026-03-15",
        },
        context
      );

      expect(result.error).toContain("not found");
    });
  });

  // ── get_invoice_overview ──
  describe("get_invoice_overview", () => {
    it("returns aggregated invoice statistics", async () => {
      const invoices = [
        {
          ...createMockInvoice({ status: "OVERDUE", total: new Decimal("500.00"), paidAmount: null }),
          restaurant: { id: "rest_1", name: "Debtor Diner" },
        },
        {
          ...createMockInvoice({ id: "inv_2", status: "PAID", total: new Decimal("200.00"), paidAt: new Date(), paidAmount: new Decimal("200.00") }),
          restaurant: { id: "rest_2", name: "Good Payer" },
        },
      ];
      prismaMock.invoice.findMany.mockResolvedValue(invoices as any);

      const result = await executeSupplierTool("get_invoice_overview", {}, context);

      expect(result.summary.totalInvoices).toBe(2);
      expect(result.summary.overdueCount).toBe(1);
      expect(result.summary.overdueAmount).toBe(500);
      expect(result.topDebtors.length).toBeGreaterThan(0);
    });
  });

  // ── get_driver_schedule ──
  describe("get_driver_schedule", () => {
    it("returns driver schedule grouped by driver", async () => {
      const orders = [
        {
          id: "o1",
          orderNumber: "ORD-001",
          status: "CONFIRMED",
          deliveryDate: new Date(),
          driverId: "driver_1",
          restaurant: { name: "Restaurant A", address: "123 Main", city: "Austin" },
          items: [{ id: "i1" }],
        },
        {
          id: "o2",
          orderNumber: "ORD-002",
          status: "PROCESSING",
          deliveryDate: new Date(),
          driverId: null,
          restaurant: { name: "Restaurant B", address: "456 Oak", city: "Austin" },
          items: [{ id: "i2" }, { id: "i3" }],
        },
      ];
      prismaMock.order.findMany.mockResolvedValue(orders as any);
      prismaMock.user.findMany.mockResolvedValue([
        { id: "driver_1", firstName: "John", lastName: "Smith" },
      ] as any);

      const result = await executeSupplierTool("get_driver_schedule", {}, context);

      expect(result.totalDeliveries).toBe(2);
      expect(result.unassignedOrders).toBe(1);
      expect(result.schedule.length).toBe(2);
    });
  });

  // ── manage_return ──
  describe("manage_return", () => {
    it("approves a return with credit", async () => {
      const returnReq = {
        ...createMockReturnRequest({ status: "PENDING" }),
        order: { id: "order_1", orderNumber: "ORD-001", supplierId: "sup_1", restaurantId: "rest_1" },
      };
      prismaMock.returnRequest.findFirst.mockResolvedValue(returnReq as any);
      prismaMock.returnRequest.update.mockResolvedValue({
        id: "ret_1",
        returnNumber: "RET-00001",
        status: "CREDIT_ISSUED",
        creditAmount: new Decimal("24.95"),
        resolution: "Product was damaged",
      } as any);

      const result = await executeSupplierTool(
        "manage_return",
        { return_id: "ret_1", action: "APPROVED", credit_amount: 24.95, resolution: "Product was damaged" },
        context
      );

      expect(result.success).toBe(true);
      expect(result.return.status).toBe("CREDIT_ISSUED");
      expect(result.return.creditAmount).toBe(24.95);
      expect(mockInngestSend).toHaveBeenCalledWith(
        expect.objectContaining({ name: "return/status.changed" })
      );
    });

    it("rejects a return", async () => {
      const returnReq = {
        ...createMockReturnRequest({ status: "PENDING" }),
        order: { id: "order_1", orderNumber: "ORD-001", supplierId: "sup_1", restaurantId: "rest_1" },
      };
      prismaMock.returnRequest.findFirst.mockResolvedValue(returnReq as any);
      prismaMock.returnRequest.update.mockResolvedValue({
        id: "ret_1",
        returnNumber: "RET-00001",
        status: "REJECTED",
        creditAmount: null,
        resolution: "Not eligible for return",
      } as any);

      const result = await executeSupplierTool(
        "manage_return",
        { return_id: "ret_1", action: "REJECTED", resolution: "Not eligible for return" },
        context
      );

      expect(result.success).toBe(true);
      expect(result.return.status).toBe("REJECTED");
    });

    it("returns error for non-existent return", async () => {
      prismaMock.returnRequest.findFirst.mockResolvedValue(null);

      const result = await executeSupplierTool(
        "manage_return",
        { return_id: "invalid", action: "APPROVED" },
        context
      );

      expect(result.error).toBe("Return request not found");
    });

    it("returns error for already-processed return", async () => {
      const returnReq = {
        ...createMockReturnRequest({ status: "APPROVED" }),
        order: { id: "order_1", orderNumber: "ORD-001", supplierId: "sup_1", restaurantId: "rest_1" },
      };
      prismaMock.returnRequest.findFirst.mockResolvedValue(returnReq as any);

      const result = await executeSupplierTool(
        "manage_return",
        { return_id: "ret_1", action: "REJECTED" },
        context
      );

      expect(result.error).toContain("already approved");
    });
  });

  // ── bulk_update_orders ──
  describe("bulk_update_orders", () => {
    it("updates multiple orders to CONFIRMED", async () => {
      const orders = [
        { id: "o1", orderNumber: "ORD-001", status: "PENDING" },
        { id: "o2", orderNumber: "ORD-002", status: "PENDING" },
      ];
      prismaMock.order.findMany.mockResolvedValue(orders as any);
      prismaMock.order.update.mockResolvedValue({} as any);

      const result = await executeSupplierTool(
        "bulk_update_orders",
        { order_ids: ["o1", "o2"], status: "CONFIRMED" },
        context
      );

      expect(result.success).toBe(true);
      expect(result.updated).toBe(2);
      expect(result.failed).toHaveLength(0);
      expect(prismaMock.order.update).toHaveBeenCalledTimes(2);
    });

    it("reports invalid status transitions as failures", async () => {
      const orders = [
        { id: "o1", orderNumber: "ORD-001", status: "DELIVERED" },
      ];
      prismaMock.order.findMany.mockResolvedValue(orders as any);

      const result = await executeSupplierTool(
        "bulk_update_orders",
        { order_ids: ["o1"], status: "CONFIRMED" },
        context
      );

      expect(result.updated).toBe(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].reason).toContain("Cannot transition");
    });

    it("reports missing orders as failures", async () => {
      prismaMock.order.findMany.mockResolvedValue([] as any);

      const result = await executeSupplierTool(
        "bulk_update_orders",
        { order_ids: ["missing_id"], status: "CONFIRMED" },
        context
      );

      expect(result.updated).toBe(0);
      expect(result.failed).toHaveLength(1);
      expect(result.failed[0].reason).toBe("Order not found");
    });
  });

  // ── assign_driver ──
  describe("assign_driver", () => {
    it("assigns a driver to an order", async () => {
      prismaMock.order.findFirst.mockResolvedValue({
        id: "o1", orderNumber: "ORD-001", status: "CONFIRMED",
      } as any);
      prismaMock.user.findFirst.mockResolvedValue({
        id: "driver_1", firstName: "John", lastName: "Smith",
      } as any);
      prismaMock.order.update.mockResolvedValue({
        id: "o1", orderNumber: "ORD-001", status: "CONFIRMED", driverId: "driver_1",
      } as any);

      const result = await executeSupplierTool(
        "assign_driver",
        { order_id: "o1", driver_id: "driver_1" },
        context
      );

      expect(result.success).toBe(true);
      expect(result.driverName).toBe("John Smith");
    });

    it("returns error when driver not found", async () => {
      prismaMock.order.findFirst.mockResolvedValue({
        id: "o1", orderNumber: "ORD-001", status: "CONFIRMED",
      } as any);
      prismaMock.user.findFirst.mockResolvedValue(null);

      const result = await executeSupplierTool(
        "assign_driver",
        { order_id: "o1", driver_id: "invalid" },
        context
      );

      expect(result.error).toContain("Driver not found");
    });

    it("returns error when order not found", async () => {
      prismaMock.order.findFirst.mockResolvedValue(null);

      const result = await executeSupplierTool(
        "assign_driver",
        { order_id: "invalid", driver_id: "driver_1" },
        context
      );

      expect(result.error).toBe("Order not found");
    });
  });

  // ── generate_pick_list ──
  describe("generate_pick_list", () => {
    it("generates a pick list grouped by product", async () => {
      const orders = [
        {
          id: "o1",
          orderNumber: "ORD-001",
          restaurant: { name: "Restaurant A" },
          items: [
            {
              productId: "prod_1",
              quantity: new Decimal("10"),
              product: { id: "prod_1", name: "Tomatoes", category: "PRODUCE", unit: "POUND" },
            },
          ],
        },
        {
          id: "o2",
          orderNumber: "ORD-002",
          restaurant: { name: "Restaurant B" },
          items: [
            {
              productId: "prod_1",
              quantity: new Decimal("5"),
              product: { id: "prod_1", name: "Tomatoes", category: "PRODUCE", unit: "POUND" },
            },
          ],
        },
      ];
      prismaMock.order.findMany.mockResolvedValue(orders as any);

      const result = await executeSupplierTool(
        "generate_pick_list",
        { date: "2026-03-01" },
        context
      );

      expect(result.totalOrders).toBe(2);
      expect(result.pickList).toHaveLength(1);
      expect(result.pickList[0].product).toBe("Tomatoes");
      expect(result.pickList[0].totalQuantity).toBe(15);
      expect(result.pickList[0].orderCount).toBe(2);
    });
  });

  // ── create_product ──
  describe("create_product", () => {
    it("creates a new product", async () => {
      prismaMock.supplierProduct.create.mockResolvedValue({
        id: "new_prod",
        name: "Organic Kale",
        category: "PRODUCE",
        price: new Decimal("3.99"),
        unit: "POUND",
        sku: null,
        brand: null,
        inStock: true,
        stockQuantity: null,
      } as any);

      const result = await executeSupplierTool(
        "create_product",
        { name: "Organic Kale", category: "PRODUCE", price: 3.99, unit: "POUND" },
        context
      );

      expect(result.success).toBe(true);
      expect(result.product.name).toBe("Organic Kale");
      expect(result.product.price).toBe(3.99);
      expect(prismaMock.supplierProduct.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ supplierId: "sup_1" }),
        })
      );
    });
  });

  // ── bulk_update_prices ──
  describe("bulk_update_prices", () => {
    it("updates prices with explicit product-price pairs", async () => {
      const products = [createMockProduct()];
      prismaMock.supplierProduct.findMany.mockResolvedValue(products as any);
      prismaMock.supplierProduct.update.mockResolvedValue({} as any);
      prismaMock.priceHistory.create.mockResolvedValue({} as any);

      const result = await executeSupplierTool(
        "bulk_update_prices",
        { updates: [{ product_id: "prod_1", price: 5.99 }] },
        context
      );

      expect(result.success).toBe(true);
      expect(result.updated).toBe(1);
      expect(result.changes[0].oldPrice).toBe(4.99);
      expect(result.changes[0].newPrice).toBe(5.99);
      expect(prismaMock.priceHistory.create).toHaveBeenCalledOnce();
    });

    it("updates prices by category percentage", async () => {
      const products = [
        createMockProduct({ id: "p1", price: new Decimal("10.00") }),
        createMockProduct({ id: "p2", price: new Decimal("20.00") }),
      ];
      prismaMock.supplierProduct.findMany.mockResolvedValue(products as any);
      prismaMock.supplierProduct.update.mockResolvedValue({} as any);
      prismaMock.priceHistory.create.mockResolvedValue({} as any);

      const result = await executeSupplierTool(
        "bulk_update_prices",
        { category: "PRODUCE", percentage: 10 },
        context
      );

      expect(result.success).toBe(true);
      expect(result.updated).toBe(2);
      expect(result.changes[0].newPrice).toBe(11);
      expect(result.changes[1].newPrice).toBe(22);
    });

    it("returns error when no mode specified", async () => {
      const result = await executeSupplierTool(
        "bulk_update_prices",
        {},
        context
      );

      expect(result.error).toContain("Provide either");
    });
  });

  // ── get_low_stock ──
  describe("get_low_stock", () => {
    it("returns products below reorder point", async () => {
      const products = [
        createMockProduct({ id: "p1", stockQuantity: 5, reorderPoint: 20 }),
        createMockProduct({ id: "p2", stockQuantity: 50, reorderPoint: 10 }),
      ];
      prismaMock.supplierProduct.findMany.mockResolvedValue(products as any);

      const result = await executeSupplierTool("get_low_stock", {}, context);

      expect(result.totalLowStock).toBe(1);
      expect(result.products[0].currentStock).toBe(5);
      expect(result.products[0].deficit).toBe(15);
    });

    it("returns empty list when all stock is healthy", async () => {
      const products = [
        createMockProduct({ stockQuantity: 50, reorderPoint: 10 }),
      ];
      prismaMock.supplierProduct.findMany.mockResolvedValue(products as any);

      const result = await executeSupplierTool("get_low_stock", {}, context);

      expect(result.totalLowStock).toBe(0);
      expect(result.message).toContain("above reorder point");
    });
  });

  // ── manage_promotion ──
  describe("manage_promotion", () => {
    it("activates a promotion", async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30);
      prismaMock.promotion.findFirst.mockResolvedValue({
        id: "promo_1",
        type: "PERCENTAGE_OFF",
        value: new Decimal("10"),
        isActive: false,
        startDate: new Date(),
        endDate: futureDate,
        products: [],
      } as any);
      prismaMock.promotion.update.mockResolvedValue({
        id: "promo_1",
        type: "PERCENTAGE_OFF",
        value: new Decimal("10"),
        isActive: true,
        startDate: new Date(),
        endDate: futureDate,
      } as any);

      const result = await executeSupplierTool(
        "manage_promotion",
        { promotion_id: "promo_1", action: "activate" },
        context
      );

      expect(result.success).toBe(true);
      expect(result.promotion.isActive).toBe(true);
    });

    it("rejects activation of expired promotion", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 10);
      prismaMock.promotion.findFirst.mockResolvedValue({
        id: "promo_1",
        type: "PERCENTAGE_OFF",
        value: new Decimal("10"),
        isActive: false,
        startDate: new Date(pastDate.getTime() - 30 * 24 * 60 * 60 * 1000),
        endDate: pastDate,
        products: [],
      } as any);

      const result = await executeSupplierTool(
        "manage_promotion",
        { promotion_id: "promo_1", action: "activate" },
        context
      );

      expect(result.error).toContain("expired");
    });

    it("deletes a promotion", async () => {
      prismaMock.promotion.findFirst.mockResolvedValue({
        id: "promo_1",
        products: [],
      } as any);
      prismaMock.promotion.delete.mockResolvedValue({} as any);

      const result = await executeSupplierTool(
        "manage_promotion",
        { promotion_id: "promo_1", action: "delete" },
        context
      );

      expect(result.success).toBe(true);
      expect(prismaMock.promotion.delete).toHaveBeenCalledOnce();
    });

    it("returns error for non-existent promotion", async () => {
      prismaMock.promotion.findFirst.mockResolvedValue(null);

      const result = await executeSupplierTool(
        "manage_promotion",
        { promotion_id: "invalid", action: "activate" },
        context
      );

      expect(result.error).toBe("Promotion not found");
    });
  });

  // ── get_promotions ──
  describe("get_promotions", () => {
    it("returns all promotions", async () => {
      const promotions = [
        {
          id: "promo_1",
          type: "PERCENTAGE_OFF",
          value: new Decimal("15"),
          description: "Summer sale",
          minOrderAmount: null,
          startDate: new Date(),
          endDate: new Date(),
          isActive: true,
          products: [{ id: "prod_1", name: "Tomatoes" }],
        },
      ];
      prismaMock.promotion.findMany.mockResolvedValue(promotions as any);

      const result = await executeSupplierTool(
        "get_promotions",
        { status: "active" },
        context
      );

      expect(result.promotions).toHaveLength(1);
      expect(result.promotions[0].value).toBe(15);
      expect(result.promotions[0].products).toHaveLength(1);
    });
  });

  // ── generate_invoice ──
  describe("generate_invoice", () => {
    it("generates an invoice for a delivered order", async () => {
      prismaMock.order.findFirst.mockResolvedValue({
        id: "o1",
        orderNumber: "ORD-001",
        status: "DELIVERED",
        subtotal: new Decimal("100.00"),
        tax: new Decimal("8.25"),
        total: new Decimal("108.25"),
        restaurantId: "rest_1",
        restaurant: { id: "rest_1", name: "Test Diner" },
        invoice: null,
      } as any);
      prismaMock.invoice.count.mockResolvedValue(5);
      prismaMock.invoice.create.mockResolvedValue({
        id: "inv_new",
        invoiceNumber: "INV-P_01-00006",
        subtotal: new Decimal("100.00"),
        tax: new Decimal("8.25"),
        total: new Decimal("108.25"),
        issueDate: new Date(),
        dueDate: new Date(),
        status: "PENDING",
      } as any);

      const result = await executeSupplierTool(
        "generate_invoice",
        { order_id: "o1" },
        context
      );

      expect(result.success).toBe(true);
      expect(result.invoice.total).toBe(108.25);
      expect(prismaMock.invoice.create).toHaveBeenCalledOnce();
    });

    it("rejects non-delivered orders", async () => {
      prismaMock.order.findFirst.mockResolvedValue({
        id: "o1",
        status: "PROCESSING",
        invoice: null,
        restaurant: { id: "rest_1", name: "Test" },
      } as any);

      const result = await executeSupplierTool(
        "generate_invoice",
        { order_id: "o1" },
        context
      );

      expect(result.error).toContain("PROCESSING");
    });

    it("rejects if invoice already exists", async () => {
      prismaMock.order.findFirst.mockResolvedValue({
        id: "o1",
        status: "DELIVERED",
        invoice: { id: "existing" },
        restaurant: { id: "rest_1", name: "Test" },
      } as any);

      const result = await executeSupplierTool(
        "generate_invoice",
        { order_id: "o1" },
        context
      );

      expect(result.error).toContain("already exists");
    });
  });

  // ── record_payment ──
  describe("record_payment", () => {
    it("records a full payment", async () => {
      prismaMock.invoice.findFirst.mockResolvedValue({
        ...createMockInvoice({ status: "PENDING", paidAmount: null }),
        restaurant: { name: "Test Diner" },
      } as any);
      prismaMock.invoice.update.mockResolvedValue({
        id: "inv_1",
        invoiceNumber: "INV-001",
        total: new Decimal("108.25"),
        paidAmount: new Decimal("108.25"),
        status: "PAID",
        paidAt: new Date(),
      } as any);

      const result = await executeSupplierTool(
        "record_payment",
        { invoice_id: "inv_1", amount: 108.25, payment_method: "BANK_TRANSFER" },
        context
      );

      expect(result.success).toBe(true);
      expect(result.invoice.status).toBe("PAID");
      expect(result.invoice.remaining).toBe(0);
    });

    it("records a partial payment", async () => {
      prismaMock.invoice.findFirst.mockResolvedValue({
        ...createMockInvoice({ status: "PENDING", paidAmount: null }),
        restaurant: { name: "Test Diner" },
      } as any);
      prismaMock.invoice.update.mockResolvedValue({
        id: "inv_1",
        invoiceNumber: "INV-001",
        total: new Decimal("108.25"),
        paidAmount: new Decimal("50.00"),
        status: "PARTIALLY_PAID",
        paidAt: null,
      } as any);

      const result = await executeSupplierTool(
        "record_payment",
        { invoice_id: "inv_1", amount: 50 },
        context
      );

      expect(result.success).toBe(true);
      expect(result.invoice.status).toBe("PARTIALLY_PAID");
      expect(result.invoice.remaining).toBe(58.25);
    });

    it("rejects payment on already paid invoice", async () => {
      prismaMock.invoice.findFirst.mockResolvedValue({
        ...createMockInvoice({ status: "PAID" }),
        restaurant: { name: "Test Diner" },
      } as any);

      const result = await executeSupplierTool(
        "record_payment",
        { invoice_id: "inv_1", amount: 50 },
        context
      );

      expect(result.error).toContain("already fully paid");
    });
  });

  // ── handle_dispute ──
  describe("handle_dispute", () => {
    it("flags an invoice as disputed", async () => {
      prismaMock.invoice.findFirst.mockResolvedValue(
        createMockInvoice({ status: "PENDING" }) as any
      );
      prismaMock.invoice.update.mockResolvedValue({
        id: "inv_1",
        invoiceNumber: "INV-001",
        status: "DISPUTED",
        notes: "[DISPUTE] Amount doesn't match PO",
      } as any);

      const result = await executeSupplierTool(
        "handle_dispute",
        { invoice_id: "inv_1", action: "dispute", notes: "Amount doesn't match PO" },
        context
      );

      expect(result.success).toBe(true);
      expect(result.invoice.status).toBe("DISPUTED");
    });

    it("resolves a disputed invoice", async () => {
      prismaMock.invoice.findFirst.mockResolvedValue(
        createMockInvoice({ status: "DISPUTED", paidAmount: null }) as any
      );
      prismaMock.invoice.update.mockResolvedValue({
        id: "inv_1",
        invoiceNumber: "INV-001",
        status: "PENDING",
        notes: "[RESOLVED] Issue corrected",
      } as any);

      const result = await executeSupplierTool(
        "handle_dispute",
        { invoice_id: "inv_1", action: "resolve", notes: "Issue corrected" },
        context
      );

      expect(result.success).toBe(true);
      expect(result.invoice.status).toBe("PENDING");
    });

    it("rejects dispute on already disputed invoice", async () => {
      prismaMock.invoice.findFirst.mockResolvedValue(
        createMockInvoice({ status: "DISPUTED" }) as any
      );

      const result = await executeSupplierTool(
        "handle_dispute",
        { invoice_id: "inv_1", action: "dispute" },
        context
      );

      expect(result.error).toContain("already disputed");
    });
  });

  // ── broadcast_message ──
  describe("broadcast_message", () => {
    it("sends messages to specified customers", async () => {
      prismaMock.order.findFirst.mockResolvedValue({
        id: "o1", orderNumber: "ORD-001",
      } as any);
      prismaMock.orderMessage.create.mockResolvedValue({} as any);

      const result = await executeSupplierTool(
        "broadcast_message",
        { message: "Holiday schedule update", customer_ids: ["rest_1"] },
        context
      );

      expect(result.success).toBe(true);
      expect(result.sent).toBe(1);
      expect(prismaMock.orderMessage.create).toHaveBeenCalledOnce();
    });

    it("sends to all active customers when no IDs provided", async () => {
      prismaMock.restaurantSupplier.findMany.mockResolvedValue([
        { restaurantId: "rest_1" },
        { restaurantId: "rest_2" },
      ] as any);
      prismaMock.order.findFirst
        .mockResolvedValueOnce({ id: "o1", orderNumber: "ORD-001" } as any)
        .mockResolvedValueOnce({ id: "o2", orderNumber: "ORD-002" } as any);
      prismaMock.orderMessage.create.mockResolvedValue({} as any);

      const result = await executeSupplierTool(
        "broadcast_message",
        { message: "We are closed Monday" },
        context
      );

      expect(result.success).toBe(true);
      expect(result.sent).toBe(2);
    });

    it("handles customers with no recent orders", async () => {
      prismaMock.restaurantSupplier.findMany.mockResolvedValue([
        { restaurantId: "rest_1" },
      ] as any);
      prismaMock.order.findFirst.mockResolvedValue(null);

      const result = await executeSupplierTool(
        "broadcast_message",
        { message: "Test message" },
        context
      );

      expect(result.sent).toBe(0);
      expect(result.failed).toBe(1);
    });
  });

  // ── update_delivery_eta ──
  describe("update_delivery_eta", () => {
    it("updates delivery ETA and notifies customers", async () => {
      prismaMock.order.findFirst.mockResolvedValue({
        id: "o1",
        orderNumber: "ORD-001",
        restaurantId: "rest_1",
        restaurant: { id: "rest_1", name: "Test Diner" },
      } as any);
      prismaMock.order.update.mockResolvedValue({} as any);
      prismaMock.user.findMany.mockResolvedValue([
        { id: "user_1" },
        { id: "user_2" },
      ] as any);
      prismaMock.notification.create.mockResolvedValue({} as any);

      const result = await executeSupplierTool(
        "update_delivery_eta",
        {
          order_id: "o1",
          estimated_delivery_at: "2026-03-01T15:00:00Z",
          message: "Running 30 minutes late",
        },
        context
      );

      expect(result.success).toBe(true);
      expect(result.notifiedUsers).toBe(2);
      expect(prismaMock.orderMessage.create).toHaveBeenCalledOnce();
      expect(prismaMock.notification.create).toHaveBeenCalledTimes(2);
    });

    it("returns error for non-existent order", async () => {
      prismaMock.order.findFirst.mockResolvedValue(null);

      const result = await executeSupplierTool(
        "update_delivery_eta",
        { order_id: "invalid", estimated_delivery_at: "2026-03-01T15:00:00Z" },
        context
      );

      expect(result.error).toBe("Order not found");
    });

    it("updates ETA without message when not provided", async () => {
      prismaMock.order.findFirst.mockResolvedValue({
        id: "o1",
        orderNumber: "ORD-001",
        restaurantId: "rest_1",
        restaurant: { id: "rest_1", name: "Test Diner" },
      } as any);
      prismaMock.order.update.mockResolvedValue({} as any);
      prismaMock.user.findMany.mockResolvedValue([{ id: "user_1" }] as any);
      prismaMock.notification.create.mockResolvedValue({} as any);

      const result = await executeSupplierTool(
        "update_delivery_eta",
        { order_id: "o1", estimated_delivery_at: "2026-03-01T15:00:00Z" },
        context
      );

      expect(result.success).toBe(true);
      expect(prismaMock.orderMessage.create).not.toHaveBeenCalled();
    });
  });
});
