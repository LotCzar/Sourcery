import { describe, it, expect } from "vitest";
import { GET } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import { createMockProduct, createMockSupplier } from "@/__tests__/fixtures";
import { createRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

describe("GET /api/products", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(
      createRequest("http://localhost/api/products")
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns formatted products with numeric prices", async () => {
    const supplier = createMockSupplier();
    const product = {
      ...createMockProduct({ price: new Decimal("4.99") }),
      supplier: {
        id: supplier.id,
        name: supplier.name,
        rating: supplier.rating,
        minimumOrder: supplier.minimumOrder,
        deliveryFee: supplier.deliveryFee,
        leadTimeDays: supplier.leadTimeDays,
      },
    };

    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([product] as any);
    prismaMock.supplierProduct.groupBy.mockResolvedValueOnce([
      { category: "PRODUCE", _count: { category: 1 } },
    ] as any);
    prismaMock.supplier.findMany.mockResolvedValueOnce([
      { id: "sup_1", name: "Test Supplier", _count: { products: 1 } },
    ] as any);

    const response = await GET(
      createRequest("http://localhost/api/products")
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.products).toHaveLength(1);
    expect(typeof data.data.products[0].price).toBe("number");
    expect(data.data.products[0].price).toBe(4.99);
  });

  it("passes search filter to Prisma", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([]);
    prismaMock.supplierProduct.groupBy.mockResolvedValueOnce([] as any);
    prismaMock.supplier.findMany.mockResolvedValueOnce([]);

    await GET(
      createRequest("http://localhost/api/products?search=tomato")
    );

    expect(prismaMock.supplierProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { contains: "tomato", mode: "insensitive" } },
            { description: { contains: "tomato", mode: "insensitive" } },
          ],
        }),
      })
    );
  });

  it("passes category filter to Prisma", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([]);
    prismaMock.supplierProduct.groupBy.mockResolvedValueOnce([] as any);
    prismaMock.supplier.findMany.mockResolvedValueOnce([]);

    await GET(
      createRequest("http://localhost/api/products?category=PRODUCE")
    );

    expect(prismaMock.supplierProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: "PRODUCE",
        }),
      })
    );
  });

  it("passes inStock filter to Prisma", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([]);
    prismaMock.supplierProduct.groupBy.mockResolvedValueOnce([] as any);
    prismaMock.supplier.findMany.mockResolvedValueOnce([]);

    await GET(
      createRequest("http://localhost/api/products?inStock=true")
    );

    expect(prismaMock.supplierProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          inStock: true,
        }),
      })
    );
  });

  it("applies price_asc sort order", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([]);
    prismaMock.supplierProduct.groupBy.mockResolvedValueOnce([] as any);
    prismaMock.supplier.findMany.mockResolvedValueOnce([]);

    await GET(
      createRequest("http://localhost/api/products?sort=price_asc")
    );

    expect(prismaMock.supplierProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { price: "asc" },
      })
    );
  });
});
