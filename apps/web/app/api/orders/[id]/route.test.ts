import { describe, it, expect, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import { mockSendEmail, mockEmailTemplates } from "@/__tests__/mocks/email";
import {
  createMockUserWithRestaurant,
  createMockOrder,
  createMockOrderItem,
  createMockProduct,
  createMockSupplier,
} from "@/__tests__/fixtures";
import { createRequest, createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

const mockParams = { params: Promise.resolve({ id: "order_1" }) };

describe("PATCH /api/orders/[id]", () => {
  beforeEach(() => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  describe("submit action", () => {
    it("transitions DRAFT to PENDING", async () => {
      const order = {
        ...createMockOrder({ status: "DRAFT" }),
        supplier: createMockSupplier(),
      };
      prismaMock.order.findFirst.mockResolvedValueOnce(order as any);
      prismaMock.approvalRule.findMany.mockResolvedValueOnce([]);

      const updatedOrder = createMockOrder({
        status: "PENDING",
        deliveryDate: new Date(),
      });
      prismaMock.order.update.mockResolvedValueOnce(updatedOrder as any);

      const response = await PATCH(
        createJsonRequest("http://localhost/api/orders/order_1", {
          action: "submit",
        }),
        mockParams
      );
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(prismaMock.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PENDING" }),
        })
      );
    });

    it("rejects non-DRAFT orders", async () => {
      const order = {
        ...createMockOrder({ status: "PENDING" }),
        supplier: createMockSupplier(),
      };
      prismaMock.order.findFirst.mockResolvedValueOnce(order as any);

      const response = await PATCH(
        createJsonRequest("http://localhost/api/orders/order_1", {
          action: "submit",
        }),
        mockParams
      );
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe("Can only submit draft orders");
    });

    it("rejects submit when supplier is SUSPENDED", async () => {
      const order = {
        ...createMockOrder({ status: "DRAFT" }),
        supplier: createMockSupplier({ status: "SUSPENDED" }),
      };
      prismaMock.order.findFirst.mockResolvedValueOnce(order as any);

      const response = await PATCH(
        createJsonRequest("http://localhost/api/orders/order_1", {
          action: "submit",
        }),
        mockParams
      );
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe("Cannot submit order: supplier is suspended");
    });

    it("rejects submit when supplier is INACTIVE", async () => {
      const order = {
        ...createMockOrder({ status: "DRAFT" }),
        supplier: createMockSupplier({ status: "INACTIVE" }),
      };
      prismaMock.order.findFirst.mockResolvedValueOnce(order as any);

      const response = await PATCH(
        createJsonRequest("http://localhost/api/orders/order_1", {
          action: "submit",
        }),
        mockParams
      );
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe("Cannot submit order: supplier is inactive");
    });

    it("rejects submit when subtotal < minimumOrder", async () => {
      const order = {
        ...createMockOrder({ status: "DRAFT", subtotal: new Decimal("30.00") }),
        supplier: createMockSupplier({ minimumOrder: new Decimal("50.00") }),
      };
      prismaMock.order.findFirst.mockResolvedValueOnce(order as any);

      const response = await PATCH(
        createJsonRequest("http://localhost/api/orders/order_1", {
          action: "submit",
        }),
        mockParams
      );
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toContain("below supplier minimum");
    });

    it("allows submit when subtotal equals minimumOrder", async () => {
      const order = {
        ...createMockOrder({ status: "DRAFT", subtotal: new Decimal("50.00") }),
        supplier: createMockSupplier({ minimumOrder: new Decimal("50.00") }),
      };
      prismaMock.order.findFirst.mockResolvedValueOnce(order as any);
      prismaMock.approvalRule.findMany.mockResolvedValueOnce([]);

      const updatedOrder = createMockOrder({ status: "PENDING" });
      prismaMock.order.update.mockResolvedValueOnce(updatedOrder as any);

      const response = await PATCH(
        createJsonRequest("http://localhost/api/orders/order_1", {
          action: "submit",
        }),
        mockParams
      );
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("allows submit when supplier has no minimumOrder", async () => {
      const order = {
        ...createMockOrder({ status: "DRAFT", subtotal: new Decimal("10.00") }),
        supplier: createMockSupplier({ minimumOrder: null }),
      };
      prismaMock.order.findFirst.mockResolvedValueOnce(order as any);
      prismaMock.approvalRule.findMany.mockResolvedValueOnce([]);

      const updatedOrder = createMockOrder({ status: "PENDING" });
      prismaMock.order.update.mockResolvedValueOnce(updatedOrder as any);

      const response = await PATCH(
        createJsonRequest("http://localhost/api/orders/order_1", {
          action: "submit",
        }),
        mockParams
      );
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("sends email to supplier", async () => {
      const supplier = createMockSupplier({ email: "supplier@test.com" });
      const order = {
        ...createMockOrder({ status: "DRAFT" }),
        supplier,
      };
      prismaMock.order.findFirst.mockResolvedValueOnce(order as any);
      prismaMock.approvalRule.findMany.mockResolvedValueOnce([]);

      const updatedOrder = createMockOrder({ status: "PENDING" });
      prismaMock.order.update.mockResolvedValueOnce(updatedOrder as any);

      await PATCH(
        createJsonRequest("http://localhost/api/orders/order_1", {
          action: "submit",
        }),
        mockParams
      );

      expect(mockEmailTemplates.orderPlaced).toHaveBeenCalled();
      expect(mockSendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: "supplier@test.com",
        })
      );
    });
  });

  describe("cancel action", () => {
    it("cancels DRAFT orders", async () => {
      const order = {
        ...createMockOrder({ status: "DRAFT" }),
        supplier: createMockSupplier(),
      };
      prismaMock.order.findFirst.mockResolvedValueOnce(order as any);

      const updatedOrder = createMockOrder({ status: "CANCELLED" });
      prismaMock.order.update.mockResolvedValueOnce(updatedOrder as any);

      const response = await PATCH(
        createJsonRequest("http://localhost/api/orders/order_1", {
          action: "cancel",
        }),
        mockParams
      );
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
    });

    it("cancels PENDING orders", async () => {
      const order = {
        ...createMockOrder({ status: "PENDING" }),
        supplier: createMockSupplier(),
      };
      prismaMock.order.findFirst.mockResolvedValueOnce(order as any);

      const updatedOrder = createMockOrder({ status: "CANCELLED" });
      prismaMock.order.update.mockResolvedValueOnce(updatedOrder as any);

      const response = await PATCH(
        createJsonRequest("http://localhost/api/orders/order_1", {
          action: "cancel",
        }),
        mockParams
      );
      const { status } = await parseResponse(response);

      expect(status).toBe(200);
    });

    it("rejects CONFIRMED orders", async () => {
      const order = {
        ...createMockOrder({ status: "CONFIRMED" }),
        supplier: createMockSupplier(),
      };
      prismaMock.order.findFirst.mockResolvedValueOnce(order as any);

      const response = await PATCH(
        createJsonRequest("http://localhost/api/orders/order_1", {
          action: "cancel",
        }),
        mockParams
      );
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe("Can only cancel draft, awaiting approval, or pending orders");
    });
  });

  describe("invalid action", () => {
    it("returns 400 for unknown action", async () => {
      const order = {
        ...createMockOrder(),
        supplier: createMockSupplier(),
      };
      prismaMock.order.findFirst.mockResolvedValueOnce(order as any);

      const response = await PATCH(
        createJsonRequest("http://localhost/api/orders/order_1", {
          action: "invalid_action",
        }),
        mockParams
      );
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe("Validation failed");
    });
  });
});

describe("DELETE /api/orders/[id]", () => {
  beforeEach(() => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await DELETE(
      createRequest("http://localhost/api/orders/order_1", { method: "DELETE" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("deletes DRAFT orders (items first)", async () => {
    const order = createMockOrder({ status: "DRAFT" });
    prismaMock.order.findFirst.mockResolvedValueOnce(order as any);
    prismaMock.orderItem.deleteMany.mockResolvedValueOnce({ count: 1 } as any);
    prismaMock.order.delete.mockResolvedValueOnce(order as any);

    const response = await DELETE(
      createRequest("http://localhost/api/orders/order_1", { method: "DELETE" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Order deleted");
    expect(prismaMock.orderItem.deleteMany).toHaveBeenCalledWith({
      where: { orderId: "order_1" },
    });
    expect(prismaMock.order.delete).toHaveBeenCalledWith({
      where: { id: "order_1" },
    });
  });

  it("rejects non-DRAFT orders", async () => {
    const order = createMockOrder({ status: "PENDING" });
    prismaMock.order.findFirst.mockResolvedValueOnce(order as any);

    const response = await DELETE(
      createRequest("http://localhost/api/orders/order_1", { method: "DELETE" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Can only delete draft orders");
  });
});
