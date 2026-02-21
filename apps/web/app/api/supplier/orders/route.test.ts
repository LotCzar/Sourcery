import { describe, it, expect } from "vitest";
import { GET } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockSupplierUserWithSupplier,
  createMockOrder,
  createMockOrderItem,
  createMockProduct,
} from "@/__tests__/fixtures";
import { createRequest, parseResponse } from "@/__tests__/helpers";

describe("GET /api/supplier/orders", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(createRequest("http://localhost/api/supplier/orders"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when supplier not found", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockSupplierUserWithSupplier(),
      supplier: null,
    } as any);

    const response = await GET(createRequest("http://localhost/api/supplier/orders"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Supplier not found");
  });

  it("returns orders with Decimal→Number conversion", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const order = {
      ...createMockOrder({ status: "PENDING" }),
      restaurant: { id: "rest_1", name: "Test Restaurant" },
      items: [
        {
          ...createMockOrderItem(),
          product: { id: "prod_1", name: "Tomatoes", category: "PRODUCE", unit: "POUND" },
        },
      ],
      _count: { items: 1 },
    };
    prismaMock.order.findMany.mockResolvedValueOnce([order] as any);

    const response = await GET(createRequest("http://localhost/api/supplier/orders"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(typeof data.data[0].subtotal).toBe("number");
    expect(typeof data.data[0].total).toBe("number");
    expect(typeof data.data[0].items[0].quantity).toBe("number");
    expect(typeof data.data[0].items[0].unitPrice).toBe("number");
  });

  it("filters by status query param", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.order.findMany.mockResolvedValueOnce([]);

    await GET(createRequest("http://localhost/api/supplier/orders?status=PENDING"));

    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PENDING",
        }),
      })
    );
  });

  it("excludes DRAFT orders by default", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.order.findMany.mockResolvedValueOnce([]);

    await GET(createRequest("http://localhost/api/supplier/orders"));

    expect(prismaMock.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: { not: "DRAFT" },
        }),
      })
    );
  });

  it("returns empty when no orders", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.order.findMany.mockResolvedValueOnce([]);

    const response = await GET(createRequest("http://localhost/api/supplier/orders"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data).toEqual([]);
  });
});
