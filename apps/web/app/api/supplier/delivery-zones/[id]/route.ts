import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validations/validate";
import { UpdateDeliveryZoneSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { supplier: true },
    });

    if (!user?.supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    if (user.role !== "SUPPLIER_ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.deliveryZone.findFirst({
      where: { id, supplierId: user.supplier.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Delivery zone not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateBody(UpdateDeliveryZoneSchema, body);
    if (!validation.success) return validation.response;

    const zone = await prisma.deliveryZone.update({
      where: { id },
      data: {
        ...(validation.data.name !== undefined && { name: validation.data.name }),
        ...(validation.data.zipCodes !== undefined && { zipCodes: validation.data.zipCodes }),
        ...(validation.data.deliveryFee !== undefined && { deliveryFee: validation.data.deliveryFee }),
        ...(validation.data.minimumOrder !== undefined && { minimumOrder: validation.data.minimumOrder }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...zone,
        deliveryFee: Number(zone.deliveryFee),
        minimumOrder: zone.minimumOrder ? Number(zone.minimumOrder) : null,
      },
    });
  } catch (error: any) {
    console.error("Delivery zone PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update delivery zone" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { supplier: true },
    });

    if (!user?.supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    if (user.role !== "SUPPLIER_ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const { id } = await params;

    const existing = await prisma.deliveryZone.findFirst({
      where: { id, supplierId: user.supplier.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Delivery zone not found" }, { status: 404 });
    }

    await prisma.deliveryZone.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delivery zone DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to delete delivery zone" },
      { status: 500 }
    );
  }
}
