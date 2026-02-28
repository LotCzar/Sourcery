import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Check if current user has a pending supplier staff invite
export async function GET() {
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
      return NextResponse.json({
        success: true,
        data: { hasPendingInvite: false },
      });
    }

    const pendingUser = await prisma.user.findFirst({
      where: {
        email,
        clerkId: { startsWith: "staff_pending_" },
        supplierId: { not: null },
      },
      include: { supplier: true },
    });

    if (!pendingUser || !pendingUser.supplier) {
      return NextResponse.json({
        success: true,
        data: { hasPendingInvite: false },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        hasPendingInvite: true,
        supplierName: pendingUser.supplier.name,
        role: pendingUser.role,
      },
    });
  } catch (error: any) {
    console.error("Check supplier invite error:", error);
    return NextResponse.json(
      { error: "Failed to check invite" },
      { status: 500 }
    );
  }
}
