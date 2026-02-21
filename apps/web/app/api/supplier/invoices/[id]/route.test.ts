import { describe, it, expect } from "vitest";
import { GET, PATCH } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockSupplierUserWithSupplier,
  createMockInvoice,
} from "@/__tests__/fixtures";
import { createRequest, createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

const mockParams = { params: Promise.resolve({ id: "inv_1" }) };

describe("GET /api/supplier/invoices/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(
      createRequest("http://localhost/api/supplier/invoices/inv_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when invoice not found", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.invoice.findUnique.mockResolvedValueOnce(null);

    const response = await GET(
      createRequest("http://localhost/api/supplier/invoices/inv_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Invoice not found");
  });

  it("returns invoice with Decimal→Number", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const invoice = {
      ...createMockInvoice(),
      restaurant: {
        id: "rest_1",
        name: "Test Restaurant",
        address: "123 Main St",
        city: "Austin",
        state: "TX",
        zipCode: "78701",
        phone: "512-555-0100",
        email: "info@test.com",
      },
      order: {
        id: "order_1",
        orderNumber: "ORD-TEST-001",
        status: "DELIVERED",
        deliveredAt: new Date(),
        items: [
          {
            id: "item_1",
            quantity: new Decimal("10"),
            unitPrice: new Decimal("4.99"),
            subtotal: new Decimal("49.90"),
            product: { id: "prod_1", name: "Tomatoes", unit: "POUND" },
          },
        ],
      },
    };
    prismaMock.invoice.findUnique.mockResolvedValueOnce(invoice as any);

    const response = await GET(
      createRequest("http://localhost/api/supplier/invoices/inv_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.data.subtotal).toBe("number");
    expect(typeof data.data.total).toBe("number");
    expect(typeof data.data.order.items[0].quantity).toBe("number");
  });
});

describe("PATCH /api/supplier/invoices/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/invoices/inv_1", { action: "markPaid" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when invoice not found", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.invoice.findUnique.mockResolvedValueOnce(null);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/invoices/inv_1", { action: "markPaid" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Invoice not found");
  });

  it("markPaid action sets status to PAID", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const invoice = createMockInvoice();
    prismaMock.invoice.findUnique.mockResolvedValueOnce(invoice as any);

    const updated = {
      ...createMockInvoice({ status: "PAID" }),
      restaurant: { id: "rest_1", name: "Test Restaurant" },
      order: { id: "order_1", orderNumber: "ORD-TEST-001" },
    };
    prismaMock.invoice.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/invoices/inv_1", { action: "markPaid" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PAID",
        }),
      })
    );
  });

  it("markOverdue action sets status to OVERDUE", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const invoice = createMockInvoice();
    prismaMock.invoice.findUnique.mockResolvedValueOnce(invoice as any);

    const updated = {
      ...createMockInvoice({ status: "OVERDUE" }),
      restaurant: { id: "rest_1", name: "Test Restaurant" },
      order: { id: "order_1", orderNumber: "ORD-TEST-001" },
    };
    prismaMock.invoice.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/invoices/inv_1", { action: "markOverdue" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "OVERDUE",
        }),
      })
    );
  });

  it("updates notes and dueDate fields", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const invoice = createMockInvoice();
    prismaMock.invoice.findUnique.mockResolvedValueOnce(invoice as any);

    const updated = {
      ...createMockInvoice({ notes: "Updated notes" }),
      restaurant: { id: "rest_1", name: "Test Restaurant" },
      order: { id: "order_1", orderNumber: "ORD-TEST-001" },
    };
    prismaMock.invoice.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest(
        "http://localhost/api/supplier/invoices/inv_1",
        { notes: "Updated notes", dueDate: "2024-03-15" },
        "PATCH"
      ),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          notes: "Updated notes",
        }),
      })
    );
  });
});
