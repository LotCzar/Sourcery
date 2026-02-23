import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "./mocks/prisma";
import { mockAuth } from "./mocks/clerk";
import { createMockUser, createMockRestaurant, createMockOrgAdmin } from "./fixtures";
import { parseResponse } from "./helpers";
import { GET } from "@/app/api/org/ai-costs/route";
import { NextRequest } from "next/server";
import { calculateCost, TOKEN_PRICING } from "@/lib/ai/cost-config";

function createGetRequest(params?: Record<string, string>) {
  const url = new URL("http://localhost:3000/api/org/ai-costs");
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  return new NextRequest(url);
}

describe("GET /api/org/ai-costs", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });
    const res = await GET(createGetRequest());
    const { status, data } = await parseResponse(res);
    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when user not found", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(null);
    const res = await GET(createGetRequest());
    const { status, data } = await parseResponse(res);
    expect(status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("returns 403 for non-ORG_ADMIN users", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(
      createMockUser({ role: "OWNER" }) as any
    );
    const res = await GET(createGetRequest());
    const { status, data } = await parseResponse(res);
    expect(status).toBe(403);
    expect(data.error).toContain("ORG_ADMIN");
  });

  it("returns 403 for ORG_ADMIN without organizationId", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(
      createMockUser({ role: "ORG_ADMIN", organizationId: null }) as any
    );
    const res = await GET(createGetRequest());
    const { status, data } = await parseResponse(res);
    expect(status).toBe(403);
  });

  it("returns aggregated costs per restaurant and feature", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(
      createMockOrgAdmin() as any
    );
    prismaMock.restaurant.findMany.mockResolvedValueOnce([
      createMockRestaurant({ organizationId: "org_1" }) as any,
    ]);
    prismaMock.aiUsageLog.groupBy.mockResolvedValueOnce([
      {
        feature: "CHAT",
        _count: 5,
        _sum: {
          inputTokens: 10000,
          outputTokens: 5000,
          cacheReadTokens: 1000,
          cacheWriteTokens: 500,
        },
      },
      {
        feature: "SEARCH",
        _count: 3,
        _sum: {
          inputTokens: 3000,
          outputTokens: 1000,
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
        },
      },
    ] as any);

    const res = await GET(createGetRequest());
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.restaurants).toHaveLength(1);

    const restaurant = data.data.restaurants[0];
    expect(restaurant.name).toBe("Test Restaurant");
    expect(restaurant.features).toHaveLength(2);
    expect(restaurant.totalEstimatedCost).toBeGreaterThan(0);
    expect(data.data.totalEstimatedCost).toBeGreaterThan(0);
  });

  it("returns empty features for restaurants with zero usage", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(
      createMockOrgAdmin() as any
    );
    prismaMock.restaurant.findMany.mockResolvedValueOnce([
      createMockRestaurant({ organizationId: "org_1" }) as any,
    ]);
    prismaMock.aiUsageLog.groupBy.mockResolvedValueOnce([] as any);

    const res = await GET(createGetRequest());
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.data.restaurants[0].features).toHaveLength(0);
    expect(data.data.restaurants[0].totalEstimatedCost).toBe(0);
    expect(data.data.totalEstimatedCost).toBe(0);
  });

  it("supports custom date range via query params", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(
      createMockOrgAdmin() as any
    );
    prismaMock.restaurant.findMany.mockResolvedValueOnce([]);

    const res = await GET(
      createGetRequest({
        from: "2026-01-01T00:00:00.000Z",
        to: "2026-01-31T23:59:59.999Z",
      })
    );
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.data.period.from).toContain("2026-01-01");
    expect(data.data.period.to).toContain("2026-01-31");
  });
});

describe("calculateCost", () => {
  it("returns 0 for zero tokens", () => {
    const cost = calculateCost({
      inputTokens: 0,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    expect(cost).toBe(0);
  });

  it("computes cost correctly for 1M input tokens", () => {
    const cost = calculateCost({
      inputTokens: 1_000_000,
      outputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    expect(cost).toBe(TOKEN_PRICING.inputPerMillion);
  });

  it("computes cost correctly for 1M output tokens", () => {
    const cost = calculateCost({
      inputTokens: 0,
      outputTokens: 1_000_000,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
    });
    expect(cost).toBe(TOKEN_PRICING.outputPerMillion);
  });

  it("computes combined cost correctly", () => {
    const cost = calculateCost({
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
      cacheReadTokens: 1_000_000,
      cacheWriteTokens: 1_000_000,
    });
    const expected =
      TOKEN_PRICING.inputPerMillion +
      TOKEN_PRICING.outputPerMillion +
      TOKEN_PRICING.cacheReadPerMillion +
      TOKEN_PRICING.cacheWritePerMillion;
    expect(cost).toBeCloseTo(expected, 5);
  });
});
