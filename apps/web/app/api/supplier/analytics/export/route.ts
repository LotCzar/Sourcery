import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
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

    if (!["SUPPLIER_ADMIN", "SUPPLIER_REP"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "revenue";
    const period = searchParams.get("period") || "30d";

    if (!["revenue", "products", "customers", "orders", "invoices"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Use 'revenue', 'products', 'customers', 'orders', or 'invoices'" },
        { status: 400 }
      );
    }

    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const supplierId = user.supplier.id;

    let data: Record<string, string | number>[];
    let csvHeaders: string[];

    switch (type) {
      case "revenue": {
        const orders = await prisma.order.findMany({
          where: {
            supplierId,
            status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED"] },
            createdAt: { gte: startDate },
          },
          include: {
            restaurant: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5000,
        });

        data = orders.map((o) => ({
          orderNumber: o.orderNumber,
          customer: o.restaurant.name,
          status: o.status,
          subtotal: Number(o.subtotal).toFixed(2),
          tax: Number(o.tax).toFixed(2),
          deliveryFee: Number(o.deliveryFee).toFixed(2),
          total: Number(o.total).toFixed(2),
          date: o.createdAt.toISOString().split("T")[0],
        }));
        csvHeaders = ["orderNumber", "customer", "status", "subtotal", "tax", "deliveryFee", "total", "date"];
        break;
      }

      case "products": {
        const orders = await prisma.order.findMany({
          where: {
            supplierId,
            status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED"] },
            createdAt: { gte: startDate },
          },
          include: {
            items: {
              include: { product: { select: { name: true, category: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5000,
        });

        data = orders.flatMap((o) =>
          o.items.map((item) => ({
            orderNumber: o.orderNumber,
            product: item.product.name,
            category: item.product.category,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice).toFixed(2),
            lineTotal: Number(item.subtotal).toFixed(2),
            orderDate: o.createdAt.toISOString().split("T")[0],
          }))
        );
        csvHeaders = ["orderNumber", "product", "category", "quantity", "unitPrice", "lineTotal", "orderDate"];
        break;
      }

      case "customers": {
        const orders = await prisma.order.findMany({
          where: {
            supplierId,
            status: { in: ["CONFIRMED", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED"] },
            createdAt: { gte: startDate },
          },
          include: {
            restaurant: { select: { name: true, city: true, state: true } },
          },
          take: 5000,
        });

        const customerMap: Record<string, { name: string; city: string; state: string; orderCount: number; totalSpend: number; lastOrder: string }> = {};
        for (const o of orders) {
          const rid = o.restaurantId;
          if (!customerMap[rid]) {
            customerMap[rid] = {
              name: o.restaurant.name,
              city: o.restaurant.city || "",
              state: o.restaurant.state || "",
              orderCount: 0,
              totalSpend: 0,
              lastOrder: o.createdAt.toISOString().split("T")[0],
            };
          }
          customerMap[rid].orderCount++;
          customerMap[rid].totalSpend += Number(o.total);
          const dateStr = o.createdAt.toISOString().split("T")[0];
          if (dateStr > customerMap[rid].lastOrder) {
            customerMap[rid].lastOrder = dateStr;
          }
        }

        data = Object.values(customerMap)
          .sort((a, b) => b.totalSpend - a.totalSpend)
          .map((c) => ({
            ...c,
            totalSpend: c.totalSpend.toFixed(2),
            avgOrderValue: c.orderCount > 0 ? (c.totalSpend / c.orderCount).toFixed(2) : "0.00",
          }));
        csvHeaders = ["name", "city", "state", "orderCount", "totalSpend", "avgOrderValue", "lastOrder"];
        break;
      }

      case "orders": {
        const allOrders = await prisma.order.findMany({
          where: {
            supplierId,
            createdAt: { gte: startDate },
          },
          include: {
            restaurant: { select: { name: true } },
            items: {
              include: { product: { select: { name: true, category: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 5000,
        });

        data = allOrders.flatMap((o) =>
          o.items.map((item) => ({
            orderNumber: o.orderNumber,
            customer: o.restaurant.name,
            product: item.product.name,
            category: item.product.category,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice).toFixed(2),
            lineTotal: Number(item.subtotal).toFixed(2),
            orderDate: o.createdAt.toISOString().split("T")[0],
            status: o.status,
          }))
        );
        csvHeaders = ["orderNumber", "customer", "product", "category", "quantity", "unitPrice", "lineTotal", "orderDate", "status"];
        break;
      }

      case "invoices": {
        const allInvoices = await prisma.invoice.findMany({
          where: {
            supplierId,
            createdAt: { gte: startDate },
          },
          include: {
            restaurant: { select: { name: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 5000,
        });

        const nowDate = new Date();
        data = allInvoices.map((inv) => {
          const isPastDue = ["PENDING", "OVERDUE"].includes(inv.status) && inv.dueDate < nowDate;
          const daysPastDue = isPastDue
            ? Math.floor((nowDate.getTime() - inv.dueDate.getTime()) / (24 * 60 * 60 * 1000))
            : 0;

          return {
            invoiceNumber: inv.invoiceNumber,
            customer: inv.restaurant.name,
            amount: Number(inv.total).toFixed(2),
            subtotal: Number(inv.subtotal).toFixed(2),
            tax: Number(inv.tax).toFixed(2),
            status: inv.status,
            issueDate: inv.issueDate.toISOString().split("T")[0],
            dueDate: inv.dueDate.toISOString().split("T")[0],
            paidDate: inv.paidAt ? inv.paidAt.toISOString().split("T")[0] : "",
            daysPastDue,
          };
        });
        csvHeaders = ["invoiceNumber", "customer", "amount", "subtotal", "tax", "status", "issueDate", "dueDate", "paidDate", "daysPastDue"];
        break;
      }

      default:
        data = [];
        csvHeaders = [];
    }

    const csvRows = [
      csvHeaders.join(","),
      ...data.map((row) =>
        csvHeaders
          .map((h) => {
            let val = String(row[h] ?? "");
            if (/^[=+\-@\t\r]/.test(val)) {
              val = `'${val}`;
            }
            return val.includes(",") || val.includes('"')
              ? `"${val.replace(/"/g, '""')}"`
              : val;
          })
          .join(",")
      ),
    ];

    return new Response(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="supplier-${type}-report.csv"`,
      },
    });
  } catch (error: any) {
    console.error("Supplier export error:", error);
    return NextResponse.json(
      { error: "Failed to export report" },
      { status: 500 }
    );
  }
}
