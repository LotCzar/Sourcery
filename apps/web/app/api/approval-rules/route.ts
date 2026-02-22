import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { ApprovalRuleSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

// GET - List approval rules for user's restaurant
export async function GET() {
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

    const rules = await prisma.approvalRule.findMany({
      where: { restaurantId: user.restaurant.id },
      orderBy: { minAmount: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: rules.map((rule) => ({
        ...rule,
        minAmount: Number(rule.minAmount),
        maxAmount: rule.maxAmount ? Number(rule.maxAmount) : null,
      })),
    });
  } catch (error: any) {
    console.error("Get approval rules error:", error);
    return NextResponse.json(
      { error: "Failed to fetch approval rules", details: error?.message },
      { status: 500 }
    );
  }
}

// POST - Create approval rule
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
    const validation = validateBody(ApprovalRuleSchema, body);
    if (!validation.success) return validation.response;

    const { minAmount, maxAmount, requiredRole, isActive } = validation.data;

    const rule = await prisma.approvalRule.create({
      data: {
        minAmount,
        maxAmount: maxAmount ?? null,
        requiredRole,
        isActive: isActive ?? true,
        restaurantId: user.restaurant.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...rule,
        minAmount: Number(rule.minAmount),
        maxAmount: rule.maxAmount ? Number(rule.maxAmount) : null,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Create approval rule error:", error);
    return NextResponse.json(
      { error: "Failed to create approval rule", details: error?.message },
      { status: 500 }
    );
  }
}
