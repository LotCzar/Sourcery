import { describe, it, expect, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUserWithRestaurant,
  createMockInvoice,
  createMockSupplier,
} from "@/__tests__/fixtures";
import { createRequest, createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

const mockParams = { params: Promise.resolve({ id: "inv_1" }) };

describe("GET /api/invoices/[id]", () => {
  beforeEach(() => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(
      createRequest("http://localhost/api/invoices/inv_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when invoice not found", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(null);

    const response = await GET(
      createRequest("http://localhost/api/invoices/inv_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Invoice not found");
  });

  it("returns invoice with Decimal converted to Number", async () => {
    const invoice = {
      ...createMockInvoice(),
      supplier: { id: "sup_1", name: "Test Supplier", email: "s@t.com", phone: "555-0200" },
      order: {
        id: "order_1",
        orderNumber: "ORD-001",
        status: "DELIVERED",
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
    prismaMock.invoice.findFirst.mockResolvedValueOnce(invoice as any);

    const response = await GET(
      createRequest("http://localhost/api/invoices/inv_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.data.subtotal).toBe("number");
    expect(typeof data.data.tax).toBe("number");
    expect(typeof data.data.total).toBe("number");
    expect(data.data.subtotal).toBe(100);
    expect(data.data.total).toBe(108.25);
  });
});

describe("PATCH /api/invoices/[id]", () => {
  beforeEach(() => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await PATCH(
      createJsonRequest("http://localhost/api/invoices/inv_1", { status: "PAID" }, "PATCH"),
      mockParams
    );
    const { status } = await parseResponse(response);

    expect(status).toBe(401);
  });

  it("returns 404 when invoice not found", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(null);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/invoices/inv_1", { status: "PAID" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Invoice not found");
  });

  // Valid transitions
  it("allows PENDING → PAID", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(
      createMockInvoice({ status: "PENDING" }) as any
    );
    const updated = {
      ...createMockInvoice({ status: "PAID" }),
      supplier: { id: "sup_1", name: "Test" },
      order: { id: "order_1", orderNumber: "ORD-001" },
    };
    prismaMock.invoice.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/invoices/inv_1", { status: "PAID" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.status).toBe("PAID");
  });

  it("allows PENDING → PARTIALLY_PAID with paidAmount", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(
      createMockInvoice({ status: "PENDING" }) as any
    );
    const updated = {
      ...createMockInvoice({ status: "PARTIALLY_PAID", paidAmount: new Decimal("50.00") }),
      supplier: { id: "sup_1", name: "Test" },
      order: { id: "order_1", orderNumber: "ORD-001" },
    };
    prismaMock.invoice.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/invoices/inv_1", { status: "PARTIALLY_PAID", paidAmount: 50 }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.status).toBe("PARTIALLY_PAID");
  });

  it("allows PENDING → CANCELLED", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(
      createMockInvoice({ status: "PENDING" }) as any
    );
    const updated = {
      ...createMockInvoice({ status: "CANCELLED" }),
      supplier: { id: "sup_1", name: "Test" },
      order: { id: "order_1", orderNumber: "ORD-001" },
    };
    prismaMock.invoice.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/invoices/inv_1", { status: "CANCELLED" }, "PATCH"),
      mockParams
    );
    const { status } = await parseResponse(response);

    expect(status).toBe(200);
  });

  it("allows OVERDUE → PAID", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(
      createMockInvoice({ status: "OVERDUE" }) as any
    );
    const updated = {
      ...createMockInvoice({ status: "PAID" }),
      supplier: { id: "sup_1", name: "Test" },
      order: { id: "order_1", orderNumber: "ORD-001" },
    };
    prismaMock.invoice.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/invoices/inv_1", { status: "PAID" }, "PATCH"),
      mockParams
    );
    const { status } = await parseResponse(response);

    expect(status).toBe(200);
  });

  it("allows OVERDUE → DISPUTED", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(
      createMockInvoice({ status: "OVERDUE" }) as any
    );
    const updated = {
      ...createMockInvoice({ status: "DISPUTED" }),
      supplier: { id: "sup_1", name: "Test" },
      order: { id: "order_1", orderNumber: "ORD-001" },
    };
    prismaMock.invoice.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/invoices/inv_1", { status: "DISPUTED" }, "PATCH"),
      mockParams
    );
    const { status } = await parseResponse(response);

    expect(status).toBe(200);
  });

  it("allows PARTIALLY_PAID → PAID", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(
      createMockInvoice({ status: "PARTIALLY_PAID" }) as any
    );
    const updated = {
      ...createMockInvoice({ status: "PAID" }),
      supplier: { id: "sup_1", name: "Test" },
      order: { id: "order_1", orderNumber: "ORD-001" },
    };
    prismaMock.invoice.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/invoices/inv_1", { status: "PAID" }, "PATCH"),
      mockParams
    );
    const { status } = await parseResponse(response);

    expect(status).toBe(200);
  });

  it("allows DISPUTED → PAID", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(
      createMockInvoice({ status: "DISPUTED" }) as any
    );
    const updated = {
      ...createMockInvoice({ status: "PAID" }),
      supplier: { id: "sup_1", name: "Test" },
      order: { id: "order_1", orderNumber: "ORD-001" },
    };
    prismaMock.invoice.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/invoices/inv_1", { status: "PAID" }, "PATCH"),
      mockParams
    );
    const { status } = await parseResponse(response);

    expect(status).toBe(200);
  });

  // Invalid transitions
  it("rejects PAID → PENDING (terminal state)", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(
      createMockInvoice({ status: "PAID" }) as any
    );

    const response = await PATCH(
      createJsonRequest("http://localhost/api/invoices/inv_1", { status: "PENDING" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Cannot transition from PAID");
  });

  it("rejects CANCELLED → PAID (terminal state)", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(
      createMockInvoice({ status: "CANCELLED" }) as any
    );

    const response = await PATCH(
      createJsonRequest("http://localhost/api/invoices/inv_1", { status: "PAID" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Cannot transition from CANCELLED");
  });

  it("rejects PENDING → DISPUTED (not allowed)", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(
      createMockInvoice({ status: "PENDING" }) as any
    );

    const response = await PATCH(
      createJsonRequest("http://localhost/api/invoices/inv_1", { status: "DISPUTED" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("Invalid transition from PENDING to DISPUTED");
  });

  // Payment field validation
  it("sets paidAt when marking as PAID", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(
      createMockInvoice({ status: "PENDING" }) as any
    );
    const updated = {
      ...createMockInvoice({ status: "PAID" }),
      supplier: { id: "sup_1", name: "Test" },
      order: { id: "order_1", orderNumber: "ORD-001" },
    };
    prismaMock.invoice.update.mockResolvedValueOnce(updated as any);

    await PATCH(
      createJsonRequest("http://localhost/api/invoices/inv_1", { status: "PAID" }, "PATCH"),
      mockParams
    );

    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paidAt: expect.any(Date),
        }),
      })
    );
  });

  it("defaults paidAmount to total when not provided for PAID", async () => {
    const invoice = createMockInvoice({ status: "PENDING", total: new Decimal("108.25") });
    prismaMock.invoice.findFirst.mockResolvedValueOnce(invoice as any);
    const updated = {
      ...createMockInvoice({ status: "PAID" }),
      supplier: { id: "sup_1", name: "Test" },
      order: { id: "order_1", orderNumber: "ORD-001" },
    };
    prismaMock.invoice.update.mockResolvedValueOnce(updated as any);

    await PATCH(
      createJsonRequest("http://localhost/api/invoices/inv_1", { status: "PAID" }, "PATCH"),
      mockParams
    );

    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          paidAmount: invoice.total,
        }),
      })
    );
  });

  it("rejects PARTIALLY_PAID without paidAmount", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(
      createMockInvoice({ status: "PENDING" }) as any
    );

    const response = await PATCH(
      createJsonRequest("http://localhost/api/invoices/inv_1", { status: "PARTIALLY_PAID" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("PARTIALLY_PAID requires paidAmount > 0");
  });

  it("rejects PARTIALLY_PAID with paidAmount >= total", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(
      createMockInvoice({ status: "PENDING", total: new Decimal("108.25") }) as any
    );

    const response = await PATCH(
      createJsonRequest("http://localhost/api/invoices/inv_1", { status: "PARTIALLY_PAID", paidAmount: 108.25 }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(400);
    expect(data.error).toBe("PARTIALLY_PAID requires paidAmount < total");
  });

  // Non-status updates
  it("allows updating notes without status change", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(
      createMockInvoice({ status: "PENDING" }) as any
    );
    const updated = {
      ...createMockInvoice({ status: "PENDING", notes: "Updated note" }),
      supplier: { id: "sup_1", name: "Test" },
      order: { id: "order_1", orderNumber: "ORD-001" },
    };
    prismaMock.invoice.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/invoices/inv_1", { notes: "Updated note" }, "PATCH"),
      mockParams
    );
    const { status } = await parseResponse(response);

    expect(status).toBe(200);
    expect(prismaMock.invoice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ notes: "Updated note" }),
      })
    );
  });
});

describe("DELETE /api/invoices/[id]", () => {
  beforeEach(() => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await DELETE(
      createRequest("http://localhost/api/invoices/inv_1", { method: "DELETE" }),
      mockParams
    );
    const { status } = await parseResponse(response);

    expect(status).toBe(401);
  });

  it("returns 404 when invoice not found", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(null);

    const response = await DELETE(
      createRequest("http://localhost/api/invoices/inv_1", { method: "DELETE" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Invoice not found");
  });

  it("deletes invoice successfully", async () => {
    prismaMock.invoice.findFirst.mockResolvedValueOnce(createMockInvoice() as any);
    prismaMock.invoice.delete.mockResolvedValueOnce(createMockInvoice() as any);

    const response = await DELETE(
      createRequest("http://localhost/api/invoices/inv_1", { method: "DELETE" }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Invoice deleted successfully");
    expect(prismaMock.invoice.delete).toHaveBeenCalledWith({ where: { id: "inv_1" } });
  });
});
