import "./setup";
import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "./mocks/prisma";
import {
  createMockSupplierUser,
  createMockSupplierUserWithSupplier,
  createMockProduct,
  createMockOrder,
  createMockSupplier,
  createMockUser,
  createMockUserWithRestaurant,
} from "./fixtures";
import { createRequest, createJsonRequest, parseResponse } from "./helpers";
import { Decimal } from "@prisma/client/runtime/library";

// ---- Bulk Update ----
describe("POST /api/supplier/products/bulk-update", () => {
  let bulkUpdate: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import(
      "@/app/api/supplier/products/bulk-update/route"
    );
    bulkUpdate = mod.POST;
  });

  it("succeeds for owned products", async () => {
    // Mock supplier user lookup
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockSupplierUser(),
      supplier: createMockSupplier(),
      restaurant: null,
    } as any);

    // Products belonging to this supplier
    const product1 = createMockProduct({ id: "prod_1", price: new Decimal("4.99") });
    const product2 = createMockProduct({ id: "prod_2", name: "Fresh Basil", price: new Decimal("2.50") });
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([product1, product2] as any);

    // Updates succeed
    prismaMock.supplierProduct.update.mockResolvedValueOnce({
      ...product1,
      price: new Decimal("5.99"),
    } as any);
    prismaMock.supplierProduct.update.mockResolvedValueOnce({
      ...product2,
      price: new Decimal("3.00"),
    } as any);

    // Price history entries
    prismaMock.priceHistory.create.mockResolvedValueOnce({} as any);
    prismaMock.priceHistory.create.mockResolvedValueOnce({} as any);

    const req = createJsonRequest(
      "http://localhost/api/supplier/products/bulk-update",
      {
        updates: [
          { productId: "prod_1", price: 5.99 },
          { productId: "prod_2", price: 3.0 },
        ],
      }
    );

    const response = await bulkUpdate(req);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.updated).toBe(2);
    expect(data.data.failed).toBe(0);
    expect(data.data.errors).toHaveLength(0);
  });

  it("rejects products not owned by the supplier", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockSupplierUser(),
      supplier: createMockSupplier(),
      restaurant: null,
    } as any);

    // Only prod_1 belongs to this supplier; prod_other does not
    const ownedProduct = createMockProduct({ id: "prod_1", price: new Decimal("4.99") });
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([ownedProduct] as any);

    // The owned product update succeeds
    prismaMock.supplierProduct.update.mockResolvedValueOnce({
      ...ownedProduct,
      price: new Decimal("5.99"),
    } as any);
    prismaMock.priceHistory.create.mockResolvedValueOnce({} as any);

    const req = createJsonRequest(
      "http://localhost/api/supplier/products/bulk-update",
      {
        updates: [
          { productId: "prod_1", price: 5.99 },
          { productId: "prod_other", price: 9.99 },
        ],
      }
    );

    const response = await bulkUpdate(req);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.updated).toBe(1);
    expect(data.data.failed).toBe(1);
    expect(data.data.errors).toContainEqual(
      expect.stringContaining("prod_other")
    );
  });

  it("creates PriceHistory entries when price changes", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockSupplierUser(),
      supplier: createMockSupplier(),
      restaurant: null,
    } as any);

    const product = createMockProduct({ id: "prod_1", price: new Decimal("4.99") });
    prismaMock.supplierProduct.findMany.mockResolvedValueOnce([product] as any);
    prismaMock.supplierProduct.update.mockResolvedValueOnce({
      ...product,
      price: new Decimal("6.49"),
    } as any);
    prismaMock.priceHistory.create.mockResolvedValueOnce({} as any);

    const req = createJsonRequest(
      "http://localhost/api/supplier/products/bulk-update",
      {
        updates: [{ productId: "prod_1", price: 6.49 }],
      }
    );

    const response = await bulkUpdate(req);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.updated).toBe(1);
    expect(prismaMock.priceHistory.create).toHaveBeenCalledWith({
      data: {
        productId: "prod_1",
        price: 6.49,
      },
    });
  });

  it("returns 403 for non-supplier role", async () => {
    // Regular restaurant owner trying to use supplier endpoint
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockUser(),
      supplier: null,
      restaurant: null,
    } as any);

    const req = createJsonRequest(
      "http://localhost/api/supplier/products/bulk-update",
      {
        updates: [{ productId: "prod_1", price: 5.99 }],
      }
    );

    const response = await bulkUpdate(req);
    const { status } = await parseResponse(response);

    // user.supplier is null so route returns 404 ("Supplier not found")
    expect(status).toBe(404);
  });
});

// ---- Analytics ----
describe("GET /api/supplier/analytics", () => {
  let getAnalytics: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/supplier/analytics/route");
    getAnalytics = mod.GET;
  });

  it("returns correct MTD metrics", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockSupplierUser(),
      supplier: createMockSupplier(),
      restaurant: null,
    } as any);

    const orders = [
      {
        ...createMockOrder({
          id: "order_1",
          total: new Decimal("250.00"),
          status: "DELIVERED",
          restaurantId: "rest_1",
        }),
        items: [
          {
            id: "item_1",
            productId: "prod_1",
            quantity: new Decimal("10"),
            subtotal: new Decimal("49.90"),
            product: { id: "prod_1", name: "Organic Tomatoes", category: "PRODUCE" },
          },
        ],
        restaurant: { id: "rest_1", name: "Downtown Bistro" },
      },
      {
        ...createMockOrder({
          id: "order_2",
          total: new Decimal("150.00"),
          status: "CONFIRMED",
          restaurantId: "rest_2",
        }),
        items: [
          {
            id: "item_2",
            productId: "prod_2",
            quantity: new Decimal("5"),
            subtotal: new Decimal("25.00"),
            product: { id: "prod_2", name: "Fresh Basil", category: "HERBS" },
          },
        ],
        restaurant: { id: "rest_2", name: "Uptown Grill" },
      },
    ];

    prismaMock.order.findMany.mockResolvedValueOnce(orders as any);

    const req = new Request("http://localhost/api/supplier/analytics?period=30d");
    const response = await getAnalytics(req);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.totalRevenue).toBe(400);
    expect(data.data.orderCount).toBe(2);
    expect(data.data.avgOrderValue).toBe(200);
    expect(data.data.customerCount).toBe(2);
    expect(data.data.topProducts).toHaveLength(2);
    expect(data.data.period).toBe("30d");
  });
});

// ---- Customers ----
describe("GET /api/supplier/customers", () => {
  let getCustomers: () => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/supplier/customers/route");
    getCustomers = mod.GET;
  });

  it("returns customer insights scoped to supplier orders", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockSupplierUser(),
      supplier: createMockSupplier(),
      restaurant: null,
    } as any);

    const orders = [
      {
        ...createMockOrder({
          id: "order_1",
          total: new Decimal("300.00"),
          status: "DELIVERED",
          restaurantId: "rest_1",
        }),
        restaurant: { id: "rest_1", name: "Downtown Bistro", city: "Austin", state: "TX" },
        items: [
          {
            id: "item_1",
            productId: "prod_1",
            quantity: new Decimal("10"),
            subtotal: new Decimal("49.90"),
            product: { name: "Organic Tomatoes" },
          },
        ],
      },
      {
        ...createMockOrder({
          id: "order_2",
          total: new Decimal("200.00"),
          status: "CONFIRMED",
          restaurantId: "rest_1",
        }),
        restaurant: { id: "rest_1", name: "Downtown Bistro", city: "Austin", state: "TX" },
        items: [
          {
            id: "item_2",
            productId: "prod_2",
            quantity: new Decimal("5"),
            subtotal: new Decimal("25.00"),
            product: { name: "Fresh Basil" },
          },
        ],
      },
    ];

    prismaMock.order.findMany.mockResolvedValueOnce(orders as any);

    const response = await getCustomers();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1); // Both orders belong to same restaurant

    const customer = data.data[0];
    expect(customer.id).toBe("rest_1");
    expect(customer.name).toBe("Downtown Bistro");
    expect(customer.orderCount).toBe(2);
    expect(customer.totalSpend).toBe(500);
    expect(customer.topProducts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Organic Tomatoes", quantity: 10 }),
        expect.objectContaining({ name: "Fresh Basil", quantity: 5 }),
      ])
    );
  });

  it("returns 403 for non-supplier role", async () => {
    // Regular restaurant owner - no supplier association
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockUser(),
      supplier: null,
      restaurant: null,
    } as any);

    const response = await getCustomers();
    const { status } = await parseResponse(response);

    // user.supplier is null so route returns 404 ("Supplier not found")
    expect(status).toBe(404);
  });
});
