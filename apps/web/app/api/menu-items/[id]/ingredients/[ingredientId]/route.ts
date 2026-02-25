import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validations/validate";
import { UpdateIngredientSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; ingredientId: string }> }
) {
  try {
    const { id, ingredientId } = await params;
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

    const ingredient = await prisma.ingredient.findFirst({
      where: { id: ingredientId, menuItemId: id },
      include: { menuItem: { select: { restaurantId: true } } },
    });

    if (!ingredient || ingredient.menuItem.restaurantId !== user.restaurant.id) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateBody(UpdateIngredientSchema, body);
    if (!validation.success) return validation.response;

    const { name, quantity, unit, notes } = validation.data;

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (quantity !== undefined) updateData.quantity = quantity;
    if (unit !== undefined) updateData.unit = unit;
    if (notes !== undefined) updateData.notes = notes;

    const updated = await prisma.ingredient.update({
      where: { id: ingredientId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        name: updated.name,
        quantity: Number(updated.quantity),
        unit: updated.unit,
        notes: updated.notes,
      },
    });
  } catch (error) {
    console.error("Update ingredient error:", error);
    return NextResponse.json(
      { error: "Failed to update ingredient" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; ingredientId: string }> }
) {
  try {
    const { id, ingredientId } = await params;
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

    const ingredient = await prisma.ingredient.findFirst({
      where: { id: ingredientId, menuItemId: id },
      include: { menuItem: { select: { restaurantId: true } } },
    });

    if (!ingredient || ingredient.menuItem.restaurantId !== user.restaurant.id) {
      return NextResponse.json({ error: "Ingredient not found" }, { status: 404 });
    }

    await prisma.ingredient.delete({ where: { id: ingredientId } });

    return NextResponse.json({
      success: true,
      message: "Ingredient deleted successfully",
    });
  } catch (error) {
    console.error("Delete ingredient error:", error);
    return NextResponse.json(
      { error: "Failed to delete ingredient" },
      { status: 500 }
    );
  }
}
