import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUserWithRestaurant,
  createMockOrder,
  createMockSupplier,
} from "@/__tests__/fixtures";
import { GET } from "./route";
import { Decimal } from "@prisma/client/runtime/library";

describe("GET /api/reports/export", () => {
  const mockUser = createMockUserWithRestaurant();

  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
  });

  it("should return spending report as JSON", async () => {
    prismaMock.order.findMany.mockResolvedValue([
      {
        ...createMockOrder({ status: "DELIVERED" }),
        supplier: { name: "Test Supplier" },
      },
    ] as any);

    const request = new Request(
      "http://localhost/api/reports/export?type=spending&format=json"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(data.data[0].orderNumber).toBe("ORD-TEST-001");
  });

  it("should return spending report as CSV", async () => {
    prismaMock.order.findMany.mockResolvedValue([
      {
        ...createMockOrder({ status: "DELIVERED" }),
        supplier: { name: "Test Supplier" },
      },
    ] as any);

    const request = new Request(
      "http://localhost/api/reports/export?type=spending&format=csv"
    );

    const response = await GET(request);
    const text = await response.text();

    expect(response.headers.get("Content-Type")).toBe("text/csv");
    expect(text).toContain("orderNumber,supplier,status");
    expect(text).toContain("ORD-TEST-001");
  });

  it("should return orders report with line items", async () => {
    prismaMock.order.findMany.mockResolvedValue([
      {
        ...createMockOrder(),
        supplier: { name: "Test Supplier" },
        items: [
          {
            quantity: new Decimal("5"),
            unitPrice: new Decimal("4.99"),
            subtotal: new Decimal("24.95"),
            product: { name: "Organic Tomatoes", category: "PRODUCE" },
          },
        ],
      },
    ] as any);

    const request = new Request(
      "http://localhost/api/reports/export?type=orders&format=json"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data[0].product).toBe("Organic Tomatoes");
  });

  it("should return suppliers report", async () => {
    prismaMock.supplier.findMany.mockResolvedValue([
      {
        ...createMockSupplier(),
        _count: { orders: 5 },
        orders: [
          { total: new Decimal("100.00") },
          { total: new Decimal("200.00") },
        ],
      },
    ] as any);

    const request = new Request(
      "http://localhost/api/reports/export?type=suppliers&format=json"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data[0].name).toBe("Test Supplier");
    expect(data.data[0].totalSpent).toBe("300.00");
  });

  it("should return 400 for invalid format", async () => {
    const request = new Request(
      "http://localhost/api/reports/export?format=xml"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid format");
  });

  it("should return 400 for invalid type", async () => {
    const request = new Request(
      "http://localhost/api/reports/export?type=unknown"
    );

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid type");
  });

  it("should return 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const request = new Request("http://localhost/api/reports/export");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
  });

  it("should return 404 if no restaurant", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...mockUser,
      restaurant: null,
    } as any);

    const request = new Request("http://localhost/api/reports/export");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
  });
});
