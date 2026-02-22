import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validations/validate";

export async function GET() {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: {
      tourCompletedAt: true,
      tourState: true,
      supplierId: true,
    },
  });

  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({
    data: {
      tourCompletedAt: user.tourCompletedAt,
      tourState: user.tourState,
      audience: user.supplierId ? "supplier" : "restaurant",
    },
  });
}

const patchSchema = z.object({
  action: z.enum(["advance", "complete", "reset"]),
  step: z.number().int().min(0).optional(),
});

export async function PATCH(request: NextRequest) {
  const { userId } = await auth();
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const validation = validateBody(patchSchema, body);
  if (!validation.success) return validation.response;

  const { action, step } = validation.data;

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });

  if (!user)
    return NextResponse.json({ error: "User not found" }, { status: 404 });

  let updateData: Record<string, unknown> = {};

  switch (action) {
    case "advance":
      updateData = {
        tourState: { currentStep: step ?? 0 },
      };
      break;
    case "complete":
      updateData = {
        tourCompletedAt: new Date(),
        tourState: { currentStep: 0, completedAt: new Date().toISOString() },
      };
      break;
    case "reset":
      updateData = {
        tourCompletedAt: null,
        tourState: null,
      };
      break;
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
    select: {
      tourCompletedAt: true,
      tourState: true,
    },
  });

  return NextResponse.json({
    data: {
      tourCompletedAt: updated.tourCompletedAt,
      tourState: updated.tourState,
    },
  });
}
