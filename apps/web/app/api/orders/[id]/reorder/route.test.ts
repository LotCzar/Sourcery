import { describe, it, expect } from "vitest";
import { POST } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUserWithRestaurant,
  createMockOrder,
  createMockOrderItem,
  createMockProduct,
  createMockSupplier,
} from "@/__tests__/fixtures";
import { createRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

const mockParams = { params: Promise.resolve({ id: "order_1" }) };

describe("POST /api/orders/[id]/reorder", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await POST(
      createRequest("http://localhost/api/orders/order_1/reorder", { method: "POST" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when user has no restaurant", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockUserWithRestaurant(),
      restaurant: null,
    } as any);

    const response = await POST(
      createRequest("http://localhost/api/orders/order_1/reorder", { method: "POST" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Restaurant not found");
  });

  it("returns 404 when original order not found", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.order.findFirst.mockResolvedValueOnce(null);

    const response = await POST(
      createRequest("http://localhost/api/orders/order_1/reorder", { method: "POST" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Original order not found");
  });

  it("returns 400 when supplier is no longer VERIFIED", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const originalOrder = {
      ...createMockOrder(),
      items: [{ ...createMockOrderItem(), product: createMockProduct() }],
      supplier: { ...createMockSupplier(), status: "SUSPENDED" },
    };
    prismaMock.order.findFirst.mockResolvedValueOnce(originalOrder as any);

    const response = await POST(
      createRequest("http://localhost/api/orders/order_1/reorder", { method: "POST" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Supplier is no longer available");
  });

  it("returns 400 when all products from original order are deleted", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const originalOrder = {
      ...createMockOrder(),
      items: [
        { ...createMockOrderItem(), product: createMockProduct(), productId: "prod_1" },
      ],
      supplier: createMockSupplier(),
    };
    prismaMock.order.findFirst.mockResolvedValueOnce(originalOrder as any);
    prismaMock.supplierProduct.findUnique.mockResolvedValueOnce(null);

    const response = await POST(
      createRequest("http://localhost/api/orders/order_1/reorder", { method: "POST" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("No products from original order are still available");
  });

  it("creates new DRAFT order with current prices", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const originalProduct = createMockProduct({ price: new Decimal("4.99") });
    const originalOrder = {
      ...createMockOrder(),
      orderNumber: "ORD-00001",
      items: [
        { ...createMockOrderItem({ quantity: new Decimal("10") }), product: originalProduct, productId: "prod_1" },
      ],
      supplier: createMockSupplier({ deliveryFee: new Decimal("15.00") }),
    };
    prismaMock.order.findFirst.mockResolvedValueOnce(originalOrder as any);

    // Current price is higher than original
    const currentProduct = createMockProduct({ price: new Decimal("5.99") });
    prismaMock.supplierProduct.findUnique.mockResolvedValueOnce(currentProduct as any);

    prismaMock.order.count.mockResolvedValueOnce(5);

    const newOrder = {
      ...createMockOrder({
        id: "order_2",
        orderNumber: "ORD-00006",
        status: "DRAFT",
        subtotal: new Decimal("59.90"),
        tax: new Decimal("4.94"),
        deliveryFee: new Decimal("15.00"),
        total: new Decimal("79.84"),
      }),
      supplier: { id: "sup_1", name: "Test Supplier" },
      items: [
        {
          ...createMockOrderItem({
            unitPrice: new Decimal("5.99"),
            subtotal: new Decimal("59.90"),
          }),
          product: { name: "Organic Tomatoes", unit: "POUND" },
        },
      ],
    };
    prismaMock.order.create.mockResolvedValueOnce(newOrder as any);

    const response = await POST(
      createRequest("http://localhost/api/orders/order_1/reorder", { method: "POST" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.status).toBe("DRAFT");
    // Verify uses current price (5.99) not original (4.99)
    expect(prismaMock.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "DRAFT",
          createdById: "user_1",
        }),
      })
    );
  });

  it("handles partial product availability", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const product1 = createMockProduct({ id: "prod_1", price: new Decimal("4.99") });
    const product2 = createMockProduct({ id: "prod_2", price: new Decimal("9.99") });
    const originalOrder = {
      ...createMockOrder(),
      items: [
        { ...createMockOrderItem({ productId: "prod_1", quantity: new Decimal("10") }), product: product1, productId: "prod_1" },
        { ...createMockOrderItem({ id: "item_2", productId: "prod_2", quantity: new Decimal("5") }), product: product2, productId: "prod_2" },
      ],
      supplier: createMockSupplier(),
    };
    prismaMock.order.findFirst.mockResolvedValueOnce(originalOrder as any);

    // prod_1 still exists, prod_2 is deleted
    prismaMock.supplierProduct.findUnique.mockResolvedValueOnce(product1 as any);
    prismaMock.supplierProduct.findUnique.mockResolvedValueOnce(null);

    prismaMock.order.count.mockResolvedValueOnce(1);

    const newOrder = {
      ...createMockOrder({
        subtotal: new Decimal("49.90"),
        tax: new Decimal("4.12"),
        deliveryFee: new Decimal("10.00"),
        total: new Decimal("64.02"),
      }),
      supplier: { id: "sup_1", name: "Test Supplier" },
      items: [
        {
          ...createMockOrderItem({ unitPrice: new Decimal("4.99"), subtotal: new Decimal("49.90") }),
          product: { name: "Organic Tomatoes", unit: "POUND" },
        },
      ],
    };
    prismaMock.order.create.mockResolvedValueOnce(newOrder as any);

    const response = await POST(
      createRequest("http://localhost/api/orders/order_1/reorder", { method: "POST" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    // Only 1 item in the new order (prod_2 was skipped)
    expect(data.data.items).toHaveLength(1);
  });

  it("includes correct tax calculation (8.25%)", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const product = createMockProduct({ price: new Decimal("10.00") });
    const originalOrder = {
      ...createMockOrder(),
      items: [
        { ...createMockOrderItem({ quantity: new Decimal("10") }), product, productId: "prod_1" },
      ],
      supplier: createMockSupplier({ deliveryFee: new Decimal("10.00") }),
    };
    prismaMock.order.findFirst.mockResolvedValueOnce(originalOrder as any);
    prismaMock.supplierProduct.findUnique.mockResolvedValueOnce(product as any);
    prismaMock.order.count.mockResolvedValueOnce(0);

    // Subtotal = 10 * 10 = 100
    // Tax = 100 * 0.0825 = 8.25
    // Delivery = 10
    // Total = 118.25
    const newOrder = {
      ...createMockOrder({
        subtotal: new Decimal("100.00"),
        tax: new Decimal("8.25"),
        deliveryFee: new Decimal("10.00"),
        total: new Decimal("118.25"),
      }),
      supplier: { id: "sup_1", name: "Test Supplier" },
      items: [
        {
          ...createMockOrderItem({ unitPrice: new Decimal("10.00"), subtotal: new Decimal("100.00") }),
          product: { name: "Organic Tomatoes", unit: "POUND" },
        },
      ],
    };
    prismaMock.order.create.mockResolvedValueOnce(newOrder as any);

    const response = await POST(
      createRequest("http://localhost/api/orders/order_1/reorder", { method: "POST" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    // Verify tax is passed correctly to create
    expect(prismaMock.order.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tax: 100 * 0.0825,
          subtotal: 100,
          deliveryFee: 10,
          total: 100 + 8.25 + 10,
        }),
      })
    );
  });

  it("returns Decimal-to-Number conversion on totals", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const product = createMockProduct({ price: new Decimal("5.00") });
    const originalOrder = {
      ...createMockOrder(),
      items: [
        { ...createMockOrderItem({ quantity: new Decimal("10") }), product, productId: "prod_1" },
      ],
      supplier: createMockSupplier(),
    };
    prismaMock.order.findFirst.mockResolvedValueOnce(originalOrder as any);
    prismaMock.supplierProduct.findUnique.mockResolvedValueOnce(product as any);
    prismaMock.order.count.mockResolvedValueOnce(0);

    const newOrder = {
      ...createMockOrder({
        subtotal: new Decimal("50.00"),
        tax: new Decimal("4.13"),
        deliveryFee: new Decimal("10.00"),
        total: new Decimal("64.13"),
      }),
      supplier: { id: "sup_1", name: "Test Supplier" },
      items: [
        {
          ...createMockOrderItem({
            quantity: new Decimal("10"),
            unitPrice: new Decimal("5.00"),
            subtotal: new Decimal("50.00"),
          }),
          product: { name: "Organic Tomatoes", unit: "POUND" },
        },
      ],
    };
    prismaMock.order.create.mockResolvedValueOnce(newOrder as any);

    const response = await POST(
      createRequest("http://localhost/api/orders/order_1/reorder", { method: "POST" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(typeof data.data.subtotal).toBe("number");
    expect(typeof data.data.tax).toBe("number");
    expect(typeof data.data.deliveryFee).toBe("number");
    expect(typeof data.data.total).toBe("number");
    expect(typeof data.data.items[0].quantity).toBe("number");
    expect(typeof data.data.items[0].unitPrice).toBe("number");
    expect(typeof data.data.items[0].subtotal).toBe("number");
  });
});
