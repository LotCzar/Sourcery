import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { UpdateStaffMemberSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

// PATCH - Update a staff member
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
      include: { restaurant: true },
    });

    if (!user?.restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    if (!["OWNER", "MANAGER", "ORG_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const targetMember = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetMember || targetMember.restaurantId !== user.restaurant.id) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Cannot edit OWNER
    if (targetMember.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot edit the owner" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateBody(UpdateStaffMemberSchema, body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    // Only OWNER can set role to MANAGER
    if (data.role === "MANAGER" && user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only the owner can assign the manager role" },
        { status: 403 }
      );
    }

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
    console.error("Update staff member error:", error);
    return NextResponse.json(
      { error: "Failed to update staff member" },
      { status: 500 }
    );
  }
}

// DELETE - Remove a staff member
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
      include: { restaurant: true },
    });

    if (!user?.restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    if (!["OWNER", "MANAGER", "ORG_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const targetMember = await prisma.user.findUnique({
      where: { id },
    });

    if (!targetMember || targetMember.restaurantId !== user.restaurant.id) {
      return NextResponse.json(
        { error: "Member not found" },
        { status: 404 }
      );
    }

    // Cannot remove OWNER
    if (targetMember.role === "OWNER") {
      return NextResponse.json(
        { error: "Cannot remove the owner" },
        { status: 403 }
      );
    }

    // MANAGER can't remove another MANAGER
    if (targetMember.role === "MANAGER" && user.role === "MANAGER") {
      return NextResponse.json(
        { error: "Managers cannot remove other managers" },
        { status: 403 }
      );
    }

    // If pending invite, delete the row entirely
    if (targetMember.clerkId.startsWith("staff_pending_")) {
      await prisma.user.delete({ where: { id } });
    } else {
      // Otherwise, unlink from restaurant
      await prisma.user.update({
        where: { id },
        data: { restaurantId: null, role: "STAFF" },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Remove staff member error:", error);
    return NextResponse.json(
      { error: "Failed to remove staff member" },
      { status: 500 }
    );
  }
}
