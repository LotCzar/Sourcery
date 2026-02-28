import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
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

    const products = await prisma.supplierProduct.findMany({
      where: { supplierId: user.supplier.id },
      orderBy: { name: "asc" },
    });

    const csvHeaders = ["id", "name", "description", "category", "unit", "price", "minOrder", "inStock"];

    const csvRows = [
      csvHeaders.join(","),
      ...products.map((p) => {
        const row: Record<string, string> = {
          id: p.id,
          name: p.name,
          description: p.description || "",
          category: p.category,
          unit: p.unit,
          price: Number(p.price).toFixed(2),
          minOrder: p.packSize ? Number(p.packSize).toString() : "",
          inStock: p.inStock ? "true" : "false",
        };
        return csvHeaders
          .map((h) => {
            let val = row[h] ?? "";
            // Formula injection protection
            if (/^[=+\-@\t\r]/.test(val)) {
              val = `'${val}`;
            }
            return val.includes(",") || val.includes('"')
              ? `"${val.replace(/"/g, '""')}"`
              : val;
          })
          .join(",");
      }),
    ];

    return new Response(csvRows.join("\n"), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="products-export.csv"',
      },
    });
  } catch (error: any) {
    console.error("Product export error:", error);
    return NextResponse.json(
      { error: "Failed to export products" },
      { status: 500 }
    );
  }
}
