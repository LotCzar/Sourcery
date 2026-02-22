import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { OrderMessageSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";
import { inngest } from "@/lib/inngest/client";

// GET - Get messages for an order
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { restaurant: true, supplier: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify user has access to this order
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { restaurantId: user.restaurant?.id || "" },
          { supplierId: user.supplier?.id || "" },
        ],
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isSupplierUser = !!user.supplier;

    // Build where clause — supplier users can't see internal messages
    const whereClause: any = { orderId };
    if (isSupplierUser) {
      whereClause.isInternal = false;
    }

    const messages = await prisma.orderMessage.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Mark messages as read for the requesting user (messages sent by others)
    await prisma.orderMessage.updateMany({
      where: {
        orderId,
        senderId: { not: user.id },
        readAt: null,
        ...(isSupplierUser ? { isInternal: false } : {}),
      },
      data: { readAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      data: messages.map((msg) => ({
        ...msg,
        sender: {
          ...msg.sender,
          name: `${msg.sender.firstName || ""} ${msg.sender.lastName || ""}`.trim() || msg.sender.email,
        },
      })),
    });
  } catch (error: any) {
    console.error("Get order messages error:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages", details: error?.message },
      { status: 500 }
    );
  }
}

// POST - Send a message on an order
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(OrderMessageSchema, body);
    if (!validation.success) return validation.response;

    const { content, isInternal } = validation.data;

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { restaurant: true, supplier: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isSupplierUser = !!user.supplier;

    // Verify user has access to this order
    const order = await prisma.order.findFirst({
      where: {
        id: orderId,
        OR: [
          { restaurantId: user.restaurant?.id || "" },
          { supplierId: user.supplier?.id || "" },
        ],
      },
      include: {
        restaurant: { select: { name: true } },
        supplier: { select: { name: true } },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Supplier users cannot send internal messages
    if (isSupplierUser && isInternal) {
      return NextResponse.json(
        { error: "Supplier users cannot send internal messages" },
        { status: 403 }
      );
    }

    const message = await prisma.orderMessage.create({
      data: {
        content,
        orderId,
        senderId: user.id,
        isInternal: isInternal || false,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
      },
    });

    const senderName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.email;

    // Emit Inngest event for notification (only for non-internal messages)
    if (!isInternal) {
      inngest
        .send({
          name: "order/message.sent",
          data: {
            orderId,
            orderNumber: order.orderNumber,
            messageId: message.id,
            senderId: user.id,
            senderName,
            messagePreview: content.slice(0, 200),
            isSupplierSender: isSupplierUser,
            restaurantId: order.restaurantId,
            supplierId: order.supplierId,
          },
        })
        .catch(() => {});
    }

    return NextResponse.json({
      success: true,
      data: {
        ...message,
        sender: {
          ...message.sender,
          name: senderName,
        },
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Send message error:", error);
    return NextResponse.json(
      { error: "Failed to send message", details: error?.message },
      { status: 500 }
    );
  }
}
