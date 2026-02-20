import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UpdateInventoryItemSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";
import { inngest } from "@/lib/inngest/client";

// GET single inventory item with full history
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

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: id,
        restaurantId: user.restaurant.id,
      },
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
          take: 50,
          include: {
            createdBy: {
              select: { firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
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
        logs: item.logs.map((log) => ({
          id: log.id,
          changeType: log.changeType,
          quantity: Number(log.quantity),
          previousQuantity: Number(log.previousQuantity),
          newQuantity: Number(log.newQuantity),
          notes: log.notes,
          reference: log.reference,
          createdBy: log.createdBy,
          createdAt: log.createdAt,
        })),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Inventory fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory item", details: error?.message },
      { status: 500 }
    );
  }
}

// PATCH update inventory item or adjust quantity
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

    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        id: id,
        restaurantId: user.restaurant.id,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateBody(UpdateInventoryItemSchema, body);
    if (!validation.success) return validation.response;
    const {
      name,
      category,
      unit,
      parLevel,
      costPerUnit,
      location,
      notes,
      supplierProductId,
      adjustQuantity,
      changeType,
      adjustmentNotes,
      reference,
    } = validation.data;

    // If adjusting quantity
    if (adjustQuantity !== undefined && changeType) {
      const previousQuantity = Number(existingItem.currentQuantity);
      let newQuantity: number;

      if (changeType === "COUNT") {
        // For count, adjustQuantity is the new absolute quantity
        newQuantity = adjustQuantity;
      } else if (changeType === "USED" || changeType === "WASTE") {
        // These reduce inventory
        newQuantity = previousQuantity - Math.abs(adjustQuantity);
      } else {
        // RECEIVED, ADJUSTED, TRANSFERRED add to inventory
        newQuantity = previousQuantity + adjustQuantity;
      }

      // Don't allow negative inventory
      if (newQuantity < 0) newQuantity = 0;

      // Update item quantity
      await prisma.inventoryItem.update({
        where: { id: id },
        data: { currentQuantity: newQuantity },
      });

      // Create log entry
      await prisma.inventoryLog.create({
        data: {
          inventoryItemId: id,
          changeType,
          quantity: changeType === "COUNT" ? newQuantity - previousQuantity : adjustQuantity,
          previousQuantity,
          newQuantity,
          notes: adjustmentNotes || null,
          reference: reference || null,
          createdById: user.id,
        },
      });

      // Check if below par level and emit event
      const itemParLevel = existingItem.parLevel
        ? Number(existingItem.parLevel)
        : null;
      if (itemParLevel && newQuantity < itemParLevel) {
        inngest
          .send({
            name: "inventory/below.par",
            data: {
              inventoryItemId: id,
              restaurantId: user.restaurant.id,
              itemName: existingItem.name,
              currentQuantity: newQuantity,
              parLevel: itemParLevel,
            },
          })
          .catch(() => {});
      }

      return NextResponse.json({
        success: true,
        data: {
          id: existingItem.id,
          name: existingItem.name,
          previousQuantity,
          newQuantity,
          changeType,
        },
      });
    }

    // Otherwise, update item details
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (unit !== undefined) updateData.unit = unit;
    if (parLevel !== undefined) updateData.parLevel = parLevel;
    if (costPerUnit !== undefined) updateData.costPerUnit = costPerUnit;
    if (location !== undefined) updateData.location = location;
    if (notes !== undefined) updateData.notes = notes;
    if (supplierProductId !== undefined) updateData.supplierProductId = supplierProductId;

    const item = await prisma.inventoryItem.update({
      where: { id: id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: item.id,
        name: item.name,
        category: item.category,
        currentQuantity: Number(item.currentQuantity),
        unit: item.unit,
        parLevel: item.parLevel ? Number(item.parLevel) : null,
      },
    });
  } catch (error: any) {
    console.error("Inventory update error:", error);
    return NextResponse.json(
      { error: "Failed to update inventory item", details: error?.message },
      { status: 500 }
    );
  }
}

// DELETE inventory item
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

    const item = await prisma.inventoryItem.findFirst({
      where: {
        id: id,
        restaurantId: user.restaurant.id,
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    await prisma.inventoryItem.delete({
      where: { id: id },
    });

    return NextResponse.json({
      success: true,
      message: "Inventory item deleted successfully",
    });
  } catch (error: any) {
    console.error("Inventory delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete inventory item", details: error?.message },
      { status: 500 }
    );
  }
}
