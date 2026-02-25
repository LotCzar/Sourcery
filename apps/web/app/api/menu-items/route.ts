import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validations/validate";
import { SaveMenuItemsSchema } from "@/lib/validations";
import type { UnitType } from "@prisma/client";

// GET list menu items with filters
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const active = searchParams.get("active");
    const search = searchParams.get("search");

    const where: any = { restaurantId: user.restaurant.id };
    if (category) where.category = category;
    if (active === "true") where.isActive = true;
    if (active === "false") where.isActive = false;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const items = await prisma.menuItem.findMany({
      where,
      include: {
        ingredients: {
          include: {
            supplierProduct: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const allItems = await prisma.menuItem.findMany({
      where: { restaurantId: user.restaurant.id },
      select: { isActive: true, category: true },
    });

    const categories = [...new Set(allItems.map((i) => i.category).filter(Boolean))] as string[];

    return NextResponse.json({
      success: true,
      data: items.map((item) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        price: Number(item.price),
        category: item.category,
        isActive: item.isActive,
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
      })),
      summary: {
        totalItems: allItems.length,
        activeCount: allItems.filter((i) => i.isActive).length,
        inactiveCount: allItems.filter((i) => !i.isActive).length,
        categories,
      },
    });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu items" },
      { status: 500 }
    );
  }
}

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

    if (!["OWNER", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
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
