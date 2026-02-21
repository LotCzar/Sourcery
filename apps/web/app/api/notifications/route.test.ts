import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST, PATCH } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import { createMockUser, createMockNotification } from "@/__tests__/fixtures";
import {
  createRequest,
  createJsonRequest,
  parseResponse,
} from "@/__tests__/helpers";

describe("GET /api/notifications", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(
      createRequest("http://localhost/api/notifications")
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const response = await GET(
      createRequest("http://localhost/api/notifications")
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("returns notifications with unreadCount", async () => {
    const user = createMockUser();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const notifications = [
      createMockNotification(),
      createMockNotification({ id: "notif_2", isRead: true }),
    ];
    prismaMock.notification.findMany.mockResolvedValueOnce(
      notifications as any
    );
    prismaMock.notification.count.mockResolvedValueOnce(1);

    const response = await GET(
      createRequest("http://localhost/api/notifications")
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
    expect(data.unreadCount).toBe(1);
  });

  it("filters to unread only when unreadOnly=true", async () => {
    const user = createMockUser();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.notification.findMany.mockResolvedValueOnce([]);
    prismaMock.notification.count.mockResolvedValueOnce(0);

    await GET(
      createRequest("http://localhost/api/notifications?unreadOnly=true")
    );

    expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user_1", isRead: false },
      })
    );
  });

  it("returns empty array when no notifications", async () => {
    const user = createMockUser();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.notification.findMany.mockResolvedValueOnce([]);
    prismaMock.notification.count.mockResolvedValueOnce(0);

    const response = await GET(
      createRequest("http://localhost/api/notifications")
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data).toEqual([]);
    expect(data.unreadCount).toBe(0);
  });
});

describe("POST /api/notifications", () => {
  const validBody = {
    type: "ORDER_UPDATE",
    title: "Order Confirmed",
    message: "Your order has been confirmed.",
  };

  beforeEach(() => {
    const user = createMockUser();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await POST(
      createJsonRequest("http://localhost/api/notifications", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when validation fails (missing title)", async () => {
    const response = await POST(
      createJsonRequest("http://localhost/api/notifications", {
        type: "ORDER_UPDATE",
        message: "Some message",
      })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 when validation fails (missing message)", async () => {
    const response = await POST(
      createJsonRequest("http://localhost/api/notifications", {
        type: "ORDER_UPDATE",
        title: "Some title",
      })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("creates notification with correct type, title, message", async () => {
    const notification = createMockNotification();
    prismaMock.notification.create.mockResolvedValueOnce(notification as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/notifications", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "ORDER_UPDATE",
        title: "Order Confirmed",
        message: "Your order has been confirmed.",
        userId: "user_1",
      }),
    });
  });

  it("creates notification with optional metadata", async () => {
    const notification = createMockNotification({
      metadata: { orderId: "order_1" },
    });
    prismaMock.notification.create.mockResolvedValueOnce(notification as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/notifications", {
        ...validBody,
        metadata: { orderId: "order_1" },
      })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });
});

describe("PATCH /api/notifications (mark all read)", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await PATCH(
      createRequest("http://localhost/api/notifications", { method: "PATCH" })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const response = await PATCH(
      createRequest("http://localhost/api/notifications", { method: "PATCH" })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("calls updateMany with correct filter and data", async () => {
    const user = createMockUser();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.notification.updateMany.mockResolvedValueOnce({ count: 3 } as any);

    await PATCH(
      createRequest("http://localhost/api/notifications", { method: "PATCH" })
    );

    expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: "user_1", isRead: false },
      data: { isRead: true },
    });
  });

  it("returns success message", async () => {
    const user = createMockUser();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.notification.updateMany.mockResolvedValueOnce({ count: 2 } as any);

    const response = await PATCH(
      createRequest("http://localhost/api/notifications", { method: "PATCH" })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("All notifications marked as read");
  });
});
