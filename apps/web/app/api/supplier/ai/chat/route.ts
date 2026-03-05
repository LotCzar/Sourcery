import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import { supplierAiTools } from "@/lib/ai/supplier-tools";
import { executeSupplierTool } from "@/lib/ai/supplier-tool-executor";
import { buildSupplierSystemPrompt } from "@/lib/ai/supplier-system-prompt";
import { checkAiRateLimit } from "@/lib/ai/rate-limit";
import { trackAiUsage } from "@/lib/ai/usage";
import { AiChatSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";
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
      include: {
        supplier: { select: { id: true, name: true, planTier: true } },
      },
    });

    if (!user?.supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const supplierId = user.supplier.id;
    const planTier = user.supplier.planTier;

    // Rate limit check
    const rateLimit = await checkAiRateLimit(supplierId, "SUPPLIER_CHAT", planTier, "supplier");
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "AI chat rate limit exceeded",
          details: `You have used ${rateLimit.used} of ${rateLimit.limit} chat requests this month. Resets ${rateLimit.resetAt.toISOString()}.`,
          usage: { used: rateLimit.used, limit: rateLimit.limit, resetAt: rateLimit.resetAt },
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = validateBody(AiChatSchema, body);
    if (!validation.success) return validation.response;
    const { message, conversationId } = validation.data;

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

    rawHistory.push({ role: "user", content: message });

    // Ensure no consecutive same-role messages (Claude API requirement).
    // This can happen when multiple tool_use/tool_result pairs are stored
    // as individual DB records, or if a previous request failed mid-stream.
    const history: Anthropic.MessageParam[] = [];
    for (const msg of rawHistory) {
      const prev = history[history.length - 1];
      if (prev && prev.role === msg.role) {
        const prevIsArray = Array.isArray(prev.content);
        const currIsArray = Array.isArray(msg.content);

        if (!prevIsArray && !currIsArray) {
          prev.content = `${prev.content}\n\n${msg.content}`;
        } else {
          const prevBlocks = prevIsArray
            ? (prev.content as any[])
            : [{ type: "text" as const, text: prev.content as string }];
          const currBlocks = currIsArray
            ? (msg.content as any[])
            : [{ type: "text" as const, text: msg.content as string }];
          prev.content = [...prevBlocks, ...currBlocks] as any;
        }
      } else {
        history.push(msg);
      }
    }

    // Ensure history starts with a user message
    while (history.length > 0 && history[0].role !== "user") {
      history.shift();
    }

    const systemPrompt = buildSupplierSystemPrompt(
      user.supplier.name,
      user.firstName || "there",
      planTier
    );

    const toolContext = {
      userId: user.id,
      supplierId,
      userRole: user.role,
      planTier,
    };

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
          const MAX_TOOL_ITERATIONS = 10;
          let toolIterations = 0;

          while (continueLoop) {
            if (++toolIterations > MAX_TOOL_ITERATIONS) {
              send("text", { text: "I've reached the maximum number of tool calls for this request. Please try again with a simpler query." });
              break;
            }

            const response = await anthropic.messages.create({
              model: "claude-sonnet-4-6",
              max_tokens: 4096,
              system: systemPrompt,
              tools: supplierAiTools,
              messages,
            });

            // Track usage
            void trackAiUsage({
              feature: "SUPPLIER_CHAT",
              supplierId,
              userId: user.id,
              inputTokens: response.usage.input_tokens,
              outputTokens: response.usage.output_tokens,
              cacheReadTokens: (response.usage as any).cache_read_input_tokens ?? 0,
              cacheWriteTokens: (response.usage as any).cache_creation_input_tokens ?? 0,
              model: response.model,
            });

            if (response.stop_reason === "tool_use") {
              // Push assistant message with all tool_use blocks ONCE
              messages.push({
                role: "assistant",
                content: response.content,
              });

              // Process all tool calls and collect results
              const toolResults: Array<{
                type: "tool_result";
                tool_use_id: string;
                content: string;
              }> = [];

              for (const block of response.content) {
                if (block.type === "tool_use") {
                  send("tool_call", {
                    id: block.id,
                    name: block.name,
                    input: block.input,
                  });

                  const result = await executeSupplierTool(
                    block.name,
                    block.input as Record<string, any>,
                    toolContext
                  );

                  send("tool_result", {
                    id: block.id,
                    name: block.name,
                    result,
                  });

                  toolResults.push({
                    type: "tool_result",
                    tool_use_id: block.id,
                    content: JSON.stringify(result),
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
                }
              }

              // Push all tool results as a single user message
              messages.push({
                role: "user",
                content: toolResults,
              });
            } else {
              continueLoop = false;
              let fullText = "";

              for (const block of response.content) {
                if (block.type === "text") {
                  fullText += block.text;
                  send("text", { text: block.text });
                }
              }

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
          const errorDetail = err?.status
            ? `${err.status} ${JSON.stringify(err?.error || err?.message)}`
            : err?.message || String(err);
          console.error("Supplier chat stream error:", errorDetail);
          send("error", { message: "An error occurred while processing your request." });
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
    console.error("Supplier chat API error:", error);
    return NextResponse.json(
      { error: "Failed to process chat" },
      { status: 500 }
    );
  }
}
