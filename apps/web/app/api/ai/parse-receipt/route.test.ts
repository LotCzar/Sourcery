import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  mockAnthropicClient,
  mockAnthropicCreate,
} from "@/__tests__/mocks/anthropic";
import {
  createMockUserWithRestaurant,
  createMockOrder,
  createMockOrderItem,
} from "@/__tests__/fixtures";
import { getAnthropicClient } from "@/lib/anthropic";
import { Decimal } from "@prisma/client/runtime/library";

import { POST } from "./route";

function createJsonRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/ai/parse-receipt", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai/parse-receipt", () => {
  const mockUser = createMockUserWithRestaurant();

  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
    (getAnthropicClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockAnthropicClient
    );
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const response = await POST(
      createJsonRequest({ image: "base64data" })
    );
    expect(response.status).toBe(401);
  });

  it("returns 400 if no image provided", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    const response = await POST(createJsonRequest({}));
    expect(response.status).toBe(400);
  });

  it("parses receipt image and returns structured data", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            supplierName: "Fresh Farms",
            invoiceNumber: "INV-123",
            date: "2024-01-15",
            lineItems: [
              {
                name: "Organic Tomatoes",
                quantity: 10,
                unit: "lb",
                unitPrice: 4.99,
                total: 49.9,
              },
            ],
            subtotal: 49.9,
            tax: 4.12,
            total: 54.02,
          }),
        },
      ],
    });

    const response = await POST(
      createJsonRequest({
        image: "fakebase64imagedata",
        mediaType: "image/jpeg",
      })
    );

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.parsed.supplierName).toBe("Fresh Farms");
    expect(data.data.parsed.lineItems).toHaveLength(1);
    expect(data.data.parsed.total).toBe(54.02);
    expect(data.data.reconciliation).toBeNull();
  });

  it("reconciles against linked order when orderId provided", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

    const order = {
      ...createMockOrder({ total: new Decimal("54.02") }),
      items: [
        {
          ...createMockOrderItem({
            quantity: new Decimal("10"),
            unitPrice: new Decimal("4.99"),
            subtotal: new Decimal("49.90"),
          }),
          product: { name: "Organic Tomatoes", price: new Decimal("4.99") },
        },
      ],
    };
    prismaMock.order.findFirst.mockResolvedValue(order as any);

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            supplierName: "Fresh Farms",
            invoiceNumber: "INV-123",
            date: "2024-01-15",
            lineItems: [
              {
                name: "Organic Tomatoes",
                quantity: 10,
                unit: "lb",
                unitPrice: 4.99,
                total: 49.9,
              },
            ],
            subtotal: 49.9,
            tax: 4.12,
            total: 54.02,
          }),
        },
      ],
    });

    const response = await POST(
      createJsonRequest({
        image: "fakebase64imagedata",
        orderId: "order_1",
      })
    );

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.reconciliation).toBeDefined();
    expect(data.data.reconciliation.matches).toHaveLength(1);
    expect(data.data.reconciliation.discrepancyCount).toBe(0);
  });

  it("flags reconciliation discrepancies", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);

    const order = {
      ...createMockOrder({ total: new Decimal("50.00") }),
      items: [
        {
          ...createMockOrderItem({
            quantity: new Decimal("10"),
            unitPrice: new Decimal("4.50"),
            subtotal: new Decimal("45.00"),
          }),
          product: { name: "Organic Tomatoes", price: new Decimal("4.50") },
        },
      ],
    };
    prismaMock.order.findFirst.mockResolvedValue(order as any);

    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            supplierName: "Fresh Farms",
            invoiceNumber: "INV-123",
            date: "2024-01-15",
            lineItems: [
              {
                name: "Organic Tomatoes",
                quantity: 10,
                unit: "lb",
                unitPrice: 5.99,
                total: 59.9,
              },
            ],
            subtotal: 59.9,
            tax: 4.94,
            total: 64.84,
          }),
        },
      ],
    });

    const response = await POST(
      createJsonRequest({
        image: "fakebase64imagedata",
        orderId: "order_1",
      })
    );

    const data = await response.json();
    expect(data.data.reconciliation.discrepancyCount).toBe(1);
    expect(data.data.reconciliation.matches[0].hasDiscrepancy).toBe(true);
    expect(data.data.reconciliation.matches[0].priceDifference).toBe(1.49);
  });

  it("returns 503 if AI service not configured", async () => {
    (getAnthropicClient as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const response = await POST(
      createJsonRequest({ image: "data" })
    );
    expect(response.status).toBe(503);
  });

  it("returns 422 if AI cannot parse the image", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: "I cannot read this image clearly" }],
    });

    const response = await POST(
      createJsonRequest({ image: "blurryimage" })
    );
    expect(response.status).toBe(422);
  });
});
