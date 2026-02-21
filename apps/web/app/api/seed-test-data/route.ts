import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST - Seed test data for the current user's restaurant
export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { restaurant: true },
    });

    if (!user?.restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const restaurantId = user.restaurant.id;

    // Get some suppliers and products
    const suppliers = await prisma.supplier.findMany({
      take: 5,
      include: {
        products: {
          take: 5,
        },
      },
    });

    if (suppliers.length === 0) {
      return NextResponse.json(
        {
          error: "No suppliers found in database",
          details: "The database needs supplier data first. Run: npx prisma db seed"
        },
        { status: 400 }
      );
    }

    // Check if any suppliers have products
    const suppliersWithProducts = suppliers.filter(s => s.products.length > 0);
    if (suppliersWithProducts.length === 0) {
      return NextResponse.json(
        {
          error: "No supplier products found",
          details: "Suppliers exist but have no products. Run: npx prisma db seed"
        },
        { status: 400 }
      );
    }

    const results = {
      orders: 0,
      invoices: 0,
      inventoryItems: 0,
      priceAlerts: 0,
      errors: [] as string[],
    };

    // Create sample orders with different statuses
    const orderStatuses = ["DELIVERED", "SHIPPED", "CONFIRMED", "PENDING", "DRAFT"];

    for (let i = 0; i < 5; i++) {
      const supplier = suppliers[i % suppliers.length];
      const products = supplier.products.slice(0, 3);

      if (products.length === 0) continue;

      const orderNumber = `ORD-${Date.now()}-${i}`;
      const status = orderStatuses[i];

      // Calculate totals
      const items = products.map((product, idx) => ({
        productId: product.id,
        quantity: Math.floor(Math.random() * 10) + 1,
        unitPrice: Number(product.price),
      }));

      const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      const tax = subtotal * 0.0875;
      const deliveryFee = Number(supplier.deliveryFee) || 25;
      const total = subtotal + tax + deliveryFee;

      const order = await prisma.order.create({
        data: {
          orderNumber,
          status: status as any,
          restaurantId,
          supplierId: supplier.id,
          createdById: user.id,
          subtotal,
          tax,
          deliveryFee,
          total,
          deliveryDate: new Date(Date.now() + (i + 1) * 24 * 60 * 60 * 1000),
          deliveredAt: status === "DELIVERED" ? new Date() : null,
          items: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subtotal: item.quantity * item.unitPrice,
            })),
          },
        },
      });

      results.orders++;

      // Create invoice for delivered orders
      if (status === "DELIVERED") {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 30);

        await prisma.invoice.create({
          data: {
            invoiceNumber: `INV-${Date.now()}-${i}`,
            restaurantId,
            supplierId: supplier.id,
            orderId: order.id,
            subtotal,
            tax,
            total,
            status: i === 0 ? "PAID" : "PENDING",
            dueDate,
            paidAt: i === 0 ? new Date() : null,
            paidAmount: i === 0 ? total : null,
            paymentMethod: i === 0 ? "BANK_TRANSFER" : null,
          },
        });

        results.invoices++;
      }
    }

    // Create overdue invoice
    try {
      const overdueSupplier = suppliers[0];
      const pastDueDate = new Date();
      pastDueDate.setDate(pastDueDate.getDate() - 15);

      await prisma.invoice.create({
        data: {
          invoiceNumber: `INV-OVERDUE-${Date.now()}`,
          restaurantId,
          supplierId: overdueSupplier.id,
          subtotal: 450,
          tax: 39.38,
          total: 489.38,
          status: "OVERDUE",
          dueDate: pastDueDate,
          issueDate: new Date(pastDueDate.getTime() - 30 * 24 * 60 * 60 * 1000),
        },
      });
      results.invoices++;
    } catch (invoiceError: any) {
      console.error("Overdue invoice error:", invoiceError);
      results.errors.push(`Overdue invoice: ${invoiceError.message}`);
    }

    // Create inventory items
    const inventoryItems = [
      { name: "Tomatoes", category: "PRODUCE", quantity: 25, unit: "POUND", parLevel: 10, costPerUnit: 3.99, location: "Walk-in Cooler" },
      { name: "Chicken Breast", category: "MEAT", quantity: 15, unit: "POUND", parLevel: 20, costPerUnit: 6.99, location: "Walk-in Freezer" },
      { name: "Olive Oil", category: "DRY_GOODS", quantity: 3, unit: "GALLON", parLevel: 2, costPerUnit: 24.99, location: "Dry Storage" },
      { name: "Heavy Cream", category: "DAIRY", quantity: 2, unit: "QUART", parLevel: 4, costPerUnit: 5.99, location: "Walk-in Cooler" },
      { name: "Salmon Fillet", category: "SEAFOOD", quantity: 0, unit: "POUND", parLevel: 10, costPerUnit: 14.99, location: "Walk-in Freezer" },
      { name: "All-Purpose Flour", category: "DRY_GOODS", quantity: 50, unit: "POUND", parLevel: 25, costPerUnit: 0.89, location: "Dry Storage" },
      { name: "Eggs", category: "DAIRY", quantity: 5, unit: "DOZEN", parLevel: 10, costPerUnit: 4.99, location: "Walk-in Cooler" },
      { name: "Garlic", category: "PRODUCE", quantity: 3, unit: "POUND", parLevel: 5, costPerUnit: 4.99, location: "Dry Storage" },
    ];

    for (const item of inventoryItems) {
      try {
        const invItem = await prisma.inventoryItem.create({
          data: {
            name: item.name,
            category: item.category as any,
            currentQuantity: item.quantity,
            unit: item.unit as any,
            parLevel: item.parLevel,
            costPerUnit: item.costPerUnit,
            location: item.location,
            restaurantId,
          },
        });

        // Add initial log
        if (item.quantity > 0) {
          await prisma.inventoryLog.create({
            data: {
              inventoryItemId: invItem.id,
              changeType: "RECEIVED",
              quantity: item.quantity,
              previousQuantity: 0,
              newQuantity: item.quantity,
              notes: "Initial inventory count",
              createdById: user.id,
            },
          });
        }

        results.inventoryItems++;
      } catch (invError: any) {
        console.error(`Inventory item ${item.name} error:`, invError);
        results.errors.push(`Inventory ${item.name}: ${invError.message}`);
      }
    }

    // Create price alerts
    try {
      const productsForAlerts = await prisma.supplierProduct.findMany({
        take: 3,
      });

      for (const product of productsForAlerts) {
        try {
          const currentPrice = Number(product.price);

          await prisma.priceAlert.create({
            data: {
              userId: user.id,
              productId: product.id,
              alertType: "PRICE_DROP",
              targetPrice: currentPrice * 0.9, // Alert if price drops 10%
              isActive: true,
            },
          });

          results.priceAlerts++;
        } catch (alertError: any) {
          console.error(`Price alert error for product ${product.id}:`, alertError);
          results.errors.push(`Price alert: ${alertError.message}`);
        }
      }
    } catch (alertsError: any) {
      console.error("Price alerts fetch error:", alertsError);
      results.errors.push(`Price alerts: ${alertsError.message}`);
    }

    // Add some price history for products
    let priceHistoryCount = 0;
    try {
      for (const supplier of suppliers) {
        for (const product of supplier.products) {
          const basePrice = Number(product.price);

          // Create price history for last 30 days
          for (let day = 30; day >= 0; day--) {
            const date = new Date();
            date.setDate(date.getDate() - day);

            // Random price fluctuation within 15%
            const fluctuation = 1 + (Math.random() - 0.5) * 0.15;
            const price = basePrice * fluctuation;

            await prisma.priceHistory.create({
              data: {
                productId: product.id,
                price: Math.round(price * 100) / 100,
                recordedAt: date,
              },
            });
            priceHistoryCount++;
          }
        }
      }
    } catch (historyError: any) {
      console.error("Price history error:", historyError);
      results.errors.push(`Price history: ${historyError.message}`);
    }

    // Create sample notifications
    let notificationsCount = 0;
    const sampleNotifications = [
      {
        type: "ORDER_UPDATE",
        title: "Order Delivered",
        message: "Your order #ORD-12345 from Fresh Farms Co. has been delivered.",
      },
      {
        type: "PRICE_ALERT",
        title: "Price Drop Alert",
        message: "Atlantic Salmon is now 15% cheaper at Ocean Harvest Seafood.",
      },
      {
        type: "DELIVERY_UPDATE",
        title: "Delivery Scheduled",
        message: "Your order from Premium Meats is scheduled for delivery tomorrow.",
      },
      {
        type: "SYSTEM",
        title: "Welcome to Heard!",
        message: "Thanks for joining. Start by exploring suppliers or parsing your menu.",
      },
      {
        type: "PROMOTION",
        title: "New Supplier Promotion",
        message: "Dairy Direct is offering 10% off your first order. Use code FRESH10.",
      },
    ];

    try {
      for (const notif of sampleNotifications) {
        await prisma.notification.create({
          data: {
            type: notif.type as any,
            title: notif.title,
            message: notif.message,
            userId: user.id,
            isRead: notificationsCount > 2, // First 3 are unread
          },
        });
        notificationsCount++;
      }
    } catch (notifError: any) {
      console.error("Notifications error:", notifError);
      results.errors.push(`Notifications: ${notifError.message}`);
    }

    return NextResponse.json({
      success: true,
      message: results.errors.length > 0
        ? `Test data created with ${results.errors.length} errors`
        : "Test data created successfully",
      data: {
        ...results,
        priceHistoryRecords: priceHistoryCount,
        notifications: notificationsCount,
      },
    });
  } catch (error: any) {
    console.error("Seed error:", error);
    return NextResponse.json(
      { error: "Failed to seed test data", details: error?.message },
      { status: 500 }
    );
  }
}

// DELETE - Clear test data
export async function DELETE() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { restaurant: true },
    });

    if (!user?.restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    const restaurantId = user.restaurant.id;
    const deleted: Record<string, number> = {};

    // Delete in order to respect foreign keys
    try {
      const result = await prisma.inventoryLog.deleteMany({
        where: {
          inventoryItem: {
            restaurantId,
          },
        },
      });
      deleted.inventoryLogs = result.count;
    } catch (e: any) {
      console.error("Failed to delete inventory logs:", e.message);
    }

    try {
      const result = await prisma.inventoryItem.deleteMany({
        where: { restaurantId },
      });
      deleted.inventoryItems = result.count;
    } catch (e: any) {
      console.error("Failed to delete inventory items:", e.message);
    }

    try {
      const result = await prisma.invoice.deleteMany({
        where: { restaurantId },
      });
      deleted.invoices = result.count;
    } catch (e: any) {
      console.error("Failed to delete invoices:", e.message);
    }

    try {
      const result = await prisma.orderItem.deleteMany({
        where: {
          order: {
            restaurantId,
          },
        },
      });
      deleted.orderItems = result.count;
    } catch (e: any) {
      console.error("Failed to delete order items:", e.message);
    }

    try {
      const result = await prisma.order.deleteMany({
        where: { restaurantId },
      });
      deleted.orders = result.count;
    } catch (e: any) {
      console.error("Failed to delete orders:", e.message);
    }

    try {
      const result = await prisma.priceAlert.deleteMany({
        where: { userId: user.id },
      });
      deleted.priceAlerts = result.count;
    } catch (e: any) {
      console.error("Failed to delete price alerts:", e.message);
    }

    try {
      const result = await prisma.notification.deleteMany({
        where: { userId: user.id },
      });
      deleted.notifications = result.count;
    } catch (e: any) {
      console.error("Failed to delete notifications:", e.message);
    }

    return NextResponse.json({
      success: true,
      message: "Test data cleared successfully",
      deleted,
    });
  } catch (error: any) {
    console.error("Clear error:", error);
    return NextResponse.json(
      { error: "Failed to clear test data", details: error?.message },
      { status: 500 }
    );
  }
}
