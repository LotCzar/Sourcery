import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validations/validate";
import { UpdateMenuItemSchema } from "@/lib/validations";
import { inngest } from "@/lib/inngest/client";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    const item = await prisma.menuItem.findFirst({
      where: { id, restaurantId: user.restaurant.id },
      include: {
        ingredients: {
          include: {
            supplierProduct: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        category: item.category,
        isActive: item.isActive,
        posItemId: item.posItemId,
        ingredients: item.ingredients.map((ing) => ({
          id: ing.id,
          name: ing.name,
          quantity: Number(ing.quantity),
          unit: ing.unit,
          notes: ing.notes,
          supplierProduct: ing.supplierProduct,
        })),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    });
  } catch (error) {
    console.error("Menu item fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu item" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    if (!["OWNER", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const existingItem = await prisma.menuItem.findFirst({
      where: { id, restaurantId: user.restaurant.id },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateBody(UpdateMenuItemSchema, body);
    if (!validation.success) return validation.response;

    const { name, description, price, category, isActive } = validation.data;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = price;
    if (category !== undefined) updateData.category = category;
    if (isActive !== undefined) updateData.isActive = isActive;

    const item = await prisma.menuItem.update({
      where: { id },
      data: updateData,
    });

    // If this item is linked to a POS and the restaurant has an active Square integration, trigger push
    if (item.posItemId) {
      const posIntegration = await prisma.pOSIntegration.findUnique({
        where: { restaurantId: user.restaurant.id },
      });
      if (
        posIntegration?.isActive &&
        posIntegration.provider === "SQUARE" &&
        posIntegration.accessToken
      ) {
        await inngest.send({
          name: "pos/push.requested",
          data: {
            integrationId: posIntegration.id,
            restaurantId: user.restaurant.id,
            provider: "SQUARE",
            menuItemIds: [id],
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        category: item.category,
        isActive: item.isActive,
        posItemId: item.posItemId,
      },
    });
  } catch (error) {
    console.error("Menu item update error:", error);
    return NextResponse.json(
      { error: "Failed to update menu item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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

    if (!["OWNER", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const item = await prisma.menuItem.findFirst({
      where: { id, restaurantId: user.restaurant.id },
    });

    if (!item) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    await prisma.menuItem.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      message: "Menu item deleted successfully",
    });
  } catch (error) {
    console.error("Menu item delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete menu item" },
      { status: 500 }
    );
  }
}
