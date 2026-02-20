import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUser,
  createMockConversation,
} from "@/__tests__/fixtures";
import { GET, DELETE } from "./route";

describe("GET /api/ai/conversations", () => {
  const mockUser = createMockUser();

  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
  });

  it("should return conversations for the authenticated user", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    prismaMock.conversation.findMany.mockResolvedValue([
      {
        ...createMockConversation(),
        _count: { messages: 5 },
      },
      {
        ...createMockConversation({ id: "conv_2", title: "Second Chat" }),
        _count: { messages: 3 },
      },
    ] as any);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.data[0].messageCount).toBe(5);
  });

  it("should return 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 if user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("User not found");
  });
});

describe("DELETE /api/ai/conversations", () => {
  const mockUser = createMockUser();

  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
  });

  it("should delete a conversation", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    prismaMock.conversation.findFirst.mockResolvedValue(
      createMockConversation() as any
    );
    prismaMock.conversation.delete.mockResolvedValue({} as any);

    const request = new Request("http://localhost/api/ai/conversations", {
      method: "DELETE",
      body: JSON.stringify({ conversationId: "conv_1" }),
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("should return 400 if conversationId missing", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

    const request = new Request("http://localhost/api/ai/conversations", {
      method: "DELETE",
      body: JSON.stringify({}),
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Conversation ID is required");
  });

  it("should return 404 if conversation not found", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    prismaMock.conversation.findFirst.mockResolvedValue(null);

    const request = new Request("http://localhost/api/ai/conversations", {
      method: "DELETE",
      body: JSON.stringify({ conversationId: "nonexistent" }),
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Conversation not found");
  });

  it("should return 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const request = new Request("http://localhost/api/ai/conversations", {
      method: "DELETE",
      body: JSON.stringify({ conversationId: "conv_1" }),
    });

    const response = await DELETE(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });
});
