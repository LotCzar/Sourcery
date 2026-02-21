import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { restaurant: true },
    });

    if (!user?.restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";
    const type = searchParams.get("type") || "spending";
    const timeRangeParam = searchParams.get("timeRange") || "30";
    const days = ["7", "30", "90"].includes(timeRangeParam) ? parseInt(timeRangeParam) : 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    if (!["csv", "json"].includes(format)) {
      return NextResponse.json(
        { error: "Invalid format. Use 'csv' or 'json'" },
        { status: 400 }
      );
    }

    if (!["spending", "orders", "suppliers"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid type. Use 'spending', 'orders', or 'suppliers'" },
        { status: 400 }
      );
    }

    let data: any[];
    let csvHeaders: string[];

    switch (type) {
      case "spending": {
        const orders = await prisma.order.findMany({
          where: {
            restaurantId: user.restaurant.id,
            status: { in: ["DELIVERED", "CONFIRMED", "SHIPPED"] },
            createdAt: { gte: startDate },
          },
          include: { supplier: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
        });

        data = orders.map((o) => ({
          orderNumber: o.orderNumber,
          supplier: o.supplier.name,
          status: o.status,
          subtotal: Number(o.subtotal).toFixed(2),
          tax: Number(o.tax).toFixed(2),
          deliveryFee: Number(o.deliveryFee).toFixed(2),
          total: Number(o.total).toFixed(2),
          date: o.createdAt.toISOString().split("T")[0],
        }));
        csvHeaders = [
          "orderNumber",
          "supplier",
          "status",
          "subtotal",
          "tax",
          "deliveryFee",
          "total",
          "date",
        ];
        break;
      }

      case "orders": {
        const orders = await prisma.order.findMany({
          where: { restaurantId: user.restaurant.id, createdAt: { gte: startDate } },
          include: {
            supplier: { select: { name: true } },
            items: {
              include: { product: { select: { name: true, category: true } } },
            },
          },
          orderBy: { createdAt: "desc" },
        });

        data = orders.flatMap((o) =>
          o.items.map((item) => ({
            orderNumber: o.orderNumber,
            status: o.status,
            supplier: o.supplier.name,
            product: item.product.name,
            category: item.product.category,
            quantity: Number(item.quantity),
            unitPrice: Number(item.unitPrice).toFixed(2),
            lineTotal: Number(item.subtotal).toFixed(2),
            orderDate: o.createdAt.toISOString().split("T")[0],
          }))
        );
        csvHeaders = [
          "orderNumber",
          "status",
          "supplier",
          "product",
          "category",
          "quantity",
          "unitPrice",
          "lineTotal",
          "orderDate",
        ];
        break;
      }

      case "suppliers": {
        const suppliers = await prisma.supplier.findMany({
          where: {
            orders: { some: { restaurantId: user.restaurant.id } },
          },
          include: {
            _count: {
              select: {
                orders: { where: { restaurantId: user.restaurant.id } },
              },
            },
            orders: {
              where: {
                restaurantId: user.restaurant.id,
                status: { in: ["DELIVERED", "CONFIRMED", "SHIPPED"] },
                createdAt: { gte: startDate },
              },
              select: { total: true },
            },
          },
        });

        data = suppliers.map((s) => ({
          name: s.name,
          email: s.email || "",
          phone: s.phone || "",
          status: s.status,
          rating: s.rating ? Number(s.rating).toFixed(1) : "",
          totalOrders: s._count.orders,
          totalSpent: s.orders
            .reduce((sum, o) => sum + Number(o.total), 0)
            .toFixed(2),
          deliveryFee: s.deliveryFee ? Number(s.deliveryFee).toFixed(2) : "",
          minimumOrder: s.minimumOrder
            ? Number(s.minimumOrder).toFixed(2)
            : "",
        }));
        csvHeaders = [
          "name",
          "email",
          "phone",
          "status",
          "rating",
          "totalOrders",
          "totalSpent",
          "deliveryFee",
          "minimumOrder",
        ];
        break;
      }

      default:
        data = [];
        csvHeaders = [];
    }

    if (format === "csv") {
      const csvRows = [
        csvHeaders.join(","),
        ...data.map((row) =>
          csvHeaders
            .map((h) => {
              const val = String(row[h] ?? "");
              return val.includes(",") ? `"${val}"` : val;
            })
            .join(",")
        ),
      ];

      return new Response(csvRows.join("\n"), {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${type}-report.csv"`,
        },
      });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error("Report export error:", error);
    return NextResponse.json(
      { error: "Failed to export report", details: error?.message },
      { status: 500 }
    );
  }
}
