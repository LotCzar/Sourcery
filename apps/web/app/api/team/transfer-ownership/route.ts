import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validations/validate";
import { TransferOwnershipSchema } from "@/lib/validations";

// POST - Transfer restaurant ownership to another team member
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

    if (user.role !== "OWNER") {
      return NextResponse.json(
        { error: "Only the owner can transfer ownership" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateBody(TransferOwnershipSchema, body);
    if (!validation.success) return validation.response;

    const { targetUserId } = validation.data;

    if (targetUserId === user.id) {
      return NextResponse.json(
        { error: "Cannot transfer ownership to yourself" },
        { status: 400 }
      );
    }

    const targetUser = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        restaurantId: user.restaurant.id,
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Target user not found on this team" },
        { status: 404 }
      );
    }

    // Swap roles in a transaction
    await prisma.$transaction([
      prisma.user.update({
        where: { id: targetUser.id },
        data: { role: "OWNER" },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { role: "MANAGER" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        newOwnerId: targetUser.id,
        previousOwnerId: user.id,
      },
    });
  } catch (error: any) {
    console.error("Transfer ownership error:", error);
    return NextResponse.json(
      { error: "Failed to transfer ownership" },
      { status: 500 }
    );
  }
}
