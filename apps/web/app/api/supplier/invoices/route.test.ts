import { describe, it, expect } from "vitest";
import { GET, POST } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockSupplierUserWithSupplier,
  createMockInvoice,
  createMockOrder,
} from "@/__tests__/fixtures";
import { createRequest, createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

describe("GET /api/supplier/invoices", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(createRequest("http://localhost/api/supplier/invoices"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when supplier not found", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockSupplierUserWithSupplier(),
      supplier: null,
    } as any);

    const response = await GET(createRequest("http://localhost/api/supplier/invoices"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Supplier not found");
  });

  it("returns invoices with stats", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const invoice = {
      ...createMockInvoice(),
      restaurant: { id: "rest_1", name: "Test Restaurant" },
      order: { id: "order_1", orderNumber: "ORD-TEST-001" },
    };
    prismaMock.invoice.findMany.mockResolvedValueOnce([invoice] as any);

    prismaMock.invoice.groupBy.mockResolvedValueOnce([
      { status: "PENDING", _sum: { total: new Decimal("500") }, _count: 3 },
    ] as any);

    prismaMock.invoice.aggregate.mockResolvedValueOnce({
      _sum: { total: new Decimal("200") },
      _count: 2,
    } as any);

    prismaMock.invoice.count.mockResolvedValueOnce(1); // overdue

    prismaMock.invoice.aggregate.mockResolvedValueOnce({
      _sum: { total: new Decimal("1000") },
    } as any);

    const response = await GET(createRequest("http://localhost/api/supplier/invoices"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(typeof data.data[0].subtotal).toBe("number");
    expect(typeof data.data[0].total).toBe("number");
    expect(data.stats).toBeDefined();
    expect(typeof data.stats.totalOutstanding).toBe("number");
    expect(typeof data.stats.pendingCount).toBe("number");
    expect(typeof data.stats.overdueCount).toBe("number");
  });

  it("filters by status query param", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.invoice.findMany.mockResolvedValueOnce([]);
    prismaMock.invoice.groupBy.mockResolvedValueOnce([] as any);
    prismaMock.invoice.aggregate.mockResolvedValueOnce({
      _sum: { total: null },
      _count: 0,
    } as any);
    prismaMock.invoice.count.mockResolvedValueOnce(0);
    prismaMock.invoice.aggregate.mockResolvedValueOnce({
      _sum: { total: null },
    } as any);

    await GET(createRequest("http://localhost/api/supplier/invoices?status=PAID"));

    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: "PAID",
        }),
      })
    );
  });
});

describe("POST /api/supplier/invoices", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await POST(
      createJsonRequest("http://localhost/api/supplier/invoices", { orderId: "order_1" })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 400 when missing required fields", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/supplier/invoices", {})
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toContain("required");
  });

  it("creates invoice from order", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const order = {
      ...createMockOrder({ status: "DELIVERED" }),
      restaurant: { id: "rest_1", name: "Test Restaurant" },
    };
    prismaMock.order.findUnique.mockResolvedValueOnce(order as any);
    prismaMock.invoice.findUnique.mockResolvedValueOnce(null); // no existing invoice
    prismaMock.invoice.count.mockResolvedValueOnce(0);

    const created = {
      ...createMockInvoice(),
      restaurant: { id: "rest_1", name: "Test Restaurant" },
      order: { id: "order_1", orderNumber: "ORD-TEST-001" },
    };
    prismaMock.invoice.create.mockResolvedValueOnce(created as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/supplier/invoices", { orderId: "order_1" })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.data.total).toBe("number");
  });

  it("creates manual invoice without orderId", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    prismaMock.invoice.count.mockResolvedValueOnce(5);

    const created = {
      ...createMockInvoice({ orderId: null }),
      restaurant: { id: "rest_1", name: "Test Restaurant" },
      order: null,
    };
    prismaMock.invoice.create.mockResolvedValueOnce(created as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/supplier/invoices", {
        restaurantId: "rest_1",
        total: "250.00",
        subtotal: "230.00",
        tax: "20.00",
      })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
  });
});
