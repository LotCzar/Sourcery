import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import { aiTools, orgTools } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/tool-executor";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import type Anthropic from "@anthropic-ai/sdk";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const anthropic = getAnthropicClient();
    if (!anthropic) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }

    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { restaurant: true, organization: true },
    });

    if (!user?.restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    // For ORG_ADMIN, resolve active restaurant from header
    let activeRestaurantId = user.restaurant.id;
    let activeRestaurantName = user.restaurant.name;

    if (user.role === "ORG_ADMIN" && user.organizationId) {
      const headerRestaurantId = request.headers.get("x-restaurant-id");
      if (headerRestaurantId) {
        const headerRestaurant = await prisma.restaurant.findFirst({
          where: {
            id: headerRestaurantId,
            organizationId: user.organizationId,
          },
        });
        if (headerRestaurant) {
          activeRestaurantId = headerRestaurant.id;
          activeRestaurantName = headerRestaurant.name;
        }
      }
    }

    const { message, conversationId } = await request.json();

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Load or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: { id: conversationId, userId: user.id },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          title: message.slice(0, 100),
        },
        include: { messages: { orderBy: { createdAt: "asc" } } },
      });
    }

    // Save user message
    await prisma.message.create({
      data: {
        role: "USER",
        content: message,
        conversationId: conversation.id,
      },
    });

    // Build message history for Claude
    const rawHistory: Anthropic.MessageParam[] = conversation.messages.map(
      (msg) => {
        if (msg.role === "USER") {
          return { role: "user" as const, content: msg.content };
        }
        if (msg.role === "TOOL") {
          return {
            role: "user" as const,
            content: [
              {
                type: "tool_result" as const,
                tool_use_id: (msg.toolInput as any)?.tool_use_id || "unknown",
                content: JSON.stringify(msg.toolResult),
              },
            ],
          };
        }
        // ASSISTANT messages
        if (msg.toolName) {
          return {
            role: "assistant" as const,
            content: [
              {
                type: "tool_use" as const,
                id: (msg.toolInput as any)?.tool_use_id || "unknown",
                name: msg.toolName,
                input: msg.toolInput || {},
              },
            ],
          };
        }
        return { role: "assistant" as const, content: msg.content };
      }
    );

    // Add current user message
    rawHistory.push({ role: "user", content: message });

    // Ensure no consecutive same-role messages (Claude API requirement).
    // This can happen if a previous request saved the user message but
    // failed before saving the assistant response.
    const history: Anthropic.MessageParam[] = [];
    for (const msg of rawHistory) {
      const prev = history[history.length - 1];
      if (prev && prev.role === msg.role) {
        // Merge consecutive same-role messages
        const prevText = typeof prev.content === "string" ? prev.content : "";
        const currText = typeof msg.content === "string" ? msg.content : "";
        if (prevText && currText) {
          prev.content = `${prevText}\n\n${currText}`;
        }
        // If either is array content (tool_use/tool_result), keep the later one
        if (!prevText || !currText) {
          history[history.length - 1] = msg;
        }
      } else {
        history.push(msg);
      }
    }

    // Ensure history starts with a user message
    while (history.length > 0 && history[0].role !== "user") {
      history.shift();
    }

    // Build system prompt with optional org context
    const orgContext =
      user.role === "ORG_ADMIN" && user.organization
        ? {
            orgName: user.organization.name,
            isOrgAdmin: true,
            restaurantCount: await prisma.restaurant.count({
              where: { organizationId: user.organizationId! },
            }),
          }
        : undefined;

    const systemPrompt = buildSystemPrompt(
      activeRestaurantName,
      user.firstName || "there",
      orgContext
    );

    const toolContext = {
      userId: user.id,
      restaurantId: activeRestaurantId,
      organizationId: user.organizationId || null,
      userRole: user.role,
    };

    // Conditionally include org tools for ORG_ADMIN users
    const tools =
      user.role === "ORG_ADMIN" && user.organizationId
        ? [...aiTools, ...orgTools]
        : aiTools;

    // SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: any) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        };

        try {
          const messages = [...history];
          let continueLoop = true;

          while (continueLoop) {
            const response = await anthropic.messages.create({
              model: "claude-sonnet-4-20250514",
              max_tokens: 4096,
              system: systemPrompt,
              tools,
              messages,
            });

            if (response.stop_reason === "tool_use") {
              // Process tool calls
              for (const block of response.content) {
                if (block.type === "tool_use") {
                  send("tool_call", {
                    id: block.id,
                    name: block.name,
                    input: block.input,
                  });

                  // Execute the tool
                  const result = await executeTool(
                    block.name,
                    block.input as Record<string, any>,
                    toolContext
                  );

                  send("tool_result", {
                    id: block.id,
                    name: block.name,
                    result,
                  });

                  // Save tool call and result to DB
                  await prisma.message.create({
                    data: {
                      role: "ASSISTANT",
                      content: "",
                      toolName: block.name,
                      toolInput: { ...block.input as object, tool_use_id: block.id },
                      conversationId: conversation.id,
                    },
                  });

                  await prisma.message.create({
                    data: {
                      role: "TOOL",
                      content: JSON.stringify(result),
                      toolName: block.name,
                      toolInput: { tool_use_id: block.id },
                      toolResult: result,
                      conversationId: conversation.id,
                    },
                  });

                  // Update messages for next iteration
                  messages.push({
                    role: "assistant",
                    content: response.content,
                  });
                  messages.push({
                    role: "user",
                    content: [
                      {
                        type: "tool_result",
                        tool_use_id: block.id,
                        content: JSON.stringify(result),
                      },
                    ],
                  });
                }
              }
            } else {
              // Final text response
              continueLoop = false;
              let fullText = "";

              for (const block of response.content) {
                if (block.type === "text") {
                  fullText += block.text;
                  send("text", { text: block.text });
                }
              }

              // Save assistant response
              await prisma.message.create({
                data: {
                  role: "ASSISTANT",
                  content: fullText,
                  conversationId: conversation.id,
                },
              });
            }
          }

          send("done", { conversationId: conversation.id });
        } catch (err: any) {
          send("error", { message: err.message || "An error occurred" });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat", details: error?.message },
      { status: 500 }
    );
  }
}
