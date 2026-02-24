import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validations/validate";
import { SaveMenuItemsSchema } from "@/lib/validations";
import type { UnitType } from "@prisma/client";

const UNIT_MAP: Record<string, UnitType> = {
  pound: "POUND", lb: "POUND", lbs: "POUND",
  ounce: "OUNCE", oz: "OUNCE",
  kilogram: "KILOGRAM", kg: "KILOGRAM",
  gram: "GRAM", g: "GRAM",
  gallon: "GALLON", gal: "GALLON",
  liter: "LITER", l: "LITER",
  each: "EACH", ea: "EACH",
  bunch: "BUNCH", case: "CASE",
  dozen: "DOZEN", doz: "DOZEN",
  box: "BOX", bag: "BAG",
  quart: "QUART", qt: "QUART",
  pint: "PINT", pt: "PINT",
};

function parseUnit(raw: string): UnitType {
  const key = raw.toLowerCase().trim();
  return UNIT_MAP[key] ?? "EACH";
}

export async function POST(request: Request) {
  try {
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

    const body = await request.json();
    const validation = validateBody(SaveMenuItemsSchema, body);
    if (!validation.success) return validation.response;

    const { items } = validation.data;

    const created = await prisma.$transaction(
      items.map((item) =>
        prisma.menuItem.create({
          data: {
            name: item.name,
            description: item.description ?? null,
            price: item.price,
            category: item.category ?? null,
            restaurantId: user.restaurant!.id,
            ingredients: {
              create: item.ingredients.map((ing) => ({
                name: ing.name,
                quantity: ing.quantity,
                unit: parseUnit(ing.unit),
                notes: ing.notes ?? null,
              })),
            },
          },
        })
      )
    );

    return NextResponse.json({
      success: true,
      count: created.length,
    });
  } catch (error) {
    console.error("Error saving menu items:", error);
    return NextResponse.json(
      { error: "Failed to save menu items" },
      { status: 500 }
    );
  }
}
