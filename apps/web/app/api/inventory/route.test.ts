import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUserWithRestaurant,
  createMockInventoryItem,
  createMockProduct,
  createMockSupplier,
} from "@/__tests__/fixtures";
import { createRequest, createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

describe("GET /api/inventory", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(createRequest("http://localhost/api/inventory"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when user has no restaurant", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockUserWithRestaurant(),
      restaurant: null,
    } as any);

    const response = await GET(createRequest("http://localhost/api/inventory"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Restaurant not found");
  });

  it("returns inventory items with Decimal-to-Number conversion", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const item = {
      ...createMockInventoryItem(),
      supplierProduct: null,
      logs: [],
    };
    prismaMock.inventoryItem.findMany.mockResolvedValueOnce([item] as any);

    const response = await GET(createRequest("http://localhost/api/inventory"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(typeof data.data[0].currentQuantity).toBe("number");
    expect(typeof data.data[0].parLevel).toBe("number");
    expect(typeof data.data[0].costPerUnit).toBe("number");
    expect(data.data[0].currentQuantity).toBe(50);
  });

  it("returns summary stats", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const items = [
      {
        ...createMockInventoryItem({ currentQuantity: new Decimal("50"), parLevel: new Decimal("20"), costPerUnit: new Decimal("4.99") }),
        supplierProduct: null,
        logs: [],
      },
      {
        ...createMockInventoryItem({ id: "inv_item_2", currentQuantity: new Decimal("5"), parLevel: new Decimal("10"), costPerUnit: new Decimal("2.00") }),
        supplierProduct: null,
        logs: [],
      },
      {
        ...createMockInventoryItem({ id: "inv_item_3", currentQuantity: new Decimal("0"), parLevel: new Decimal("10"), costPerUnit: new Decimal("3.00") }),
        supplierProduct: null,
        logs: [],
      },
    ];
    prismaMock.inventoryItem.findMany.mockResolvedValueOnce(items as any);

    const response = await GET(createRequest("http://localhost/api/inventory"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.summary.totalItems).toBe(3);
    expect(data.summary.lowStockCount).toBe(2); // item2 (5<=10) and item3 (0<=10)
    expect(data.summary.outOfStockCount).toBe(1); // item3 (0<=0)
    expect(data.summary.totalValue).toBeCloseTo(50 * 4.99 + 5 * 2 + 0 * 3);
  });

  it("filters by category query param", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.inventoryItem.findMany.mockResolvedValueOnce([]);

    await GET(createRequest("http://localhost/api/inventory?category=PRODUCE"));

    expect(prismaMock.inventoryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { restaurantId: "rest_1", category: "PRODUCE" },
      })
    );
  });

  it("does not filter when category is 'all'", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.inventoryItem.findMany.mockResolvedValueOnce([]);

    await GET(createRequest("http://localhost/api/inventory?category=all"));

    expect(prismaMock.inventoryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { restaurantId: "rest_1" },
      })
    );
  });

  it("filters low stock items when lowStock=true", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const items = [
      {
        ...createMockInventoryItem({ currentQuantity: new Decimal("50"), parLevel: new Decimal("20") }),
        supplierProduct: null,
        logs: [],
      },
      {
        ...createMockInventoryItem({ id: "inv_item_2", currentQuantity: new Decimal("5"), parLevel: new Decimal("10") }),
        supplierProduct: null,
        logs: [],
      },
    ];
    prismaMock.inventoryItem.findMany.mockResolvedValueOnce(items as any);

    const response = await GET(createRequest("http://localhost/api/inventory?lowStock=true"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    // Only item2 should be returned (5 <= 10), item1 is above par (50 > 20)
    expect(data.data).toHaveLength(1);
    expect(data.data[0].currentQuantity).toBe(5);
  });

  it("returns empty array when no items", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.inventoryItem.findMany.mockResolvedValueOnce([]);

    const response = await GET(createRequest("http://localhost/api/inventory"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data).toHaveLength(0);
    expect(data.summary.totalItems).toBe(0);
  });

  it("includes supplier product info when linked", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const item = {
      ...createMockInventoryItem(),
      supplierProduct: {
        id: "prod_1",
        name: "Organic Tomatoes",
        price: new Decimal("4.99"),
        supplier: { id: "sup_1", name: "Test Supplier" },
      },
      logs: [],
    };
    prismaMock.inventoryItem.findMany.mockResolvedValueOnce([item] as any);

    const response = await GET(createRequest("http://localhost/api/inventory"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data[0].supplierProduct).not.toBeNull();
    expect(data.data[0].supplierProduct.name).toBe("Organic Tomatoes");
    expect(typeof data.data[0].supplierProduct.price).toBe("number");
    expect(data.data[0].supplierProduct.supplier.name).toBe("Test Supplier");
  });
});

describe("POST /api/inventory", () => {
  const validBody = {
    name: "Fresh Basil",
    category: "PRODUCE",
    currentQuantity: 25,
    unit: "BUNCH",
  };

  beforeEach(() => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await POST(
      createJsonRequest("http://localhost/api/inventory", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when validation fails", async () => {
    const response = await POST(
      createJsonRequest("http://localhost/api/inventory", { name: "" })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("creates item with correct data", async () => {
    const createdItem = {
      ...createMockInventoryItem({ name: "Fresh Basil", category: "PRODUCE", currentQuantity: new Decimal("25"), unit: "BUNCH" }),
    };
    prismaMock.inventoryItem.create.mockResolvedValueOnce(createdItem as any);
    prismaMock.inventoryLog.create.mockResolvedValueOnce({} as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/inventory", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.inventoryItem.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Fresh Basil",
          category: "PRODUCE",
          currentQuantity: 25,
          unit: "BUNCH",
          restaurantId: "rest_1",
        }),
      })
    );
  });

  it("creates initial inventory log when currentQuantity > 0", async () => {
    const createdItem = createMockInventoryItem({ currentQuantity: new Decimal("25") });
    prismaMock.inventoryItem.create.mockResolvedValueOnce(createdItem as any);
    prismaMock.inventoryLog.create.mockResolvedValueOnce({} as any);

    await POST(createJsonRequest("http://localhost/api/inventory", validBody));

    expect(prismaMock.inventoryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          inventoryItemId: createdItem.id,
          changeType: "RECEIVED",
          quantity: 25,
          previousQuantity: 0,
          newQuantity: 25,
          notes: "Initial inventory",
        }),
      })
    );
  });

  it("does NOT create log when currentQuantity is 0", async () => {
    const createdItem = createMockInventoryItem({ currentQuantity: new Decimal("0") });
    prismaMock.inventoryItem.create.mockResolvedValueOnce(createdItem as any);

    await POST(
      createJsonRequest("http://localhost/api/inventory", {
        ...validBody,
        currentQuantity: 0,
      })
    );

    expect(prismaMock.inventoryLog.create).not.toHaveBeenCalled();
  });

  it("returns created item with Decimal-to-Number conversion", async () => {
    const createdItem = createMockInventoryItem({
      name: "Fresh Basil",
      currentQuantity: new Decimal("25"),
    });
    prismaMock.inventoryItem.create.mockResolvedValueOnce(createdItem as any);
    prismaMock.inventoryLog.create.mockResolvedValueOnce({} as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/inventory", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(typeof data.data.currentQuantity).toBe("number");
    expect(data.data.currentQuantity).toBe(25);
  });
});
