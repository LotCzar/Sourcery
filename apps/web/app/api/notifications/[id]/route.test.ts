import { describe, it, expect, beforeEach } from "vitest";
import { PATCH, DELETE } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import { createMockUser, createMockNotification } from "@/__tests__/fixtures";
import { createJsonRequest, createRequest, parseResponse } from "@/__tests__/helpers";

const mockParams = { params: Promise.resolve({ id: "notif_1" }) };

describe("PATCH /api/notifications/[id]", () => {
  beforeEach(() => {
    const user = createMockUser();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await PATCH(
      createJsonRequest("http://localhost/api/notifications/notif_1", {}, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when notification not found", async () => {
    prismaMock.notification.findFirst.mockResolvedValueOnce(null);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/notifications/notif_1", {}, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Notification not found");
  });

  it("marks notification as read (defaults isRead to true)", async () => {
    const notification = createMockNotification();
    prismaMock.notification.findFirst.mockResolvedValueOnce(notification as any);

    const updated = createMockNotification({ isRead: true });
    prismaMock.notification.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/notifications/notif_1", {}, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.notification.update).toHaveBeenCalledWith({
      where: { id: "notif_1" },
      data: { isRead: true },
    });
  });

  it("sets explicit isRead: false to mark as unread", async () => {
    const notification = createMockNotification({ isRead: true });
    prismaMock.notification.findFirst.mockResolvedValueOnce(notification as any);

    const updated = createMockNotification({ isRead: false });
    prismaMock.notification.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest(
        "http://localhost/api/notifications/notif_1",
        { isRead: false },
        "PATCH"
      ),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(prismaMock.notification.update).toHaveBeenCalledWith({
      where: { id: "notif_1" },
      data: { isRead: false },
    });
  });
});

describe("DELETE /api/notifications/[id]", () => {
  beforeEach(() => {
    const user = createMockUser();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await DELETE(
      createRequest("http://localhost/api/notifications/notif_1", {
        method: "DELETE",
      }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when notification not found", async () => {
    prismaMock.notification.findFirst.mockResolvedValueOnce(null);

    const response = await DELETE(
      createRequest("http://localhost/api/notifications/notif_1", {
        method: "DELETE",
      }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Notification not found");
  });

  it("returns 404 when notification belongs to different user", async () => {
    // findFirst checks userId match, so null means not found for this user
    prismaMock.notification.findFirst.mockResolvedValueOnce(null);

    const response = await DELETE(
      createRequest("http://localhost/api/notifications/notif_1", {
        method: "DELETE",
      }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Notification not found");
  });

  it("deletes notification successfully", async () => {
    const notification = createMockNotification();
    prismaMock.notification.findFirst.mockResolvedValueOnce(notification as any);
    prismaMock.notification.delete.mockResolvedValueOnce(notification as any);

    const response = await DELETE(
      createRequest("http://localhost/api/notifications/notif_1", {
        method: "DELETE",
      }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Notification deleted");
    expect(prismaMock.notification.delete).toHaveBeenCalledWith({
      where: { id: "notif_1" },
    });
  });
});
