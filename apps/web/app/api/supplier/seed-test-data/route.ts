import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST - Seed test data for the current user's supplier
export async function POST() {
  if (process.env.ENABLE_SEED_DATA === "false") {
    return NextResponse.json({ error: "Seed data is disabled" }, { status: 403 });
  }

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { supplier: true },
    });

    if (!user?.supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    if (!["SUPPLIER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const supplierId = user.supplier.id;

    const results = {
      orders: 0,
      invoices: 0,
      products: 0,
      deliveryZones: 0,
      insights: 0,
      promotions: 0,
      notifications: 0,
      priceHistoryRecords: 0,
      customers: 0,
      errors: [] as string[],
    };

    // Get existing products for this supplier
    const existingProducts = await prisma.supplierProduct.findMany({
      where: { supplierId },
    });

    // If no products exist, create sample products
    if (existingProducts.length === 0) {
      const sampleProducts = [
        { name: "Product A", category: "PRODUCE" as const, price: 4.99, unit: "POUND" as const, description: "Sample produce item", stockQuantity: 50, reorderPoint: 20 },
        { name: "Product B", category: "MEAT" as const, price: 12.99, unit: "POUND" as const, description: "Sample meat item", stockQuantity: 30, reorderPoint: 15 },
        { name: "Product C", category: "DAIRY" as const, price: 6.99, unit: "GALLON" as const, description: "Sample dairy item", stockQuantity: 25, reorderPoint: 10 },
        { name: "Product D", category: "DRY_GOODS" as const, price: 8.99, unit: "BAG" as const, description: "Sample dry goods item", stockQuantity: 40, reorderPoint: 20 },
        { name: "Product E", category: "SEAFOOD" as const, price: 18.99, unit: "POUND" as const, description: "Sample seafood item", stockQuantity: 15, reorderPoint: 8 },
        { name: "Product F", category: "BAKERY" as const, price: 3.49, unit: "EACH" as const, description: "Sample bakery item", stockQuantity: 60, reorderPoint: 25 },
        { name: "Product G", category: "BEVERAGES" as const, price: 14.99, unit: "CASE" as const, description: "Sample beverage item", stockQuantity: 20, reorderPoint: 10 },
        { name: "Product H", category: "PRODUCE" as const, price: 2.99, unit: "BUNCH" as const, description: "Sample herb item", stockQuantity: 0, reorderPoint: 12, inStock: false },
      ];

      for (const product of sampleProducts) {
        try {
          await prisma.supplierProduct.create({
            data: {
              ...product,
              supplierId,
              inStock: product.inStock ?? true,
            },
          });
          results.products++;
        } catch (err: any) {
          results.errors.push(`Product ${product.name}: ${err.message}`);
        }
      }
    }

    // Refetch products after potential creation
    const products = await prisma.supplierProduct.findMany({
      where: { supplierId },
    });

    // Get or create restaurant customers
    const restaurants = await prisma.restaurant.findMany({ take: 3 });

    if (restaurants.length === 0) {
      results.errors.push("No restaurants found in database. Run: npx prisma db seed");
    }

    // Create RestaurantSupplier relationships
    for (const restaurant of restaurants) {
      try {
        await prisma.restaurantSupplier.upsert({
          where: {
            restaurantId_supplierId: {
              restaurantId: restaurant.id,
              supplierId,
            },
          },
          update: {},
          create: {
            restaurantId: restaurant.id,
            supplierId,
            isPreferred: results.customers === 0,
          },
        });
        results.customers++;
      } catch (err: any) {
        results.errors.push(`Customer link: ${err.message}`);
      }
    }

    // Create delivery zones
    const zones = [
      { name: "Zone 1 - Downtown", zipCodes: ["94102", "94103", "94104", "94105"], deliveryFee: 15, minimumOrder: 100 },
      { name: "Zone 2 - Midtown", zipCodes: ["94108", "94109", "94110", "94112"], deliveryFee: 20, minimumOrder: 150 },
      { name: "Zone 3 - Outer", zipCodes: ["94114", "94116", "94117", "94118", "94121", "94122"], deliveryFee: 30, minimumOrder: 200 },
    ];

    for (const zone of zones) {
      try {
        const existing = await prisma.deliveryZone.findFirst({
          where: { name: zone.name, supplierId },
        });
        if (!existing) {
          await prisma.deliveryZone.create({
            data: { ...zone, supplierId },
          });
          results.deliveryZones++;
        }
      } catch (err: any) {
        results.errors.push(`Delivery zone ${zone.name}: ${err.message}`);
      }
    }

    // Create sample orders from restaurants
    const orderStatuses = ["DELIVERED", "DELIVERED", "CONFIRMED", "PENDING", "IN_TRANSIT", "PROCESSING", "DRAFT"];
    const now = new Date();
    const daysAgo = (d: number) => new Date(now.getTime() - d * 24 * 60 * 60 * 1000);

    for (let i = 0; i < Math.min(7, restaurants.length > 0 ? 7 : 0); i++) {
      const restaurant = restaurants[i % restaurants.length];
      const status = orderStatuses[i];
      const orderProducts = products.slice(0, Math.min(3, products.length));

      if (orderProducts.length === 0) continue;

      // Find a user who belongs to this restaurant
      const restaurantUser = await prisma.user.findFirst({
        where: { restaurantId: restaurant.id },
      });

      if (!restaurantUser) continue;

      const orderNumber = `ORD-S${Date.now()}-${i}`;
      const items = orderProducts.map((p) => ({
        productId: p.id,
        quantity: Math.floor(Math.random() * 10) + 2,
        unitPrice: Number(p.price),
      }));

      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const tax = Math.round(subtotal * 0.0875 * 100) / 100;
      const deliveryFee = Number(user.supplier.deliveryFee) || 25;
      const total = Math.round((subtotal + tax + deliveryFee) * 100) / 100;

      try {
        const order = await prisma.order.create({
          data: {
            orderNumber,
            status: status as any,
            restaurantId: restaurant.id,
            supplierId,
            createdById: restaurantUser.id,
            subtotal,
            tax,
            deliveryFee,
            total,
            discount: 0,
            deliveryDate: status === "DELIVERED" ? daysAgo(i) : daysAgo(-(i + 1)),
            deliveredAt: status === "DELIVERED" ? daysAgo(i - 1) : null,
            createdAt: daysAgo(i + 2),
            items: {
              create: items.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subtotal: Math.round(item.quantity * item.unitPrice * 100) / 100,
              })),
            },
          },
        });
        results.orders++;

        // Create invoices for delivered orders
        if (status === "DELIVERED") {
          try {
            await prisma.invoice.create({
              data: {
                invoiceNumber: `INV-S${Date.now()}-${i}`,
                restaurantId: restaurant.id,
                supplierId,
                orderId: order.id,
                subtotal,
                tax,
                total,
                status: i === 0 ? ("PAID" as any) : ("PENDING" as any),
                dueDate: daysAgo(-14),
                paidAt: i === 0 ? daysAgo(1) : null,
                paidAmount: i === 0 ? total : null,
                paymentMethod: i === 0 ? ("BANK_TRANSFER" as any) : null,
                paymentReference: i === 0 ? `TXN-${Date.now()}` : null,
              },
            });
            results.invoices++;
          } catch (err: any) {
            results.errors.push(`Invoice for ${orderNumber}: ${err.message}`);
          }
        }
      } catch (err: any) {
        results.errors.push(`Order ${orderNumber}: ${err.message}`);
      }
    }

    // Create overdue invoice
    if (restaurants.length > 0) {
      try {
        await prisma.invoice.create({
          data: {
            invoiceNumber: `INV-OVERDUE-S${Date.now()}`,
            restaurantId: restaurants[0].id,
            supplierId,
            subtotal: 350,
            tax: 30.63,
            total: 380.63,
            status: "OVERDUE" as any,
            dueDate: daysAgo(10),
            issueDate: daysAgo(40),
          },
        });
        results.invoices++;
      } catch (err: any) {
        results.errors.push(`Overdue invoice: ${err.message}`);
      }
    }

    // Create supplier insights
    const insightDefs = [
      {
        type: "DEMAND_FORECAST",
        title: "Demand surge expected this week",
        summary: "Based on historical ordering patterns, demand for your top products is expected to increase 20-30% this week. Consider increasing stock levels.",
        data: { expectedIncrease: "20-30%", timeframe: "this week", confidence: 0.82 },
      },
      {
        type: "PRICING_SUGGESTION",
        title: "Pricing optimization opportunity",
        summary: "Some of your products are priced below market average. A 5-8% increase could improve margins without impacting order volume.",
        data: { suggestedIncrease: "5-8%", estimatedMarginImprovement: "12%" },
      },
      {
        type: "CUSTOMER_HEALTH",
        title: "Customer ordering frequency change",
        summary: "One of your regular customers has reduced order frequency from weekly to bi-weekly. Consider reaching out to check on their satisfaction.",
        data: { riskLevel: "MEDIUM", previousCadence: "7 days", currentCadence: "14 days" },
      },
      {
        type: "ANOMALY",
        title: "Unusual order spike detected",
        summary: "Orders for a specific product category jumped 80% compared to the 4-week average. This may be driven by seasonal demand.",
        data: { increase: "80%", period: "this week vs 4-week avg" },
      },
      {
        type: "ESCALATION",
        title: "Pending order needs attention",
        summary: "An order has been in PENDING status for over 24 hours. Confirm or process it promptly to maintain customer satisfaction.",
        data: { hoursPending: 28, deliveryDateApproaching: true },
      },
    ];

    for (const insight of insightDefs) {
      try {
        await prisma.supplierInsight.create({
          data: {
            supplierId,
            type: insight.type,
            title: insight.title,
            summary: insight.summary,
            data: insight.data as any,
            status: "ACTIVE",
            createdAt: daysAgo(Math.floor(Math.random() * 5)),
            expiresAt: daysAgo(-14),
          },
        });
        results.insights++;
      } catch (err: any) {
        results.errors.push(`Insight ${insight.title}: ${err.message}`);
      }
    }

    // Create promotions
    const promotionDefs = [
      {
        type: "PERCENTAGE_OFF" as const,
        value: 10,
        description: "10% off select items this month! Seasonal savings.",
        startDate: daysAgo(7),
        endDate: daysAgo(-23),
        isActive: true,
      },
      {
        type: "FREE_DELIVERY" as const,
        value: 0,
        minOrderAmount: 250,
        description: "Free delivery on orders over $250. Limited time!",
        startDate: daysAgo(3),
        endDate: daysAgo(-27),
        isActive: true,
      },
      {
        type: "FLAT_DISCOUNT" as const,
        value: 15,
        minOrderAmount: 200,
        description: "$15 off orders over $200. New customer special!",
        startDate: daysAgo(30),
        endDate: daysAgo(5),
        isActive: false,
      },
    ];

    for (const promo of promotionDefs) {
      try {
        await prisma.promotion.create({
          data: {
            ...promo,
            supplierId,
          },
        });
        results.promotions++;
      } catch (err: any) {
        results.errors.push(`Promotion: ${err.message}`);
      }
    }

    // Create price history for products
    for (const product of products.slice(0, 5)) {
      const basePrice = Number(product.price);
      for (let day = 30; day >= 0; day -= 5) {
        const fluctuation = 1 + (Math.random() - 0.5) * 0.15;
        const price = Math.round(basePrice * fluctuation * 100) / 100;
        try {
          await prisma.priceHistory.create({
            data: {
              productId: product.id,
              price,
              recordedAt: daysAgo(day),
            },
          });
          results.priceHistoryRecords++;
        } catch (err: any) {
          results.errors.push(`Price history: ${err.message}`);
        }
      }
    }

    // Create notifications for the supplier user
    const notifDefs = [
      { type: "ORDER_UPDATE" as const, title: "New Order Received", message: "A restaurant placed a new order. Review and confirm it." },
      { type: "ORDER_UPDATE" as const, title: "Order Delivered", message: "An order was delivered successfully to the customer." },
      { type: "PRICE_ALERT" as const, title: "Demand Forecast", message: "AI predicts increased demand for your top products this week." },
      { type: "SYSTEM" as const, title: "New Customer", message: "A new restaurant has been linked as your customer." },
      { type: "DELIVERY_UPDATE" as const, title: "Return Request Filed", message: "A customer filed a return request. Review the details." },
    ];

    for (const notif of notifDefs) {
      try {
        await prisma.notification.create({
          data: {
            type: notif.type as any,
            title: notif.title,
            message: notif.message,
            userId: user.id,
            isRead: results.notifications > 2,
            createdAt: daysAgo(results.notifications),
          },
        });
        results.notifications++;
      } catch (err: any) {
        results.errors.push(`Notification: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: results.errors.length > 0
        ? `Test data created with ${results.errors.length} errors`
        : "Test data created successfully",
      data: results,
    });
  } catch (error: any) {
    console.error("Supplier seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed test data" },
      { status: 500 }
    );
  }
}

// DELETE - Clear test data for the current user's supplier
export async function DELETE() {
  if (process.env.ENABLE_SEED_DATA === "false") {
    return NextResponse.json({ error: "Seed data is disabled" }, { status: 403 });
  }

  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { supplier: true },
    });

    if (!user?.supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    if (!["SUPPLIER_ADMIN"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const supplierId = user.supplier.id;
    const deleted: Record<string, number> = {};

    // Delete in order to respect foreign keys
    try {
      const result = await prisma.supplierInsight.deleteMany({ where: { supplierId } });
      deleted.insights = result.count;
    } catch (e: any) {
      console.error("Failed to delete insights:", e.message);
    }

    try {
      const result = await prisma.promotion.deleteMany({ where: { supplierId } });
      deleted.promotions = result.count;
    } catch (e: any) {
      console.error("Failed to delete promotions:", e.message);
    }

    try {
      const result = await prisma.priceHistory.deleteMany({
        where: { product: { supplierId } },
      });
      deleted.priceHistory = result.count;
    } catch (e: any) {
      console.error("Failed to delete price history:", e.message);
    }

    try {
      const result = await prisma.invoice.deleteMany({ where: { supplierId } });
      deleted.invoices = result.count;
    } catch (e: any) {
      console.error("Failed to delete invoices:", e.message);
    }

    try {
      const result = await prisma.orderItem.deleteMany({
        where: { order: { supplierId } },
      });
      deleted.orderItems = result.count;
    } catch (e: any) {
      console.error("Failed to delete order items:", e.message);
    }

    try {
      const result = await prisma.returnRequest.deleteMany({
        where: { order: { supplierId } },
      });
      deleted.returnRequests = result.count;
    } catch (e: any) {
      console.error("Failed to delete return requests:", e.message);
    }

    try {
      const result = await prisma.orderMessage.deleteMany({
        where: { order: { supplierId } },
      });
      deleted.orderMessages = result.count;
    } catch (e: any) {
      console.error("Failed to delete order messages:", e.message);
    }

    try {
      const result = await prisma.orderApproval.deleteMany({
        where: { order: { supplierId } },
      });
      deleted.orderApprovals = result.count;
    } catch (e: any) {
      console.error("Failed to delete order approvals:", e.message);
    }

    try {
      const result = await prisma.order.deleteMany({ where: { supplierId } });
      deleted.orders = result.count;
    } catch (e: any) {
      console.error("Failed to delete orders:", e.message);
    }

    try {
      const result = await prisma.deliveryZone.deleteMany({ where: { supplierId } });
      deleted.deliveryZones = result.count;
    } catch (e: any) {
      console.error("Failed to delete delivery zones:", e.message);
    }

    try {
      const result = await prisma.notification.deleteMany({ where: { userId: user.id } });
      deleted.notifications = result.count;
    } catch (e: any) {
      console.error("Failed to delete notifications:", e.message);
    }

    try {
      const result = await prisma.restaurantSupplier.deleteMany({ where: { supplierId } });
      deleted.customerLinks = result.count;
    } catch (e: any) {
      console.error("Failed to delete customer links:", e.message);
    }

    try {
      const result = await prisma.aiUsageLog.deleteMany({ where: { supplierId } });
      deleted.aiUsageLogs = result.count;
    } catch (e: any) {
      console.error("Failed to delete AI usage logs:", e.message);
    }

    return NextResponse.json({
      success: true,
      message: "Test data cleared successfully",
      deleted,
    });
  } catch (error: any) {
    console.error("Supplier clear error:", error);
    return NextResponse.json(
      { error: "Failed to clear test data" },
      { status: 500 }
    );
  }
}
