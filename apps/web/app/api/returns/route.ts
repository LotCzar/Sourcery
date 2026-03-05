import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";
import { CreateReturnRequestSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";
import { inngest } from "@/lib/inngest/client";

// GET - List return requests for user's restaurant
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
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const returns = await prisma.returnRequest.findMany({
      where: {
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
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: returns.map((r) => ({
        ...r,
        creditAmount: r.creditAmount ? Number(r.creditAmount) : null,
      })),
    });
  } catch (error: any) {
    console.error("Get returns error:", error);
    return NextResponse.json(
      { error: "Failed to fetch returns" },
      { status: 500 }
    );
  }
}

// POST - Create a return request
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
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = validateBody(CreateReturnRequestSchema, body);
    if (!validation.success) return validation.response;
    const data = validation.data;

    // Verify order belongs to restaurant and is DELIVERED
    const order = await prisma.order.findFirst({
      where: {
        id: data.orderId,
        restaurantId: user.restaurant.id,
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 404 }
      );
    }

    if (order.status !== "DELIVERED") {
      return NextResponse.json(
        { error: "Returns can only be created for delivered orders" },
        { status: 400 }
      );
    }

    // Generate return number
    const lastReturn = await prisma.returnRequest.findFirst({
      orderBy: { returnNumber: "desc" },
      select: { returnNumber: true },
    });

    let nextNum = 1;
    if (lastReturn) {
      const match = lastReturn.returnNumber.match(/RET-(\d+)/);
      if (match) nextNum = parseInt(match[1], 10) + 1;
    }
    const returnNumber = `RET-${String(nextNum).padStart(5, "0")}`;

    const returnRequest = await prisma.returnRequest.create({
      data: {
        returnNumber,
        type: data.type,
        reason: data.reason,
        items: data.items ?? Prisma.JsonNull,
        photoUrls: data.photoUrls || [],
        orderId: data.orderId,
        createdById: user.id,
      },
    });

    // Emit Inngest event (fire-and-forget)
    inngest.send({
      name: "return/status.changed",
      data: {
        returnId: returnRequest.id,
        orderId: data.orderId,
        previousStatus: "",
        newStatus: "PENDING",
        restaurantId: user.restaurant.id,
        supplierId: order.supplierId,
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        ...returnRequest,
        creditAmount: returnRequest.creditAmount ? Number(returnRequest.creditAmount) : null,
      },
    });
  } catch (error: any) {
    console.error("Create return error:", error);
    return NextResponse.json(
      { error: "Failed to create return request" },
      { status: 500 }
    );
  }
}
