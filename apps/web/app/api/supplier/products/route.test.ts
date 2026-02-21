import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockSupplierUserWithSupplier,
  createMockProduct,
} from "@/__tests__/fixtures";
import { createRequest, createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

describe("GET /api/supplier/products", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(createRequest("http://localhost/api/supplier/products"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when supplier not found", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockSupplierUserWithSupplier(),
      supplier: null,
    } as any);

    const response = await GET(createRequest("http://localhost/api/supplier/products"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Supplier not found");
  });

  it("returns products with Decimal→Number conversion", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const product = createMockProduct({ packSize: new Decimal("12") });
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([product] as any);

    const response = await GET(createRequest("http://localhost/api/supplier/products"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(typeof data.data[0].price).toBe("number");
    expect(typeof data.data[0].packSize).toBe("number");
  });

  it("filters by category query param", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([]);

    await GET(createRequest("http://localhost/api/supplier/products?category=PRODUCE"));

    expect(prismaMock.supplierProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: "PRODUCE",
        }),
      })
    );
  });

  it("returns empty array when no products", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([]);

    const response = await GET(createRequest("http://localhost/api/supplier/products"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data).toEqual([]);
  });
});

describe("POST /api/supplier/products", () => {
  const validBody = {
    name: "Fresh Salmon",
    category: "SEAFOOD",
    price: "12.99",
    unit: "POUND",
  };

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await POST(
      createJsonRequest("http://localhost/api/supplier/products", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when missing required fields", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/supplier/products", {
        name: "Salmon",
      })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toContain("Missing required fields");
  });

  it("creates product with correct data", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const created = createMockProduct({
      name: "Fresh Salmon",
      category: "SEAFOOD",
      price: new Decimal("12.99"),
      unit: "POUND",
    });
    prismaMock.supplierProduct.create.mockResolvedValueOnce(created as any);
    prismaMock.priceHistory.create.mockResolvedValueOnce({} as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/supplier/products", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.supplierProduct.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          supplierId: "sup_1",
          name: "Fresh Salmon",
          category: "SEAFOOD",
        }),
      })
    );
  });

  it("creates PriceHistory entry on creation", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const created = createMockProduct({ price: new Decimal("12.99") });
    prismaMock.supplierProduct.create.mockResolvedValueOnce(created as any);
    prismaMock.priceHistory.create.mockResolvedValueOnce({} as any);

    await POST(
      createJsonRequest("http://localhost/api/supplier/products", validBody)
    );

    expect(prismaMock.priceHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          productId: created.id,
          price: created.price,
        }),
      })
    );
  });

  it("returns created product with Decimal→Number", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const created = createMockProduct({
      price: new Decimal("12.99"),
      packSize: new Decimal("5"),
    });
    prismaMock.supplierProduct.create.mockResolvedValueOnce(created as any);
    prismaMock.priceHistory.create.mockResolvedValueOnce({} as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/supplier/products", validBody)
    );
    const { data } = await parseResponse(response);

    expect(typeof data.data.price).toBe("number");
    expect(typeof data.data.packSize).toBe("number");
  });
});
