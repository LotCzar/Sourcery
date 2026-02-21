import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { id } = await params;

    const conversation = await prisma.conversation.findFirst({
      where: { id, userId: user.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: conversation.id,
        title: conversation.title,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          role: m.role.toLowerCase() as "user" | "assistant" | "tool",
          content: m.content,
          ...(m.toolName ? { toolName: m.toolName } : {}),
          ...(m.toolInput ? { toolInput: m.toolInput } : {}),
          ...(m.toolResult ? { toolResult: m.toolResult } : {}),
        })),
      },
    });
  } catch (error: any) {
    console.error("Conversation fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch conversation", details: error?.message },
      { status: 500 }
    );
  }
}
