import "./setup";
import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "./mocks/prisma";
import { mockInngestSend } from "./mocks/inngest";
import {
  createMockUser,
  createMockUserWithRestaurant,
  createMockOrder,
  createMockOrderMessage,
  createMockSupplierUser,
  createMockSupplierUserWithSupplier,
  createMockSupplier,
  createMockRestaurant,
} from "./fixtures";
import { createRequest, createJsonRequest, parseResponse } from "./helpers";

// ---- helpers ----

function mockRestaurantUser() {
  const user = {
    ...createMockUserWithRestaurant(),
    supplier: null,
  };
  prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
  return user;
}

function mockSupplierUser() {
  const user = {
    ...createMockSupplierUserWithSupplier(),
    restaurant: null,
  };
  prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
  return user;
}

function mockOrderAccess(overrides?: Record<string, unknown>) {
  const order = {
    ...createMockOrder(),
    restaurant: { name: "Test Restaurant" },
    supplier: { name: "Test Supplier" },
    ...overrides,
  };
  prismaMock.order.findFirst.mockResolvedValueOnce(order as any);
  return order;
}

function senderSelect(user: Record<string, unknown>) {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    role: user.role,
  };
}

// ---- test suites ----

describe("Order Messages API", () => {
  let GET: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;
  let POST: (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/orders/[id]/messages/route");
    GET = mod.GET;
    POST = mod.POST;
  });

  const params = { params: Promise.resolve({ id: "order_1" }) };

  // 1. Restaurant user can send a message
  it("restaurant user can send a message", async () => {
    const user = mockRestaurantUser();
    mockOrderAccess();

    const createdMsg = {
      ...createMockOrderMessage({ content: "Hello from restaurant" }),
      sender: senderSelect(user),
    };
    prismaMock.orderMessage.create.mockResolvedValueOnce(createdMsg as any);

    const req = createJsonRequest(
      "http://localhost/api/orders/order_1/messages",
      { content: "Hello from restaurant" }
    );
    const res = await POST(req, params);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.content).toBe("Hello from restaurant");
    expect(prismaMock.orderMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: "Hello from restaurant",
          orderId: "order_1",
          senderId: user.id,
          isInternal: false,
        }),
      })
    );
  });

  // 2. Supplier user can send a message
  it("supplier user can send a message", async () => {
    const user = mockSupplierUser();
    mockOrderAccess();

    const createdMsg = {
      ...createMockOrderMessage({
        id: "omsg_2",
        content: "Delivery scheduled for tomorrow",
        senderId: user.id,
      }),
      sender: senderSelect(user),
    };
    prismaMock.orderMessage.create.mockResolvedValueOnce(createdMsg as any);

    const req = createJsonRequest(
      "http://localhost/api/orders/order_1/messages",
      { content: "Delivery scheduled for tomorrow" }
    );
    const res = await POST(req, params);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(201);
    expect(data.success).toBe(true);
    expect(data.data.content).toBe("Delivery scheduled for tomorrow");
  });

  // 3. Internal messages hidden from supplier users
  it("internal messages are hidden from supplier users", async () => {
    mockSupplierUser();
    mockOrderAccess();

    // Return only non-internal messages (the route filters isInternal: false for supplier users)
    const externalMsg = {
      ...createMockOrderMessage({ id: "omsg_ext", content: "External message", isInternal: false }),
      sender: senderSelect(createMockUser()),
    };
    prismaMock.orderMessage.findMany.mockResolvedValueOnce([externalMsg] as any);
    prismaMock.orderMessage.updateMany.mockResolvedValueOnce({ count: 1 });

    const req = createRequest("http://localhost/api/orders/order_1/messages");
    const res = await GET(req, params);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].content).toBe("External message");

    // Verify the query included isInternal: false filter
    expect(prismaMock.orderMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orderId: "order_1",
          isInternal: false,
        }),
      })
    );
  });

  // 4. Only order participants can view/send messages
  it("returns 404 when user is not an order participant", async () => {
    // User exists but has a different restaurant
    const user = {
      ...createMockUser({ restaurantId: "rest_other" }),
      restaurant: createMockRestaurant({ id: "rest_other" }),
      supplier: null,
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    // Order findFirst returns null (no match for rest_other)
    prismaMock.order.findFirst.mockResolvedValueOnce(null);

    const req = createRequest("http://localhost/api/orders/order_1/messages");
    const res = await GET(req, params);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(404);
    expect(data.error).toBe("Order not found");
  });

  // 5. Messages are returned in chronological order
  it("messages are returned in chronological order", async () => {
    mockRestaurantUser();
    mockOrderAccess();

    const msg1 = {
      ...createMockOrderMessage({
        id: "omsg_1",
        content: "First message",
        createdAt: new Date("2024-01-01T10:00:00Z"),
      }),
      sender: senderSelect(createMockUser()),
    };
    const msg2 = {
      ...createMockOrderMessage({
        id: "omsg_2",
        content: "Second message",
        createdAt: new Date("2024-01-01T11:00:00Z"),
      }),
      sender: senderSelect(createMockUser()),
    };
    const msg3 = {
      ...createMockOrderMessage({
        id: "omsg_3",
        content: "Third message",
        createdAt: new Date("2024-01-01T12:00:00Z"),
      }),
      sender: senderSelect(createMockUser()),
    };

    prismaMock.orderMessage.findMany.mockResolvedValueOnce([msg1, msg2, msg3] as any);
    prismaMock.orderMessage.updateMany.mockResolvedValueOnce({ count: 0 });

    const req = createRequest("http://localhost/api/orders/order_1/messages");
    const res = await GET(req, params);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.data).toHaveLength(3);
    expect(data.data[0].content).toBe("First message");
    expect(data.data[1].content).toBe("Second message");
    expect(data.data[2].content).toBe("Third message");

    // Verify orderBy was specified as ascending
    expect(prismaMock.orderMessage.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "asc" },
      })
    );
  });

  // 7. Reading messages marks them as read
  it("reading messages marks them as read via updateMany", async () => {
    const user = mockRestaurantUser();
    mockOrderAccess();

    const msg = {
      ...createMockOrderMessage({
        senderId: "other_user",
        readAt: null,
      }),
      sender: senderSelect(createMockUser({ id: "other_user" })),
    };
    prismaMock.orderMessage.findMany.mockResolvedValueOnce([msg] as any);
    prismaMock.orderMessage.updateMany.mockResolvedValueOnce({ count: 1 });

    const req = createRequest("http://localhost/api/orders/order_1/messages");
    await GET(req, params);

    expect(prismaMock.orderMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          orderId: "order_1",
          senderId: { not: user.id },
          readAt: null,
        }),
        data: expect.objectContaining({
          readAt: expect.any(Date),
        }),
      })
    );
  });

  // 8. Send message creates notification (inngest event emitted)
  it("sending a non-internal message emits an inngest notification event", async () => {
    const user = mockRestaurantUser();
    mockOrderAccess();

    const createdMsg = {
      ...createMockOrderMessage({ content: "Please confirm delivery" }),
      sender: senderSelect(user),
    };
    prismaMock.orderMessage.create.mockResolvedValueOnce(createdMsg as any);

    const req = createJsonRequest(
      "http://localhost/api/orders/order_1/messages",
      { content: "Please confirm delivery" }
    );
    await POST(req, params);

    expect(mockInngestSend).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "order/message.sent",
        data: expect.objectContaining({
          orderId: "order_1",
          messageId: createdMsg.id,
          senderId: user.id,
          messagePreview: "Please confirm delivery",
          isSupplierSender: false,
        }),
      })
    );
  });
});

// ---- Unread count suite ----

describe("GET /api/messages/unread", () => {
  let getUnread: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/messages/unread/route");
    getUnread = mod.GET;
  });

  // 6. Unread count returns correct number
  it("returns correct unread count for restaurant user", async () => {
    const user = {
      ...createMockUserWithRestaurant(),
      supplier: null,
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.orderMessage.count.mockResolvedValueOnce(5);

    const req = createRequest("http://localhost/api/messages/unread");
    const res = await getUnread(req);
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.unreadCount).toBe(5);

    expect(prismaMock.orderMessage.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          order: { restaurantId: user.restaurant.id },
          senderId: { not: user.id },
          readAt: null,
        }),
      })
    );
  });
});
