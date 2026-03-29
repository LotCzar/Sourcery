import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - List return requests for supplier's orders
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
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : "desc";
    const validSortFields = ["createdAt", "status"];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : "createdAt";

    const returns = await prisma.returnRequest.findMany({
      where: {
        order: { supplierId: user.supplier.id },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            restaurant: {
              select: { id: true, name: true },
            },
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { [orderByField]: sortOrder },
    });

    return NextResponse.json({
      success: true,
      data: returns.map((r) => ({
        ...r,
        creditAmount: r.creditAmount ? Number(r.creditAmount) : null,
      })),
    });
  } catch (error: any) {
    console.error("Get supplier returns error:", error);
    return NextResponse.json(
      { error: "Failed to fetch returns" },
      { status: 500 }
    );
  }
}
