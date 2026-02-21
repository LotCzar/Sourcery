import { describe, it, expect } from "vitest";
import { GET, PATCH } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import { mockSendEmail } from "@/__tests__/mocks/email";
import { mockInngestSend } from "@/__tests__/mocks/inngest";
import {
  createMockSupplierUserWithSupplier,
  createMockOrder,
  createMockOrderItem,
  createMockProduct,
} from "@/__tests__/fixtures";
import { createRequest, createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

const mockParams = { params: Promise.resolve({ id: "order_1" }) };

describe("GET /api/supplier/orders/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(
      createRequest("http://localhost/api/supplier/orders/order_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when order not found", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.order.findFirst.mockResolvedValueOnce(null);

    const response = await GET(
      createRequest("http://localhost/api/supplier/orders/order_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Order not found");
  });

  it("returns order with items and Decimal→Number conversion", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const order = {
      ...createMockOrder({ status: "PENDING" }),
      restaurant: {
        id: "rest_1",
        name: "Test Restaurant",
        address: "123 Main St",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
        phone: "512-555-0100",
        email: "info@test.com",
      },
      items: [
        {
          ...createMockOrderItem(),
          product: {
            id: "prod_1",
            name: "Tomatoes",
            category: "PRODUCE",
            unit: "POUND",
            price: new Decimal("4.99"),
          },
        },
      ],
      createdBy: {
        firstName: "John",
        lastName: "Doe",
        email: "john@test.com",
      },
    };
    prismaMock.order.findFirst.mockResolvedValueOnce(order as any);

    const response = await GET(
      createRequest("http://localhost/api/supplier/orders/order_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.data.subtotal).toBe("number");
    expect(typeof data.data.total).toBe("number");
    expect(typeof data.data.items[0].quantity).toBe("number");
    expect(typeof data.data.items[0].product.price).toBe("number");
  });
});

describe("PATCH /api/supplier/orders/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/orders/order_1", { action: "confirm" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when order not found", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.order.findFirst.mockResolvedValueOnce(null);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/orders/order_1", { action: "confirm" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Order not found");
  });

  it("confirm: PENDING → CONFIRMED", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const order = {
      ...createMockOrder({ status: "PENDING" }),
      restaurant: { name: "Test Restaurant", email: "info@test.com" },
    };
    prismaMock.order.findFirst.mockResolvedValueOnce(order as any);

    const updated = createMockOrder({ status: "CONFIRMED" });
    prismaMock.order.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/orders/order_1", { action: "confirm" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "CONFIRMED" },
      })
    );
  });

  it("confirm: returns 400 if not PENDING", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const order = {
      ...createMockOrder({ status: "SHIPPED" }),
      restaurant: { name: "Test Restaurant", email: "info@test.com" },
    };
    prismaMock.order.findFirst.mockResolvedValueOnce(order as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/orders/order_1", { action: "confirm" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Can only confirm pending orders");
  });

  it("ship: CONFIRMED → SHIPPED", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const order = {
      ...createMockOrder({ status: "CONFIRMED" }),
      restaurant: { name: "Test Restaurant", email: "info@test.com" },
    };
    prismaMock.order.findFirst.mockResolvedValueOnce(order as any);

    const updated = createMockOrder({ status: "SHIPPED" });
    prismaMock.order.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/orders/order_1", { action: "ship" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "SHIPPED" },
      })
    );
  });

  it("ship: returns 400 if not CONFIRMED", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const order = {
      ...createMockOrder({ status: "PENDING" }),
      restaurant: { name: "Test Restaurant", email: "info@test.com" },
    };
    prismaMock.order.findFirst.mockResolvedValueOnce(order as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/orders/order_1", { action: "ship" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Can only ship confirmed orders");
  });

  it("deliver: SHIPPED → DELIVERED with transaction", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const order = {
      ...createMockOrder({ status: "SHIPPED" }),
      restaurant: { name: "Test Restaurant", email: "info@test.com" },
    };
    prismaMock.order.findFirst.mockResolvedValueOnce(order as any);

    const deliveredOrder = createMockOrder({ status: "DELIVERED" });
    const invoice = {
      id: "inv_1",
      invoiceNumber: "INV-SUP1-00001",
    };

    // Mock the $transaction
    prismaMock.$transaction.mockImplementationOnce(async (fn: any) => {
      const tx = {
        order: {
          update: async () => deliveredOrder,
        },
        invoice: {
          findUnique: async () => null,
          count: async () => 0,
          create: async () => invoice,
        },
        user: {
          findFirst: async () => ({ id: "user_1" }),
        },
        notification: {
          create: async () => ({}),
        },
      };
      return fn(tx);
    });

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/orders/order_1", { action: "deliver" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("reject: PENDING → CANCELLED", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const order = {
      ...createMockOrder({ status: "PENDING" }),
      restaurant: { name: "Test Restaurant", email: "info@test.com" },
    };
    prismaMock.order.findFirst.mockResolvedValueOnce(order as any);

    const updated = createMockOrder({ status: "CANCELLED" });
    prismaMock.order.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/orders/order_1", { action: "reject" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(prismaMock.order.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: "CANCELLED" },
      })
    );
  });

  it("returns 400 for invalid action", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const order = {
      ...createMockOrder({ status: "PENDING" }),
      restaurant: { name: "Test Restaurant", email: "info@test.com" },
    };
    prismaMock.order.findFirst.mockResolvedValueOnce(order as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/orders/order_1", { action: "invalid" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Invalid action");
  });
});
