import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { restaurant: { select: { id: true } } },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch org restaurants if user is ORG_ADMIN with an organization
    let orgRestaurants: { id: string; name: string }[] = [];
    if (user.role === "ORG_ADMIN" && user.organizationId) {
      orgRestaurants = await prisma.restaurant.findMany({
        where: { organizationId: user.organizationId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        restaurantId: user.restaurant?.id || null,
        role: user.role,
        organizationId: user.organizationId || null,
        orgRestaurants,
      },
    });
  } catch (error: any) {
    console.error("User context error:", error);
    return NextResponse.json(
      { error: "Failed to fetch user context" },
      { status: 500 }
    );
  }
}
