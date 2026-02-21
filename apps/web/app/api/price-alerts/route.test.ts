import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUser,
  createMockPriceAlert,
  createMockProduct,
  createMockSupplier,
} from "@/__tests__/fixtures";
import {
  createRequest,
  createJsonRequest,
  parseResponse,
} from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

describe("GET /api/price-alerts", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("returns alerts with Decimal to Number conversion", async () => {
    const user = createMockUser();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const alert = {
      ...createMockPriceAlert(),
      triggeredPrice: new Decimal("4.25"),
      triggeredAt: new Date("2024-02-01"),
      product: {
        ...createMockProduct(),
        supplier: { id: "sup_1", name: "Test Supplier" },
        priceHistory: [
          { price: new Decimal("5.00"), recordedAt: new Date("2024-01-15") },
          { price: new Decimal("4.50"), recordedAt: new Date("2024-01-10") },
        ],
      },
    };
    prismaMock.priceAlert.findMany.mockResolvedValueOnce([alert] as any);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(typeof data.data[0].targetPrice).toBe("number");
    expect(typeof data.data[0].triggeredPrice).toBe("number");
    expect(typeof data.data[0].product.currentPrice).toBe("number");
    expect(typeof data.data[0].product.priceHistory[0].price).toBe("number");
  });

  it("returns alerts with product and supplier info", async () => {
    const user = createMockUser();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const alert = {
      ...createMockPriceAlert(),
      product: {
        ...createMockProduct(),
        supplier: { id: "sup_1", name: "Test Supplier" },
        priceHistory: [],
      },
    };
    prismaMock.priceAlert.findMany.mockResolvedValueOnce([alert] as any);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data[0].product.supplier).toEqual({
      id: "sup_1",
      name: "Test Supplier",
    });
    expect(data.data[0].product.name).toBe("Organic Tomatoes");
  });

  it("returns empty array when no alerts", async () => {
    const user = createMockUser();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.priceAlert.findMany.mockResolvedValueOnce([]);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data).toEqual([]);
  });
});

describe("POST /api/price-alerts", () => {
  const validBody = {
    productId: "prod_1",
    alertType: "PRICE_DROP",
    targetPrice: 3.5,
  };

  beforeEach(() => {
    const user = createMockUser();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await POST(
      createJsonRequest("http://localhost/api/price-alerts", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when validation fails (missing productId)", async () => {
    const response = await POST(
      createJsonRequest("http://localhost/api/price-alerts", {
        alertType: "PRICE_DROP",
        targetPrice: 3.5,
      })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("returns 400 when validation fails (missing alertType)", async () => {
    const response = await POST(
      createJsonRequest("http://localhost/api/price-alerts", {
        productId: "prod_1",
        targetPrice: 3.5,
      })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("returns 404 when product not found", async () => {
    prismaMock.supplierProduct.findUnique.mockResolvedValueOnce(null);

    const response = await POST(
      createJsonRequest("http://localhost/api/price-alerts", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Product not found");
  });

  it("returns 400 when active alert already exists", async () => {
    const product = createMockProduct();
    prismaMock.supplierProduct.findUnique.mockResolvedValueOnce(product as any);

    const existingAlert = createMockPriceAlert();
    prismaMock.priceAlert.findFirst.mockResolvedValueOnce(existingAlert as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/price-alerts", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe(
      "An active alert already exists for this product"
    );
  });

  it("creates alert successfully", async () => {
    const product = createMockProduct();
    prismaMock.supplierProduct.findUnique.mockResolvedValueOnce(product as any);
    prismaMock.priceAlert.findFirst.mockResolvedValueOnce(null);

    const createdAlert = {
      ...createMockPriceAlert(),
      product: {
        ...createMockProduct(),
        supplier: { id: "sup_1", name: "Test Supplier" },
      },
    };
    prismaMock.priceAlert.create.mockResolvedValueOnce(createdAlert as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/price-alerts", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.data.targetPrice).toBe("number");
    expect(data.data.product.supplier).toEqual({
      id: "sup_1",
      name: "Test Supplier",
    });
  });
});
