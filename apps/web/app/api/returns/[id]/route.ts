import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Get return request detail
export async function GET(
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

    const { id } = await params;

    const returnRequest = await prisma.returnRequest.findFirst({
      where: {
        id,
        order: { restaurantId: user.restaurant.id },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            supplier: {
              select: { id: true, name: true },
            },
          },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    if (!returnRequest) {
      return NextResponse.json(
        { error: "Return request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...returnRequest,
        creditAmount: returnRequest.creditAmount ? Number(returnRequest.creditAmount) : null,
      },
    });
  } catch (error: any) {
    console.error("Get return detail error:", error);
    return NextResponse.json(
      { error: "Failed to fetch return request" },
      { status: 500 }
    );
  }
}
