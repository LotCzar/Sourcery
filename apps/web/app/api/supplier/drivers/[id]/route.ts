import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// PATCH - Update driver info
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
      include: { supplier: true },
    });

    if (!user?.supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Verify driver belongs to this supplier
    const driver = await prisma.user.findFirst({
      where: {
        id,
        supplierId: user.supplier.id,
        role: "DRIVER",
      },
    });

    if (!driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const updateData: any = {};

    if (body.firstName !== undefined) updateData.firstName = body.firstName;
    if (body.lastName !== undefined) updateData.lastName = body.lastName;
    if (body.phone !== undefined) updateData.phone = body.phone;

    const updatedDriver = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updatedDriver.id,
        firstName: updatedDriver.firstName,
        lastName: updatedDriver.lastName,
        email: updatedDriver.email,
        phone: updatedDriver.phone,
      },
    });
  } catch (error: any) {
    console.error("Update driver error:", error);
    return NextResponse.json(
      { error: "Failed to update driver", details: error?.message },
      { status: 500 }
    );
  }
}

// DELETE - Remove driver from supplier
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
      include: { supplier: true },
    });

    if (!user?.supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const driver = await prisma.user.findFirst({
      where: {
        id,
        supplierId: user.supplier.id,
        role: "DRIVER",
      },
    });

    if (!driver) {
      return NextResponse.json(
        { error: "Driver not found" },
        { status: 404 }
      );
    }

    // Unassign from any active deliveries
    await prisma.order.updateMany({
      where: {
        driverId: id,
        status: { in: ["CONFIRMED", "SHIPPED"] },
      },
      data: { driverId: null },
    });

    // Remove driver association
    await prisma.user.update({
      where: { id },
      data: {
        supplierId: null,
        role: "STAFF",
      },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete driver error:", error);
    return NextResponse.json(
      { error: "Failed to remove driver", details: error?.message },
      { status: 500 }
    );
  }
}
