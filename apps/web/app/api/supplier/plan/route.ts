import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validations/validate";

const updatePlanSchema = z.object({
  planTier: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]),
});

export async function PATCH(request: Request) {
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
        { error: "Only supplier admins can change the plan" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateBody(updatePlanSchema, body);
    if (!validation.success) {
      return validation.response;
    }

    await prisma.supplier.update({
      where: { id: user.supplier.id },
      data: { planTier: validation.data.planTier },
    });

    return NextResponse.json({ success: true, data: { planTier: validation.data.planTier } });
  } catch (error: any) {
    console.error("Supplier update plan error:", error);
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    );
  }
}
