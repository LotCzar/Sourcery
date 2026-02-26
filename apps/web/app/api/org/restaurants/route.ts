import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { AddOrgRestaurantSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "ORG_ADMIN" || !user.organizationId) {
      return NextResponse.json(
        { error: "Requires ORG_ADMIN role with an organization" },
        { status: 403 }
      );
    }

    const restaurants = await prisma.restaurant.findMany({
      where: { organizationId: user.organizationId },
      include: {
        users: { select: { id: true } },
        inventoryItems: {
          where: {
            parLevel: { not: null },
          },
          select: { id: true, currentQuantity: true, parLevel: true },
        },
      },
      orderBy: { name: "asc" },
    });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const result = await Promise.all(
      restaurants.map(async (restaurant) => {
        // MTD spend and order count
        const orders = await prisma.order.findMany({
          where: {
            restaurantId: restaurant.id,
            status: { notIn: ["CANCELLED", "DRAFT"] },
            createdAt: { gte: monthStart },
          },
          select: { total: true },
        });

        const mtdSpend = orders.reduce((sum, o) => sum + Number(o.total), 0);
        const lowStockCount = restaurant.inventoryItems.filter(
          (item) =>
            item.parLevel &&
            Number(item.currentQuantity) <= Number(item.parLevel)
        ).length;

        return {
          id: restaurant.id,
          name: restaurant.name,
          mtdSpend: Math.round(mtdSpend * 100) / 100,
          orderCount: orders.length,
          lowStockCount,
          userCount: restaurant.users.length,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: { restaurants: result },
    });
  } catch (error: any) {
    console.error("Org restaurants error:", error);
    return NextResponse.json(
      { error: "Failed to fetch org restaurants" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.role !== "ORG_ADMIN" || !user.organizationId) {
      return NextResponse.json(
        { error: "Requires ORG_ADMIN role with an organization" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateBody(AddOrgRestaurantSchema, body);
    if (!validation.success) return validation.response;

    const data = validation.data;

    // Parse seating capacity to number
    let seatingCapacity: number | null = null;
    if (data.seatingCapacity) {
      const capacityMap: Record<string, number> = {
        "1-25": 25,
        "26-50": 50,
        "51-100": 100,
        "100+": 150,
      };
      seatingCapacity = capacityMap[data.seatingCapacity] || null;
    }

    const restaurant = await prisma.restaurant.create({
      data: {
        name: data.restaurantName.trim(),
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        cuisineTypes: data.cuisineTypes ?? [],
        seatingCapacity,
        organizationId: user.organizationId,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: restaurant.id,
        name: restaurant.name,
      },
    });
  } catch (error: any) {
    console.error("Create org restaurant error:", error);
    return NextResponse.json(
      { error: "Failed to create restaurant" },
      { status: 500 }
    );
  }
}
