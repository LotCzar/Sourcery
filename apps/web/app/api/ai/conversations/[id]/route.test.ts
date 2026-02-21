import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUser,
  createMockConversation,
  createMockMessage,
} from "@/__tests__/fixtures";
import { createRequest, parseResponse } from "@/__tests__/helpers";
import { GET } from "./route";

const mockParams = { params: Promise.resolve({ id: "conv_1" }) };

describe("GET /api/ai/conversations/[id]", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(
      createRequest("http://localhost/api/ai/conversations/conv_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const response = await GET(
      createRequest("http://localhost/api/ai/conversations/conv_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("returns 404 when conversation not found", async () => {
    const user = createMockUser();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.conversation.findFirst.mockResolvedValueOnce(null);

    const response = await GET(
      createRequest("http://localhost/api/ai/conversations/conv_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Conversation not found");
  });

  it("returns conversation with messages and role lowercased", async () => {
    const user = createMockUser();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const conversation = {
      ...createMockConversation(),
      messages: [
        createMockMessage({ id: "msg_1", role: "USER", content: "Hello" }),
        createMockMessage({
          id: "msg_2",
          role: "ASSISTANT",
          content: "Hi there!",
        }),
      ],
    };
    prismaMock.conversation.findFirst.mockResolvedValueOnce(conversation as any);

    const response = await GET(
      createRequest("http://localhost/api/ai/conversations/conv_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.id).toBe("conv_1");
    expect(data.data.title).toBe("Test Conversation");
    expect(data.data.messages).toHaveLength(2);
    expect(data.data.messages[0].role).toBe("user");
    expect(data.data.messages[1].role).toBe("assistant");
  });

  it("includes optional tool fields when present", async () => {
    const user = createMockUser();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const conversation = {
      ...createMockConversation(),
      messages: [
        createMockMessage({
          id: "msg_tool",
          role: "ASSISTANT",
          content: "Using tool",
          toolName: "search_products",
          toolInput: '{"query":"tomatoes"}',
          toolResult: '{"results":[]}',
        }),
      ],
    };
    prismaMock.conversation.findFirst.mockResolvedValueOnce(conversation as any);

    const response = await GET(
      createRequest("http://localhost/api/ai/conversations/conv_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.messages[0].toolName).toBe("search_products");
    expect(data.data.messages[0].toolInput).toBe('{"query":"tomatoes"}');
    expect(data.data.messages[0].toolResult).toBe('{"results":[]}');
  });
});
