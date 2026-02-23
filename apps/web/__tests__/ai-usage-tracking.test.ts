import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUser,
  createMockRestaurant,
  createMockUserWithRestaurant,
} from "@/__tests__/fixtures";
import { createRequest, parseResponse } from "@/__tests__/helpers";

// ============================================
// trackAiUsage tests
// ============================================
describe("trackAiUsage", () => {
  let trackAiUsage: typeof import("@/lib/ai/usage").trackAiUsage;

  beforeEach(async () => {
    const mod = await import("@/lib/ai/usage");
    trackAiUsage = mod.trackAiUsage;
  });

  it("calls prisma.aiUsageLog.create with correct fields", async () => {
    prismaMock.aiUsageLog.create.mockResolvedValueOnce({} as any);

    await trackAiUsage({
      feature: "CHAT",
      restaurantId: "rest_1",
      userId: "user_1",
      inputTokens: 500,
      outputTokens: 200,
      cacheReadTokens: 10,
      cacheWriteTokens: 5,
      model: "claude-sonnet-4-20250514",
      durationMs: 1500,
    });

    expect(prismaMock.aiUsageLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        feature: "CHAT",
        restaurantId: "rest_1",
        userId: "user_1",
        inputTokens: 500,
        outputTokens: 200,
        cacheReadTokens: 10,
        cacheWriteTokens: 5,
        model: "claude-sonnet-4-20250514",
        durationMs: 1500,
        periodStart: expect.any(Date),
      }),
    });
  });

  it("sets periodStart to 1st of current month", async () => {
    prismaMock.aiUsageLog.create.mockResolvedValueOnce({} as any);

    await trackAiUsage({
      feature: "SEARCH",
      restaurantId: "rest_1",
      userId: "user_1",
      inputTokens: 100,
      outputTokens: 50,
      model: "claude-sonnet-4-20250514",
    });

    const call = prismaMock.aiUsageLog.create.mock.calls[0][0];
    const periodStart = call.data.periodStart as Date;
    expect(periodStart.getUTCDate()).toBe(1);
    expect(periodStart.getUTCHours()).toBe(0);
    expect(periodStart.getUTCMinutes()).toBe(0);
  });

  it("swallows errors and does not throw", async () => {
    prismaMock.aiUsageLog.create.mockRejectedValueOnce(
      new Error("DB connection failed")
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Should resolve without throwing
    await expect(
      trackAiUsage({
        feature: "CHAT",
        restaurantId: "rest_1",
        userId: "user_1",
        inputTokens: 100,
        outputTokens: 50,
        model: "claude-sonnet-4-20250514",
      })
    ).resolves.toBeUndefined();

    expect(consoleSpy).toHaveBeenCalledWith(
      "Failed to track AI usage:",
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it("handles userId: null for system jobs", async () => {
    prismaMock.aiUsageLog.create.mockResolvedValueOnce({} as any);

    await trackAiUsage({
      feature: "WEEKLY_DIGEST",
      restaurantId: "rest_1",
      userId: null,
      inputTokens: 200,
      outputTokens: 100,
      model: "claude-sonnet-4-20250514",
    });

    expect(prismaMock.aiUsageLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        feature: "WEEKLY_DIGEST",
        userId: null,
      }),
    });
  });
});

// ============================================
// checkAiRateLimit tests
// ============================================
describe("checkAiRateLimit", () => {
  let checkAiRateLimit: typeof import("@/lib/ai/rate-limit").checkAiRateLimit;

  beforeEach(async () => {
    const mod = await import("@/lib/ai/rate-limit");
    checkAiRateLimit = mod.checkAiRateLimit;
  });

  it("returns allowed: true when used < limit", async () => {
    prismaMock.aiUsageLog.count.mockResolvedValueOnce(10);

    const result = await checkAiRateLimit("rest_1", "CHAT", "STARTER");

    expect(result.allowed).toBe(true);
    expect(result.used).toBe(10);
    expect(result.limit).toBe(50);
    expect(result.remaining).toBe(40);
  });

  it("returns allowed: false when used >= limit", async () => {
    prismaMock.aiUsageLog.count.mockResolvedValueOnce(50);

    const result = await checkAiRateLimit("rest_1", "CHAT", "STARTER");

    expect(result.allowed).toBe(false);
    expect(result.used).toBe(50);
    expect(result.limit).toBe(50);
    expect(result.remaining).toBe(0);
  });

  it("Enterprise tier returns allowed: true without DB query", async () => {
    const result = await checkAiRateLimit("rest_1", "CHAT", "ENTERPRISE");

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(Infinity);
    expect(prismaMock.aiUsageLog.count).not.toHaveBeenCalled();
  });

  it("WEEKLY_DIGEST is always allowed without DB query", async () => {
    const result = await checkAiRateLimit("rest_1", "WEEKLY_DIGEST", "STARTER");

    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(Infinity);
    expect(prismaMock.aiUsageLog.count).not.toHaveBeenCalled();
  });

  it("groups PARSE_MENU and PARSE_RECEIPT into shared count", async () => {
    prismaMock.aiUsageLog.count.mockResolvedValueOnce(8);

    const result = await checkAiRateLimit("rest_1", "PARSE_MENU", "STARTER");

    expect(prismaMock.aiUsageLog.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        feature: { in: ["PARSE_MENU", "PARSE_RECEIPT"] },
      }),
    });
    expect(result.used).toBe(8);
    expect(result.limit).toBe(10);
  });

  it("resetAt is first of next UTC month", async () => {
    prismaMock.aiUsageLog.count.mockResolvedValueOnce(0);

    const result = await checkAiRateLimit("rest_1", "CHAT", "STARTER");

    expect(result.resetAt.getUTCDate()).toBe(1);
    expect(result.resetAt.getUTCHours()).toBe(0);
    // Should be at least next month
    const now = new Date();
    expect(result.resetAt.getTime()).toBeGreaterThan(now.getTime());
  });
});

// ============================================
// GET /api/ai/usage tests
// ============================================
describe("GET /api/ai/usage", () => {
  let GET: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/ai/usage/route");
    GET = mod.GET;
  });

  it("returns correct usage counts per feature bucket", async () => {
    const user = {
      ...createMockUser(),
      restaurant: { id: "rest_1", planTier: "STARTER" as const },
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.aiUsageLog.count
      .mockResolvedValueOnce(12) // chat
      .mockResolvedValueOnce(3)  // parse
      .mockResolvedValueOnce(34); // search

    const res = await GET(createRequest("http://localhost/api/ai/usage"));
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.data.tier).toBe("STARTER");
    expect(data.data.features.chat).toEqual({
      used: 12,
      limit: 50,
      remaining: 38,
    });
    expect(data.data.features.parse).toEqual({
      used: 3,
      limit: 10,
      remaining: 7,
    });
    expect(data.data.features.search).toEqual({
      used: 34,
      limit: 200,
      remaining: 166,
    });
    expect(data.data.periodStart).toBeDefined();
    expect(data.data.resetAt).toBeDefined();
  });

  it("returns 401 without auth", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const res = await GET(createRequest("http://localhost/api/ai/usage"));
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });

  it("returns 404 without restaurant", async () => {
    const user = createMockUser({ restaurantId: null });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...user,
      restaurant: null,
    } as any);

    const res = await GET(createRequest("http://localhost/api/ai/usage"));
    const { status } = await parseResponse(res);

    expect(status).toBe(404);
  });
});
