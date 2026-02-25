import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validations/validate";
import { AddIngredientSchema } from "@/lib/validations";

export async function POST(
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

    const menuItem = await prisma.menuItem.findFirst({
      where: { id, restaurantId: user.restaurant.id },
    });

    if (!menuItem) {
      return NextResponse.json({ error: "Menu item not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateBody(AddIngredientSchema, body);
    if (!validation.success) return validation.response;

    const { name, quantity, unit, notes } = validation.data;

    const ingredient = await prisma.ingredient.create({
      data: {
        name,
        quantity,
        unit,
        notes: notes ?? null,
        menuItemId: id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: ingredient.id,
        name: ingredient.name,
        quantity: Number(ingredient.quantity),
        unit: ingredient.unit,
        notes: ingredient.notes,
      },
    });
  } catch (error) {
    console.error("Add ingredient error:", error);
    return NextResponse.json(
      { error: "Failed to add ingredient" },
      { status: 500 }
    );
  }
}
