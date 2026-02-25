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
      include: { restaurant: { select: { id: true } } },
    });

    if (!user?.restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const restaurantSuppliers = await prisma.restaurantSupplier.findMany({
      where: { restaurantId: user.restaurant.id },
      include: {
        supplier: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
      orderBy: { supplier: { name: "asc" } },
    });

    const suppliers = restaurantSuppliers.map((rs) => rs.supplier);

    return NextResponse.json({ success: true, data: suppliers });
  } catch (error: any) {
    console.error("Suppliers list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}
