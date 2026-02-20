import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { CreateInventoryItemSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

// GET all inventory items for user's restaurant
export async function GET(request: Request) {
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
    const lowStock = searchParams.get("lowStock");

    const where: any = {
      restaurantId: user.restaurant.id,
    };

    if (category && category !== "all") {
      where.category = category;
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        supplierProduct: {
          include: {
            supplier: {
              select: { id: true, name: true },
            },
          },
        },
        logs: {
          orderBy: { createdAt: "desc" },
          take: 5,
          include: {
            createdBy: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Filter low stock items if requested
    let filteredItems = items;
    if (lowStock === "true") {
      filteredItems = items.filter((item) => {
        if (!item.parLevel) return false;
        return Number(item.currentQuantity) <= Number(item.parLevel);
      });
    }

    // Calculate summary stats
    const totalItems = items.length;
    const lowStockCount = items.filter((item) => {
      if (!item.parLevel) return false;
      return Number(item.currentQuantity) <= Number(item.parLevel);
    }).length;
    const outOfStockCount = items.filter(
      (item) => Number(item.currentQuantity) <= 0
    ).length;
    const totalValue = items.reduce((sum, item) => {
      const cost = item.costPerUnit ? Number(item.costPerUnit) : 0;
      return sum + cost * Number(item.currentQuantity);
    }, 0);

    // Format items
    const formattedItems = filteredItems.map((item) => ({
      id: item.id,
      name: item.name,
      category: item.category,
      currentQuantity: Number(item.currentQuantity),
      unit: item.unit,
      parLevel: item.parLevel ? Number(item.parLevel) : null,
      costPerUnit: item.costPerUnit ? Number(item.costPerUnit) : null,
      location: item.location,
      notes: item.notes,
      supplierProduct: item.supplierProduct
        ? {
            id: item.supplierProduct.id,
            name: item.supplierProduct.name,
            price: Number(item.supplierProduct.price),
            supplier: item.supplierProduct.supplier,
          }
        : null,
      recentLogs: item.logs.map((log) => ({
        id: log.id,
        changeType: log.changeType,
        quantity: Number(log.quantity),
        previousQuantity: Number(log.previousQuantity),
        newQuantity: Number(log.newQuantity),
        notes: log.notes,
        createdBy: log.createdBy,
        createdAt: log.createdAt,
      })),
      isLowStock: item.parLevel
        ? Number(item.currentQuantity) <= Number(item.parLevel)
        : false,
      isOutOfStock: Number(item.currentQuantity) <= 0,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: formattedItems,
      summary: {
        totalItems,
        lowStockCount,
        outOfStockCount,
        totalValue,
      },
    });
  } catch (error: any) {
    console.error("Inventory fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory", details: error?.message },
      { status: 500 }
    );
  }
}

// POST create new inventory item
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
    const validation = validateBody(CreateInventoryItemSchema, body);
    if (!validation.success) return validation.response;
    const {
      name,
      category,
      currentQuantity,
      unit,
      parLevel,
      costPerUnit,
      location,
      notes,
      supplierProductId,
    } = validation.data;

    const item = await prisma.inventoryItem.create({
      data: {
        name,
        category,
        currentQuantity,
        unit,
        parLevel: parLevel || null,
        costPerUnit: costPerUnit || null,
        location: location || null,
        notes: notes || null,
        restaurantId: user.restaurant.id,
        supplierProductId: supplierProductId || null,
      },
    });

    // Create initial log entry if starting with quantity > 0
    if (currentQuantity > 0) {
      await prisma.inventoryLog.create({
        data: {
          inventoryItemId: item.id,
          changeType: "RECEIVED",
          quantity: currentQuantity,
          previousQuantity: 0,
          newQuantity: currentQuantity,
          notes: "Initial inventory",
          createdById: user.id,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: item.id,
        name: item.name,
        category: item.category,
        currentQuantity: Number(item.currentQuantity),
        unit: item.unit,
      },
    });
  } catch (error: any) {
    console.error("Inventory create error:", error);
    return NextResponse.json(
      { error: "Failed to create inventory item", details: error?.message },
      { status: 500 }
    );
  }
}
