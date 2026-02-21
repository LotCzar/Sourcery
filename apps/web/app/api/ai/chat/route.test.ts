import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  mockAnthropicClient,
  mockAnthropicCreate,
} from "@/__tests__/mocks/anthropic";
import {
  createMockUserWithRestaurant,
  createMockConversation,
} from "@/__tests__/fixtures";
import { getAnthropicClient } from "@/lib/anthropic";

const { mockExecuteTool } = vi.hoisted(() => ({
  mockExecuteTool: vi.fn(),
}));
vi.mock("@/lib/ai/tool-executor", () => ({ executeTool: mockExecuteTool }));
vi.mock("@/lib/ai/system-prompt", () => ({
  buildSystemPrompt: vi.fn().mockReturnValue("system prompt"),
}));

import { POST } from "./route";

async function parseSSEResponse(response: Response) {
  const text = await response.text();
  const events: { event: string; data: any }[] = [];
  const parts = text.split("\n\n").filter(Boolean);
  for (const part of parts) {
    const eventMatch = part.match(/event: (.+)/);
    const dataMatch = part.match(/data: (.+)/);
    if (eventMatch && dataMatch) {
      events.push({ event: eventMatch[1], data: JSON.parse(dataMatch[1]) });
    }
  }
  return events;
}

function createChatRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai/chat", () => {
  const mockUser = createMockUserWithRestaurant();
  const mockConversation = {
    ...createMockConversation(),
    messages: [],
  };

  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
    (getAnthropicClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockAnthropicClient
    );
    mockExecuteTool.mockReset();
  });

  it("returns 503 when Anthropic not configured", async () => {
    (getAnthropicClient as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const request = createChatRequest({ message: "Hello" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe("AI service not configured");
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const request = createChatRequest({ message: "Hello" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when restaurant not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const request = createChatRequest({ message: "Hello" });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Restaurant not found");
  });

  it("returns 400 when message missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

    const request = createChatRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Message is required");
  });

  it("returns 400 when message is not a string", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

    const request = createChatRequest({ message: 123 });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Message is required");
  });

  it("creates new conversation when no conversationId provided", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    prismaMock.conversation.create.mockResolvedValue(mockConversation as any);
    prismaMock.message.create.mockResolvedValue({} as any);
    mockAnthropicCreate.mockResolvedValue({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Hello!" }],
    });

    const request = createChatRequest({ message: "Hello" });
    const response = await POST(request);
    await parseSSEResponse(response);

    expect(prismaMock.conversation.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: mockUser.id,
          title: "Hello",
        }),
      })
    );
  });

  it("loads existing conversation when conversationId provided", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    prismaMock.conversation.findFirst.mockResolvedValue(
      mockConversation as any
    );
    prismaMock.message.create.mockResolvedValue({} as any);
    mockAnthropicCreate.mockResolvedValue({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Hello!" }],
    });

    const request = createChatRequest({
      message: "Hello",
      conversationId: "conv_1",
    });
    const response = await POST(request);
    await parseSSEResponse(response);

    expect(prismaMock.conversation.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "conv_1", userId: mockUser.id },
      })
    );
  });

  it("saves user message to database", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    prismaMock.conversation.create.mockResolvedValue(mockConversation as any);
    prismaMock.message.create.mockResolvedValue({} as any);
    mockAnthropicCreate.mockResolvedValue({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Hi" }],
    });

    const request = createChatRequest({ message: "Hello" });
    const response = await POST(request);
    await parseSSEResponse(response);

    expect(prismaMock.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          role: "USER",
          content: "Hello",
          conversationId: mockConversation.id,
        }),
      })
    );
  });

  it("streams text response with done event", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    prismaMock.conversation.create.mockResolvedValue(mockConversation as any);
    prismaMock.message.create.mockResolvedValue({} as any);
    mockAnthropicCreate.mockResolvedValue({
      stop_reason: "end_turn",
      content: [{ type: "text", text: "Hello there!" }],
    });

    const request = createChatRequest({ message: "Hello" });
    const response = await POST(request);
    const events = await parseSSEResponse(response);

    expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    const textEvent = events.find((e) => e.event === "text");
    expect(textEvent).toBeDefined();
    expect(textEvent!.data.text).toBe("Hello there!");
    const doneEvent = events.find((e) => e.event === "done");
    expect(doneEvent).toBeDefined();
    expect(doneEvent!.data.conversationId).toBe(mockConversation.id);
  });

  it("handles tool use loop", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    prismaMock.conversation.create.mockResolvedValue(mockConversation as any);
    prismaMock.message.create.mockResolvedValue({} as any);
    mockExecuteTool.mockResolvedValue({ items: [{ name: "Tomatoes" }] });

    // First call returns tool_use, second returns end_turn
    mockAnthropicCreate
      .mockResolvedValueOnce({
        stop_reason: "tool_use",
        content: [
          {
            type: "tool_use",
            id: "tool_1",
            name: "search_products",
            input: { query: "tomatoes" },
          },
        ],
      })
      .mockResolvedValueOnce({
        stop_reason: "end_turn",
        content: [{ type: "text", text: "I found tomatoes for you." }],
      });

    const request = createChatRequest({ message: "Find tomatoes" });
    const response = await POST(request);
    const events = await parseSSEResponse(response);

    expect(mockExecuteTool).toHaveBeenCalledWith(
      "search_products",
      { query: "tomatoes" },
      { userId: mockUser.id, restaurantId: mockUser.restaurant.id }
    );

    const eventTypes = events.map((e) => e.event);
    expect(eventTypes).toContain("tool_call");
    expect(eventTypes).toContain("tool_result");
    expect(eventTypes).toContain("text");
    expect(eventTypes).toContain("done");
  });

  it("sends error SSE event on stream failure", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    prismaMock.conversation.create.mockResolvedValue(mockConversation as any);
    prismaMock.message.create.mockResolvedValue({} as any);
    mockAnthropicCreate.mockRejectedValue(new Error("API rate limited"));

    const request = createChatRequest({ message: "Hello" });
    const response = await POST(request);
    const events = await parseSSEResponse(response);

    const errorEvent = events.find((e) => e.event === "error");
    expect(errorEvent).toBeDefined();
    expect(errorEvent!.data.message).toBe("API rate limited");
  });
});
