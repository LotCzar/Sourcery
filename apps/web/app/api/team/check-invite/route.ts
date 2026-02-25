import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Check if current user has a pending staff invite
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
      },
      include: { restaurant: true },
    });

    if (!pendingUser || !pendingUser.restaurant) {
      return NextResponse.json({
        success: true,
        data: { hasPendingInvite: false },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        hasPendingInvite: true,
        restaurantName: pendingUser.restaurant.name,
        role: pendingUser.role,
      },
    });
  } catch (error: any) {
    console.error("Check invite error:", error);
    return NextResponse.json(
      { error: "Failed to check invite" },
      { status: 500 }
    );
  }
}
