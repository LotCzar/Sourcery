import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import { createMockUserWithRestaurant } from "@/__tests__/fixtures";
import { createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

function makeSupplierProduct(overrides?: Record<string, unknown>) {
  return {
    id: "sp_1",
    name: "Organic Tomatoes",
    price: new Decimal("4.99"),
    unit: "POUND",
    category: "PRODUCE",
    inStock: true,
    supplier: {
      id: "sup_1",
      name: "Farm Fresh",
      rating: new Decimal("4.5"),
      minimumOrder: new Decimal("50.00"),
      deliveryFee: new Decimal("10.00"),
      leadTimeDays: 2,
    },
    ...overrides,
  };
}

describe("POST /api/ingredients/match", () => {
  beforeEach(() => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await POST(
      createJsonRequest("http://localhost/api/ingredients/match", { ingredients: [] })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when ingredients is missing", async () => {
    const response = await POST(
      createJsonRequest("http://localhost/api/ingredients/match", {})
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Ingredients array is required");
  });

  it("returns 400 when ingredients is not an array", async () => {
    const response = await POST(
      createJsonRequest("http://localhost/api/ingredients/match", { ingredients: "not-array" })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Ingredients array is required");
  });

  it("scores exact match as 100", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([
      makeSupplierProduct({ name: "tomatoes" }),
    ] as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/ingredients/match", {
        ingredients: [{ name: "tomatoes", category: "OTHER", estimatedQuantity: "5", unit: "lb" }],
      })
    );
    const { data } = await parseResponse(response);

    expect(data.data.ingredients[0].matches[0].score).toBe(100);
  });

  it("scores product-contains-ingredient as 80", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([
      makeSupplierProduct({ name: "organic tomatoes fresh" }),
    ] as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/ingredients/match", {
        ingredients: [{ name: "organic tomatoes", category: "OTHER", estimatedQuantity: "5", unit: "lb" }],
      })
    );
    const { data } = await parseResponse(response);

    expect(data.data.ingredients[0].matches[0].score).toBe(80);
  });

  it("scores ingredient-contains-product as 70", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([
      makeSupplierProduct({ name: "tomato" }),
    ] as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/ingredients/match", {
        ingredients: [{ name: "fresh tomato sauce", category: "OTHER", estimatedQuantity: "5", unit: "lb" }],
      })
    );
    const { data } = await parseResponse(response);

    expect(data.data.ingredients[0].matches[0].score).toBe(70);
  });

  it("scores word overlap proportionally * 60", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([
      makeSupplierProduct({ name: "red bell pepper" }),
    ] as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/ingredients/match", {
        ingredients: [{ name: "red onion", category: "OTHER", estimatedQuantity: "2", unit: "each" }],
      })
    );
    const { data } = await parseResponse(response);

    // "red" matches, "onion" doesn't → 1/2 * 60 = 30
    expect(data.data.ingredients[0].matches[0].score).toBe(30);
  });

  it("adds category boost of +10", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([
      makeSupplierProduct({ name: "tomatoes", category: "PRODUCE" }),
    ] as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/ingredients/match", {
        ingredients: [{ name: "tomatoes", category: "PRODUCE", estimatedQuantity: "5", unit: "lb" }],
      })
    );
    const { data } = await parseResponse(response);

    // exact match (100) + category boost (10) = 110
    expect(data.data.ingredients[0].matches[0].score).toBe(110);
  });

  it("excludes products with score <= 20", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([
      makeSupplierProduct({ name: "completely unrelated product xyz" }),
    ] as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/ingredients/match", {
        ingredients: [{ name: "tomatoes", category: "OTHER", estimatedQuantity: "5", unit: "lb" }],
      })
    );
    const { data } = await parseResponse(response);

    expect(data.data.ingredients[0].matches).toHaveLength(0);
  });

  it("sorts by score desc then price asc", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([
      makeSupplierProduct({ id: "sp_1", name: "tomatoes", price: new Decimal("5.00") }),
      makeSupplierProduct({ id: "sp_2", name: "tomatoes", price: new Decimal("3.00"), supplier: { id: "sup_2", name: "Cheap Farms", rating: new Decimal("4.0"), minimumOrder: new Decimal("25.00"), deliveryFee: new Decimal("5.00"), leadTimeDays: 1 } }),
      makeSupplierProduct({ id: "sp_3", name: "organic tomatoes fresh", price: new Decimal("2.00") }),
    ] as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/ingredients/match", {
        ingredients: [{ name: "tomatoes", category: "OTHER", estimatedQuantity: "5", unit: "lb" }],
      })
    );
    const { data } = await parseResponse(response);
    const matches = data.data.ingredients[0].matches;

    // Two exact matches (score 100) should come first, sorted by price
    expect(Number(matches[0].product.price)).toBeLessThanOrEqual(Number(matches[1].product.price));
    expect(matches[0].score).toBeGreaterThanOrEqual(matches[1].score);
    // The "organic tomatoes fresh" is a contains match (80), should come after
    expect(matches[2].score).toBe(80);
  });

  it("caps matches at 5 per ingredient", async () => {
    const products = Array.from({ length: 8 }, (_, i) =>
      makeSupplierProduct({
        id: `sp_${i}`,
        name: "tomatoes",
        price: new Decimal(`${i + 1}.00`),
        supplier: {
          id: `sup_${i}`,
          name: `Supplier ${i}`,
          rating: new Decimal("4.0"),
          minimumOrder: new Decimal("25.00"),
          deliveryFee: new Decimal("5.00"),
          leadTimeDays: 1,
        },
      })
    );
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce(products as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/ingredients/match", {
        ingredients: [{ name: "tomatoes", category: "OTHER", estimatedQuantity: "5", unit: "lb" }],
      })
    );
    const { data } = await parseResponse(response);

    expect(data.data.ingredients[0].matches).toHaveLength(5);
  });

  it("bestMatch is first match or null", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([
      makeSupplierProduct({ name: "tomatoes" }),
    ] as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/ingredients/match", {
        ingredients: [{ name: "tomatoes", category: "OTHER", estimatedQuantity: "5", unit: "lb" }],
      })
    );
    const { data } = await parseResponse(response);

    expect(data.data.ingredients[0].bestMatch).toEqual(data.data.ingredients[0].matches[0]);
  });

  it("bestMatch is null when no matches", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([
      makeSupplierProduct({ name: "completely unrelated xyz" }),
    ] as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/ingredients/match", {
        ingredients: [{ name: "tomatoes", category: "OTHER", estimatedQuantity: "5", unit: "lb" }],
      })
    );
    const { data } = await parseResponse(response);

    expect(data.data.ingredients[0].bestMatch).toBeNull();
  });

  it("calculates matched and unmatched counts", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([
      makeSupplierProduct({ name: "tomatoes" }),
    ] as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/ingredients/match", {
        ingredients: [
          { name: "tomatoes", category: "OTHER", estimatedQuantity: "5", unit: "lb" },
          { name: "xyz_unmatched_item_999", category: "OTHER", estimatedQuantity: "2", unit: "each" },
        ],
      })
    );
    const { data } = await parseResponse(response);

    expect(data.data.summary.matched).toBe(1);
    expect(data.data.summary.unmatched).toBe(1);
    expect(data.data.summary.total).toBe(2);
  });

  it("counts unique suppliers", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([
      makeSupplierProduct({ id: "sp_1", name: "tomatoes", supplier: { id: "sup_1", name: "Farm A", rating: new Decimal("4.0"), minimumOrder: new Decimal("25.00"), deliveryFee: new Decimal("5.00"), leadTimeDays: 1 } }),
      makeSupplierProduct({ id: "sp_2", name: "organic lettuce", supplier: { id: "sup_2", name: "Farm B", rating: new Decimal("4.5"), minimumOrder: new Decimal("30.00"), deliveryFee: new Decimal("8.00"), leadTimeDays: 2 } }),
      makeSupplierProduct({ id: "sp_3", name: "fresh tomato", supplier: { id: "sup_1", name: "Farm A", rating: new Decimal("4.0"), minimumOrder: new Decimal("25.00"), deliveryFee: new Decimal("5.00"), leadTimeDays: 1 } }),
    ] as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/ingredients/match", {
        ingredients: [
          { name: "tomatoes", category: "OTHER", estimatedQuantity: "5", unit: "lb" },
          { name: "lettuce", category: "OTHER", estimatedQuantity: "2", unit: "head" },
        ],
      })
    );
    const { data } = await parseResponse(response);

    expect(data.data.summary.suppliersFound).toBe(2);
  });

  it("handles empty ingredients array", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([] as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/ingredients/match", { ingredients: [] })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.ingredients).toHaveLength(0);
    expect(data.data.summary.total).toBe(0);
    expect(data.data.summary.matched).toBe(0);
    expect(data.data.summary.unmatched).toBe(0);
    expect(data.data.summary.suppliersFound).toBe(0);
  });

  it("returns ingredient info in response", async () => {
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([] as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/ingredients/match", {
        ingredients: [{ name: "tomatoes", category: "PRODUCE", estimatedQuantity: "5", unit: "lb" }],
      })
    );
    const { data } = await parseResponse(response);

    expect(data.data.ingredients[0].ingredient).toEqual({
      name: "tomatoes",
      category: "PRODUCE",
      estimatedQuantity: "5",
      unit: "lb",
    });
  });
});
