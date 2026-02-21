import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Fetch user and restaurant settings
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        restaurant: {
          include: { posIntegration: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const posIntegration = user.restaurant?.posIntegration;

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          createdAt: user.createdAt,
        },
        restaurant: user.restaurant
          ? {
              id: user.restaurant.id,
              name: user.restaurant.name,
              address: user.restaurant.address,
              city: user.restaurant.city,
              state: user.restaurant.state,
              zipCode: user.restaurant.zipCode,
              phone: user.restaurant.phone,
              website: user.restaurant.website,
              cuisineType: user.restaurant.cuisineType,
              createdAt: user.restaurant.createdAt,
            }
          : null,
        integration: posIntegration
          ? {
              id: posIntegration.id,
              provider: posIntegration.provider,
              storeId: posIntegration.storeId,
              lastSyncAt: posIntegration.lastSyncAt,
              isActive: posIntegration.isActive,
              createdAt: posIntegration.createdAt,
            }
          : null,
        preferences: {
          emailNotifications: true,
          orderUpdates: true,
          priceAlerts: true,
          weeklyReport: true,
        },
      },
    });
  } catch (error: any) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings", details: error?.message },
      { status: 500 }
    );
  }
}

// PATCH - Update user or restaurant settings
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { section, data } = body;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { restaurant: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let result;

    switch (section) {
      case "profile":
        result = await prisma.user.update({
          where: { id: user.id },
          data: {
            firstName: data.firstName,
            lastName: data.lastName,
          },
        });
        break;

      case "restaurant":
        if (!user.restaurant) {
          return NextResponse.json(
            { error: "Restaurant not found" },
            { status: 404 }
          );
        }

        result = await prisma.restaurant.update({
          where: { id: user.restaurant.id },
          data: {
            name: data.name,
            address: data.address,
            city: data.city,
            state: data.state,
            zipCode: data.zipCode,
            phone: data.phone,
            website: data.website,
            cuisineType: data.cuisineType,
          },
        });
        break;

      case "preferences":
        // In a real app, you'd store these in a preferences table
        // For now, we'll just return success
        result = data;
        break;

      default:
        return NextResponse.json(
          { error: "Invalid settings section" },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: result,
      message: "Settings updated successfully",
    });
  } catch (error: any) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings", details: error?.message },
      { status: 500 }
    );
  }
}
