import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST - Accept a pending supplier staff invite
export async function POST() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) {
      return NextResponse.json(
        { error: "No email found" },
        { status: 400 }
      );
    }

    const pendingUser = await prisma.user.findFirst({
      where: {
        email,
        clerkId: { startsWith: "staff_pending_" },
        supplierId: { not: null },
      },
    });

    if (!pendingUser) {
      return NextResponse.json(
        { error: "No pending invite found" },
        { status: 404 }
      );
    }

    // Update the pending user with the real Clerk ID and name
    const updated = await prisma.user.update({
      where: { id: pendingUser.id },
      data: {
        clerkId: userId,
        firstName: clerkUser.firstName || pendingUser.firstName,
        lastName: clerkUser.lastName || pendingUser.lastName,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        supplierId: updated.supplierId,
        role: updated.role,
      },
    });
  } catch (error: any) {
    console.error("Accept supplier invite error:", error);
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    );
  }
}
