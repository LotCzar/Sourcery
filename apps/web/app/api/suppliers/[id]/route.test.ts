import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import { createMockSupplier, createMockProduct } from "@/__tests__/fixtures";
import { createRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";
import { GET } from "./route";

const mockParams = { params: Promise.resolve({ id: "sup_1" }) };

describe("GET /api/suppliers/[id]", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(
      createRequest("http://localhost/api/suppliers/sup_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when supplier not found", async () => {
    prismaMock.supplier.findUnique.mockResolvedValueOnce(null);

    const response = await GET(
      createRequest("http://localhost/api/suppliers/sup_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Supplier not found");
  });

  it("returns supplier with products and Decimal-to-Number conversion", async () => {
    const supplier = {
      ...createMockSupplier(),
      products: [
        {
          ...createMockProduct(),
          packSize: new Decimal("5"),
        },
      ],
      _count: { products: 1 },
    };
    prismaMock.supplier.findUnique.mockResolvedValueOnce(supplier as any);

    const response = await GET(
      createRequest("http://localhost/api/suppliers/sup_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe("Test Supplier");
    expect(typeof data.data.minimumOrder).toBe("number");
    expect(typeof data.data.deliveryFee).toBe("number");
    expect(typeof data.data.rating).toBe("number");
    expect(typeof data.data.products[0].price).toBe("number");
    expect(typeof data.data.products[0].packSize).toBe("number");
    expect(data.data._count.products).toBe(1);
  });

  it("handles null optional Decimal fields", async () => {
    const supplier = {
      ...createMockSupplier({
        minimumOrder: null,
        deliveryFee: null,
        rating: null,
      }),
      products: [
        {
          ...createMockProduct(),
          packSize: null,
        },
      ],
      _count: { products: 1 },
    };
    prismaMock.supplier.findUnique.mockResolvedValueOnce(supplier as any);

    const response = await GET(
      createRequest("http://localhost/api/suppliers/sup_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.minimumOrder).toBeNull();
    expect(data.data.deliveryFee).toBeNull();
    expect(data.data.rating).toBeNull();
    expect(data.data.products[0].packSize).toBeNull();
  });
});
