import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ApprovalRuleSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

// PATCH - Update approval rule
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

    if (!["OWNER", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const rule = await prisma.approvalRule.findFirst({
      where: { id, restaurantId: user.restaurant.id },
    });

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateBody(ApprovalRuleSchema.partial(), body);
    if (!validation.success) return validation.response;

    const updated = await prisma.approvalRule.update({
      where: { id },
      data: {
        ...validation.data,
        maxAmount: validation.data.maxAmount ?? undefined,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        minAmount: Number(updated.minAmount),
        maxAmount: updated.maxAmount ? Number(updated.maxAmount) : null,
      },
    });
  } catch (error: any) {
    console.error("Update approval rule error:", error);
    return NextResponse.json(
      { error: "Failed to update approval rule", details: error?.message },
      { status: 500 }
    );
  }
}

// DELETE - Delete approval rule
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

    if (user.role !== "OWNER") {
      return NextResponse.json({ error: "Only owners can delete approval rules" }, { status: 403 });
    }

    const rule = await prisma.approvalRule.findFirst({
      where: { id, restaurantId: user.restaurant.id },
    });

    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }

    await prisma.approvalRule.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Rule deleted" });
  } catch (error: any) {
    console.error("Delete approval rule error:", error);
    return NextResponse.json(
      { error: "Failed to delete approval rule", details: error?.message },
      { status: 500 }
    );
  }
}
