import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validations/validate";

const updatePlanSchema = z.object({
  planTier: z.enum(["STARTER", "PROFESSIONAL", "ENTERPRISE"]),
});

export async function PATCH(request: Request) {
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

  if (user.role !== "OWNER" && user.role !== "ORG_ADMIN") {
    return NextResponse.json(
      { error: "Only owners and admins can change the plan" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const validation = validateBody(updatePlanSchema, body);
  if (!validation.success) {
    return validation.response;
  }

  await prisma.restaurant.update({
    where: { id: user.restaurant.id },
    data: { planTier: validation.data.planTier },
  });

  return NextResponse.json({ data: { planTier: validation.data.planTier } });
}
