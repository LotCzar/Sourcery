import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UpdateSupplierStaffSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

// PATCH - Update a supplier staff member
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
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    if (user.role !== "SUPPLIER_ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const targetMember = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetMember || targetMember.supplierId !== user.supplier.id) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Cannot demote self
    if (targetMember.id === user.id) {
      return NextResponse.json(
        { error: "Cannot modify your own role" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateBody(UpdateSupplierStaffSchema, body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(data.firstName !== undefined && { firstName: data.firstName }),
        ...(data.lastName !== undefined && { lastName: data.lastName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.role !== undefined && { role: data.role }),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: updated.id,
        firstName: updated.firstName,
        lastName: updated.lastName,
        email: updated.email,
        phone: updated.phone,
        role: updated.role,
      },
    });
  } catch (error: any) {
    console.error("Update supplier staff error:", error);
    return NextResponse.json(
      { error: "Failed to update staff member" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a supplier staff member
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
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    if (user.role !== "SUPPLIER_ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const targetMember = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetMember || targetMember.supplierId !== user.supplier.id) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Cannot remove the admin — transfer ownership first
    if (targetMember.role === "SUPPLIER_ADMIN") {
      return NextResponse.json(
        { error: "Cannot remove the admin. Transfer ownership first." },
        { status: 403 }
      );
    }

    // Cannot remove self
    if (targetMember.id === user.id) {
      return NextResponse.json(
        { error: "Cannot remove yourself" },
        { status: 403 }
      );
    }

    // If pending invite, delete the row entirely
    if (targetMember.clerkId.startsWith("staff_pending_")) {
      await prisma.user.delete({ where: { id } });
    } else {
      // Otherwise, unlink from supplier
      await prisma.user.update({
        where: { id },
        data: { supplierId: null, role: "SUPPLIER_REP" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Remove supplier staff error:", error);
    return NextResponse.json(
      { error: "Failed to remove staff member" },
      { status: 500 }
    );
  }
}
