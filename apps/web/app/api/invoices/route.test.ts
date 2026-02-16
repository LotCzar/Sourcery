import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUserWithRestaurant,
  createMockInvoice,
  createMockSupplier,
  createMockOrder,
} from "@/__tests__/fixtures";
import { createRequest, createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

describe("GET /api/invoices", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(createRequest("http://localhost/api/invoices"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when user has no restaurant", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockUserWithRestaurant(),
      restaurant: null,
    } as any);

    const response = await GET(createRequest("http://localhost/api/invoices"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Restaurant not found");
  });

  it("returns formatted invoices with Decimal converted to number", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const invoice = {
      ...createMockInvoice(),
      supplier: { id: "sup_1", name: "Test Supplier", email: "sup@test.com" },
      order: { id: "order_1", orderNumber: "ORD-001", status: "DELIVERED" },
    };
    prismaMock.invoice.findMany
      .mockResolvedValueOnce([invoice] as any)
      .mockResolvedValueOnce([createMockInvoice()] as any);

    const response = await GET(createRequest("http://localhost/api/invoices"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(typeof data.data[0].subtotal).toBe("number");
    expect(typeof data.data[0].tax).toBe("number");
    expect(typeof data.data[0].total).toBe("number");
  });

  it("calculates summary stats", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    prismaMock.invoice.findMany.mockResolvedValueOnce([] as any);

    const allInvoices = [
      createMockInvoice({ status: "PENDING", total: new Decimal("100.00") }),
      createMockInvoice({ id: "inv_2", status: "OVERDUE", total: new Decimal("200.00") }),
      createMockInvoice({ id: "inv_3", status: "PAID", total: new Decimal("150.00") }),
    ];
    prismaMock.invoice.findMany.mockResolvedValueOnce(allInvoices as any);

    const response = await GET(createRequest("http://localhost/api/invoices"));
    const { data } = await parseResponse(response);

    expect(data.summary.totalPending).toBe(300);
    expect(data.summary.totalPaid).toBe(150);
    expect(data.summary.overdueCount).toBe(1);
    expect(data.summary.totalInvoices).toBe(3);
  });

  it("filters by status", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.invoice.findMany
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);

    await GET(createRequest("http://localhost/api/invoices?status=PAID"));

    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PAID" }),
      })
    );
  });

  it("filters by supplierId", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.invoice.findMany
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);

    await GET(createRequest("http://localhost/api/invoices?supplierId=sup_1"));

    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ supplierId: "sup_1" }),
      })
    );
  });

  it("ignores 'all' filter values for status", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.invoice.findMany
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);

    await GET(createRequest("http://localhost/api/invoices?status=all"));

    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { restaurantId: "rest_1" },
      })
    );
  });

  it("ignores 'all' filter values for supplierId", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.invoice.findMany
      .mockResolvedValueOnce([] as any)
      .mockResolvedValueOnce([] as any);

    await GET(createRequest("http://localhost/api/invoices?supplierId=all"));

    expect(prismaMock.invoice.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { restaurantId: "rest_1" },
      })
    );
  });

  it("converts paidAmount Decimal to number", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const invoice = {
      ...createMockInvoice({ paidAmount: new Decimal("108.25") }),
      supplier: { id: "sup_1", name: "Test Supplier", email: "sup@test.com" },
      order: null,
    };
    prismaMock.invoice.findMany
      .mockResolvedValueOnce([invoice] as any)
      .mockResolvedValueOnce([] as any);

    const response = await GET(createRequest("http://localhost/api/invoices"));
    const { data } = await parseResponse(response);

    expect(data.data[0].paidAmount).toBe(108.25);
  });

  it("returns null paidAmount when not set", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const invoice = {
      ...createMockInvoice({ paidAmount: null }),
      supplier: { id: "sup_1", name: "Test Supplier", email: "sup@test.com" },
      order: null,
    };
    prismaMock.invoice.findMany
      .mockResolvedValueOnce([invoice] as any)
      .mockResolvedValueOnce([] as any);

    const response = await GET(createRequest("http://localhost/api/invoices"));
    const { data } = await parseResponse(response);

    expect(data.data[0].paidAmount).toBeNull();
  });
});

describe("POST /api/invoices", () => {
  const validBody = {
    invoiceNumber: "INV-001",
    supplierId: "sup_1",
    orderId: "order_1",
    subtotal: 100,
    tax: 8.25,
    dueDate: "2099-12-31",
  };

  beforeEach(() => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await POST(
      createJsonRequest("http://localhost/api/invoices", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when user has no restaurant", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockUserWithRestaurant(),
      restaurant: null,
    } as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/invoices", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Restaurant not found");
  });

  it("returns 400 when required fields are missing", async () => {
    const response = await POST(
      createJsonRequest("http://localhost/api/invoices", { invoiceNumber: "INV-001" })
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Missing required fields");
  });

  it("returns 404 when supplier not found", async () => {
    prismaMock.supplier.findUnique.mockResolvedValueOnce(null);

    const response = await POST(
      createJsonRequest("http://localhost/api/invoices", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Supplier not found");
  });

  it("returns 400 when order already has an invoice", async () => {
    prismaMock.supplier.findUnique.mockResolvedValueOnce(createMockSupplier() as any);
    prismaMock.order.findFirst.mockResolvedValueOnce(createMockOrder() as any);
    prismaMock.invoice.findUnique.mockResolvedValueOnce(createMockInvoice() as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/invoices", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Order already has an invoice");
  });

  it("returns 404 when order not found", async () => {
    prismaMock.supplier.findUnique.mockResolvedValueOnce(createMockSupplier() as any);
    prismaMock.order.findFirst.mockResolvedValueOnce(null);

    const response = await POST(
      createJsonRequest("http://localhost/api/invoices", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Order not found");
  });

  it("calculates total as subtotal + tax", async () => {
    prismaMock.supplier.findUnique.mockResolvedValueOnce(createMockSupplier() as any);
    prismaMock.order.findFirst.mockResolvedValueOnce(createMockOrder() as any);
    prismaMock.invoice.findUnique.mockResolvedValueOnce(null);

    const createdInvoice = {
      ...createMockInvoice({ total: new Decimal("108.25") }),
      supplier: { id: "sup_1", name: "Test Supplier" },
      order: { id: "order_1", orderNumber: "ORD-001" },
    };
    prismaMock.invoice.create.mockResolvedValueOnce(createdInvoice as any);

    const response = await POST(
      createJsonRequest("http://localhost/api/invoices", validBody)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(prismaMock.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ total: 108.25 }),
      })
    );
  });

  it("defaults tax to 0", async () => {
    prismaMock.supplier.findUnique.mockResolvedValueOnce(createMockSupplier() as any);

    const createdInvoice = {
      ...createMockInvoice({ total: new Decimal("100.00") }),
      supplier: { id: "sup_1", name: "Test Supplier" },
      order: null,
    };
    prismaMock.invoice.create.mockResolvedValueOnce(createdInvoice as any);

    const bodyNoTax = {
      invoiceNumber: "INV-002",
      supplierId: "sup_1",
      subtotal: 100,
      dueDate: "2099-12-31",
    };

    const response = await POST(
      createJsonRequest("http://localhost/api/invoices", bodyNoTax)
    );
    const { status } = await parseResponse(response);

    expect(status).toBe(200);
    expect(prismaMock.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ total: 100, tax: 0 }),
      })
    );
  });

  it("sets status to PENDING when dueDate is in the future", async () => {
    prismaMock.supplier.findUnique.mockResolvedValueOnce(createMockSupplier() as any);

    const createdInvoice = {
      ...createMockInvoice({ status: "PENDING" }),
      supplier: { id: "sup_1", name: "Test Supplier" },
      order: null,
    };
    prismaMock.invoice.create.mockResolvedValueOnce(createdInvoice as any);

    const body = {
      invoiceNumber: "INV-003",
      supplierId: "sup_1",
      subtotal: 50,
      dueDate: "2099-12-31",
    };

    await POST(createJsonRequest("http://localhost/api/invoices", body));

    expect(prismaMock.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "PENDING" }),
      })
    );
  });

  it("sets status to OVERDUE when dueDate is in the past", async () => {
    prismaMock.supplier.findUnique.mockResolvedValueOnce(createMockSupplier() as any);

    const createdInvoice = {
      ...createMockInvoice({ status: "OVERDUE" }),
      supplier: { id: "sup_1", name: "Test Supplier" },
      order: null,
    };
    prismaMock.invoice.create.mockResolvedValueOnce(createdInvoice as any);

    const body = {
      invoiceNumber: "INV-004",
      supplierId: "sup_1",
      subtotal: 50,
      dueDate: "2020-01-01",
    };

    await POST(createJsonRequest("http://localhost/api/invoices", body));

    expect(prismaMock.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "OVERDUE" }),
      })
    );
  });

  it("returns created invoice with formatted data", async () => {
    prismaMock.supplier.findUnique.mockResolvedValueOnce(createMockSupplier() as any);

    const createdInvoice = {
      ...createMockInvoice(),
      supplier: { id: "sup_1", name: "Test Supplier" },
      order: null,
    };
    prismaMock.invoice.create.mockResolvedValueOnce(createdInvoice as any);

    const body = {
      invoiceNumber: "INV-005",
      supplierId: "sup_1",
      subtotal: 100,
      dueDate: "2099-12-31",
    };

    const response = await POST(
      createJsonRequest("http://localhost/api/invoices", body)
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.data.total).toBe("number");
    expect(data.data.invoiceNumber).toBe("INV-001");
    expect(data.data.supplier).toEqual({ id: "sup_1", name: "Test Supplier" });
  });
});
