import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  mockAnthropicClient,
  mockAnthropicCreate,
} from "@/__tests__/mocks/anthropic";
import {
  createMockUserWithRestaurant,
  createMockProduct,
  createMockSupplier,
} from "@/__tests__/fixtures";
import { getAnthropicClient } from "@/lib/anthropic";

import { POST } from "./route";

function createRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/ai/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai/search", () => {
  const mockUser = createMockUserWithRestaurant();

  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
    (getAnthropicClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockAnthropicClient
    );
  });

  it("returns 401 if not authenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });
    const response = await POST(createRequest({ query: "tomatoes" }));
    expect(response.status).toBe(401);
  });

  it("returns 400 for empty query", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    const response = await POST(createRequest({ query: "" }));
    expect(response.status).toBe(400);
  });

  it("parses product search intent and returns results", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '{"entity":"products","filters":{"name":"tomatoes"},"sort":"price_asc","searchTerms":"tomatoes","redirectUrl":"/products"}',
        },
      ],
    });

    const product = {
      ...createMockProduct(),
      supplier: { name: "Test Supplier" },
    };
    prismaMock.supplierProduct.findMany.mockResolvedValue([product] as any);

    const response = await POST(createRequest({ query: "cheapest tomatoes" }));
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.results).toHaveLength(1);
    expect(data.data.results[0].type).toBe("product");
    expect(data.data.redirectUrl).toBe("/products");
  });

  it("parses supplier search intent", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: '{"entity":"suppliers","filters":{},"sort":null,"searchTerms":"dairy","redirectUrl":"/suppliers"}',
        },
      ],
    });

    const supplier = {
      ...createMockSupplier(),
      _count: { products: 15 },
    };
    prismaMock.supplier.findMany.mockResolvedValue([supplier] as any);

    const response = await POST(
      createRequest({ query: "dairy suppliers" })
    );
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.parsedIntent).toBe("suppliers");
  });

  it("handles AI returning non-parseable response", async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser as any);
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: "I cannot parse this query" }],
    });

    const response = await POST(
      createRequest({ query: "random gibberish" })
    );
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.results).toHaveLength(0);
  });

  it("returns 503 if AI service not configured", async () => {
    (getAnthropicClient as ReturnType<typeof vi.fn>).mockReturnValue(null);
    const response = await POST(createRequest({ query: "tomatoes" }));
    expect(response.status).toBe(503);
  });
});
