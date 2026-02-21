import { describe, it, expect } from "vitest";
import { GET } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUserWithRestaurant,
  createMockProduct,
  createMockSupplier,
  createMockOrder,
} from "@/__tests__/fixtures";
import { createRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

describe("GET /api/search", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(createRequest("http://localhost/api/search?q=tomato"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns empty results when query is missing", async () => {
    const response = await GET(createRequest("http://localhost/api/search"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.products).toEqual([]);
    expect(data.data.suppliers).toEqual([]);
    expect(data.data.orders).toEqual([]);
  });

  it("returns empty results when query is too short", async () => {
    const response = await GET(createRequest("http://localhost/api/search?q=a"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.products).toEqual([]);
    expect(data.data.suppliers).toEqual([]);
    expect(data.data.orders).toEqual([]);
  });

  it("returns products matching search term", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const product = {
      ...createMockProduct(),
      supplier: { id: "sup_1", name: "Test Supplier" },
    };
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([product] as any);
    prismaMock.supplier.findMany.mockResolvedValueOnce([]);
    prismaMock.order.findMany.mockResolvedValueOnce([]);

    const response = await GET(createRequest("http://localhost/api/search?q=tomato"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.products).toHaveLength(1);
    expect(data.data.products[0].name).toBe("Organic Tomatoes");
    expect(typeof data.data.products[0].price).toBe("number");
  });

  it("returns suppliers matching search term", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([]);
    prismaMock.supplier.findMany.mockResolvedValueOnce([
      {
        id: "sup_1",
        name: "Test Supplier",
        city: "Austin",
        state: "TX",
        _count: { products: 5 },
      },
    ] as any);
    prismaMock.order.findMany.mockResolvedValueOnce([]);

    const response = await GET(createRequest("http://localhost/api/search?q=test"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.suppliers).toHaveLength(1);
    expect(data.data.suppliers[0].name).toBe("Test Supplier");
    expect(data.data.suppliers[0].location).toBe("Austin, TX");
    expect(data.data.suppliers[0].productCount).toBe(5);
  });

  it("returns orders matching search term", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([]);
    prismaMock.supplier.findMany.mockResolvedValueOnce([]);
    prismaMock.order.findMany.mockResolvedValueOnce([
      {
        ...createMockOrder(),
        supplier: { id: "sup_1", name: "Test Supplier" },
        _count: { items: 3 },
      },
    ] as any);

    const response = await GET(createRequest("http://localhost/api/search?q=ORD"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.orders).toHaveLength(1);
    expect(data.data.orders[0].orderNumber).toBe("ORD-TEST-001");
    expect(typeof data.data.orders[0].total).toBe("number");
    expect(data.data.orders[0].itemCount).toBe(3);
  });

  it("returns results from all three tables in parallel", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const product = {
      ...createMockProduct(),
      supplier: { id: "sup_1", name: "Test Supplier" },
    };
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([product] as any);
    prismaMock.supplier.findMany.mockResolvedValueOnce([
      {
        id: "sup_1",
        name: "Test Supplier",
        city: "Austin",
        state: "TX",
        _count: { products: 5 },
      },
    ] as any);
    prismaMock.order.findMany.mockResolvedValueOnce([
      {
        ...createMockOrder(),
        supplier: { id: "sup_1", name: "Test Supplier" },
        _count: { items: 2 },
      },
    ] as any);

    const response = await GET(createRequest("http://localhost/api/search?q=test"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.products).toHaveLength(1);
    expect(data.data.suppliers).toHaveLength(1);
    expect(data.data.orders).toHaveLength(1);
    expect(data.query).toBe("test");
  });

  it("returns 404 when user has no restaurant", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockUserWithRestaurant(),
      restaurant: null,
    } as any);

    // Must provide a valid query so it doesn't short-circuit
    const response = await GET(createRequest("http://localhost/api/search?q=tomato"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Restaurant not found");
  });
});
