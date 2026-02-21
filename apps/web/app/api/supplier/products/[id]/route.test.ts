import { describe, it, expect } from "vitest";
import { GET, PATCH, DELETE } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockSupplierUserWithSupplier,
  createMockProduct,
} from "@/__tests__/fixtures";
import { createRequest, createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

const mockParams = { params: Promise.resolve({ id: "prod_1" }) };

describe("GET /api/supplier/products/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(
      createRequest("http://localhost/api/supplier/products/prod_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when product not found", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.supplierProduct.findFirst.mockResolvedValueOnce(null);

    const response = await GET(
      createRequest("http://localhost/api/supplier/products/prod_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Product not found");
  });

  it("returns product with price history", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const product = {
      ...createMockProduct(),
      priceHistory: [
        { id: "ph_1", price: new Decimal("4.99"), recordedAt: new Date() },
      ],
    };
    prismaMock.supplierProduct.findFirst.mockResolvedValueOnce(product as any);

    const response = await GET(
      createRequest("http://localhost/api/supplier/products/prod_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.data.price).toBe("number");
    expect(data.data.priceHistory).toHaveLength(1);
    expect(typeof data.data.priceHistory[0].price).toBe("number");
  });
});

describe("PATCH /api/supplier/products/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/products/prod_1", { name: "New Name" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when product not found", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.supplierProduct.findFirst.mockResolvedValueOnce(null);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/products/prod_1", { name: "New Name" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Product not found");
  });

  it("updates product fields", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const existing = createMockProduct();
    prismaMock.supplierProduct.findFirst.mockResolvedValueOnce(existing as any);

    const updated = createMockProduct({ name: "Updated Tomatoes" });
    prismaMock.supplierProduct.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/products/prod_1", { name: "Updated Tomatoes" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });

  it("tracks price change in PriceHistory when price changes", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const existing = createMockProduct({ price: new Decimal("4.99") });
    prismaMock.supplierProduct.findFirst.mockResolvedValueOnce(existing as any);

    prismaMock.priceHistory.create.mockResolvedValueOnce({} as any);

    const updated = createMockProduct({ price: new Decimal("5.99") });
    prismaMock.supplierProduct.update.mockResolvedValueOnce(updated as any);

    await PATCH(
      createJsonRequest("http://localhost/api/supplier/products/prod_1", { price: "5.99" }, "PATCH"),
      mockParams
    );

    expect(prismaMock.priceHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: "prod_1",
          price: 5.99,
        }),
      })
    );
  });

  it("returns updated product with Decimal→Number", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const existing = createMockProduct();
    prismaMock.supplierProduct.findFirst.mockResolvedValueOnce(existing as any);

    const updated = createMockProduct({
      price: new Decimal("6.99"),
      packSize: new Decimal("10"),
    });
    prismaMock.supplierProduct.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/products/prod_1", { name: "Updated" }, "PATCH"),
      mockParams
    );
    const { data } = await parseResponse(response);

    expect(typeof data.data.price).toBe("number");
    expect(typeof data.data.packSize).toBe("number");
  });
});

describe("DELETE /api/supplier/products/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await DELETE(
      createRequest("http://localhost/api/supplier/products/prod_1", { method: "DELETE" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when product not found", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.supplierProduct.findFirst.mockResolvedValueOnce(null);

    const response = await DELETE(
      createRequest("http://localhost/api/supplier/products/prod_1", { method: "DELETE" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Product not found");
  });

  it("returns 400 when product has been ordered", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const product = createMockProduct();
    prismaMock.supplierProduct.findFirst.mockResolvedValueOnce(product as any);
    prismaMock.orderItem.count.mockResolvedValueOnce(5);

    const response = await DELETE(
      createRequest("http://localhost/api/supplier/products/prod_1", { method: "DELETE" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toContain("Cannot delete product");
  });

  it("deletes product successfully when no orders", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const product = createMockProduct();
    prismaMock.supplierProduct.findFirst.mockResolvedValueOnce(product as any);
    prismaMock.orderItem.count.mockResolvedValueOnce(0);
    prismaMock.priceHistory.deleteMany.mockResolvedValueOnce({ count: 1 } as any);
    prismaMock.supplierProduct.delete.mockResolvedValueOnce(product as any);

    const response = await DELETE(
      createRequest("http://localhost/api/supplier/products/prod_1", { method: "DELETE" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Product deleted");
  });
});
