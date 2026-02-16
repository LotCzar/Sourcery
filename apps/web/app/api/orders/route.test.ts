import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUserWithRestaurant,
  createMockSupplier,
  createMockOrder,
  createMockOrderItem,
  createMockProduct,
} from "@/__tests__/fixtures";
import { createRequest, createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

describe("GET /api/orders", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(createRequest("http://localhost/api/orders"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when user has no restaurant", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockUserWithRestaurant(),
      restaurant: null,
    } as any);

    const response = await GET(createRequest("http://localhost/api/orders"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Restaurant not found");
  });

  it("returns formatted orders", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const product = createMockProduct();
    const orderItem = {
      ...createMockOrderItem(),
      product,
    };
    const order = {
      ...createMockOrder(),
      supplier: { id: "sup_1", name: "Test Supplier" },
      items: [orderItem],
    };
    prismaMock.order.findMany.mockResolvedValueOnce([order] as any);

    const response = await GET(createRequest("http://localhost/api/orders"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(typeof data.data[0].subtotal).toBe("number");
    expect(typeof data.data[0].items[0].unitPrice).toBe("number");
    expect(typeof data.data[0].items[0].product.price).toBe("number");
  });

  it("queries with correct restaurantId", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.order.findMany.mockResolvedValueOnce([]);

    await GET(createRequest("http://localhost/api/orders"));

    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { restaurantId: "rest_1" },
      })
    );
  });
});

describe("POST /api/orders", () => {
  const validBody = {
    items: [{ productId: "prod_1", quantity: 10 }],
    supplierId: "sup_1",
    deliveryNotes: "Back door",
  };

  beforeEach(() => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await POST(
      createJsonRequest("http://localhost/api/orders", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when items is missing", async () => {
    const response = await POST(
      createJsonRequest("http://localhost/api/orders", {
        supplierId: "sup_1",
      })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Order items are required");
  });

  it("returns 400 when items is empty", async () => {
    const response = await POST(
      createJsonRequest("http://localhost/api/orders", {
        items: [],
        supplierId: "sup_1",
      })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Order items are required");
  });

  it("returns 400 when supplierId is missing", async () => {
    const response = await POST(
      createJsonRequest("http://localhost/api/orders", {
        items: [{ productId: "prod_1", quantity: 10 }],
      })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Supplier ID is required");
  });

  it("returns 404 when supplier not found", async () => {
    prismaMock.supplier.findUnique.mockResolvedValueOnce(null);

    const response = await POST(
      createJsonRequest("http://localhost/api/orders", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Supplier not found");
  });

  it("creates order with correct price calculations", async () => {
    const supplier = createMockSupplier();
    prismaMock.supplier.findUnique.mockResolvedValueOnce(supplier as any);

    const product = createMockProduct({ price: new Decimal("5.00") });
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([product] as any);

    const createdOrder = {
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
            unitPrice: new Decimal("5.00"),
            subtotal: new Decimal("50.00"),
          }),
          product,
        },
      ],
    };
    prismaMock.order.create.mockResolvedValueOnce(createdOrder as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/orders", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.data.subtotal).toBe("number");
    expect(typeof data.data.total).toBe("number");
  });
});
