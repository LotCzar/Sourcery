import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import { createMockUser } from "@/__tests__/fixtures";
import { createRequest, parseResponse } from "@/__tests__/helpers";

describe("GET /api/ai/usage/analytics", () => {
  let GET: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/ai/usage/analytics/route");
    GET = mod.GET as any;
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const res = await GET(
      createRequest("http://localhost/api/ai/usage/analytics")
    );
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });

  it("returns 404 when user has no restaurant", async () => {
    const user = createMockUser({ restaurantId: null });
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...user,
      restaurant: null,
    } as any);

    const res = await GET(
      createRequest("http://localhost/api/ai/usage/analytics")
    );
    const { status } = await parseResponse(res);

    expect(status).toBe(404);
  });

  it("returns timeSeries and perUser with correct shape", async () => {
    const user = {
      ...createMockUser(),
      restaurant: { id: "rest_1", planTier: "PROFESSIONAL" },
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const now = new Date();
    prismaMock.aiUsageLog.findMany.mockResolvedValueOnce([
      {
        feature: "CHAT",
        userId: "user_1",
        inputTokens: 500,
        outputTokens: 200,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        createdAt: now,
      },
      {
        feature: "SEARCH",
        userId: "user_1",
        inputTokens: 100,
        outputTokens: 50,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        createdAt: now,
      },
    ] as any);

    prismaMock.user.findMany.mockResolvedValueOnce([
      { id: "user_1", firstName: "Test", lastName: "User" },
    ] as any);

    const res = await GET(
      createRequest("http://localhost/api/ai/usage/analytics?range=30")
    );
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.range).toBe(30);
    expect(data.data.totalRequests).toBe(2);
    expect(data.data.totalCost).toBeGreaterThan(0);
    expect(data.data.timeSeries).toHaveLength(30);

    // Each time-series entry has all feature keys
    const entry = data.data.timeSeries[0];
    expect(entry).toHaveProperty("date");
    expect(entry).toHaveProperty("CHAT");
    expect(entry).toHaveProperty("PARSE_MENU");
    expect(entry).toHaveProperty("PARSE_RECEIPT");
    expect(entry).toHaveProperty("SEARCH");
    expect(entry).toHaveProperty("WEEKLY_DIGEST");
    expect(entry).toHaveProperty("totalCost");

    // Per-user data
    expect(data.data.perUser).toHaveLength(1);
    expect(data.data.perUser[0]).toMatchObject({
      userId: "user_1",
      name: "Test User",
      requestCount: 2,
    });
  });

  it("defaults to 30-day range", async () => {
    const user = {
      ...createMockUser(),
      restaurant: { id: "rest_1", planTier: "PROFESSIONAL" },
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.aiUsageLog.findMany.mockResolvedValueOnce([]);

    const res = await GET(
      createRequest("http://localhost/api/ai/usage/analytics")
    );
    const { data } = await parseResponse(res);

    expect(data.data.range).toBe(30);
    expect(data.data.timeSeries).toHaveLength(30);
  });

  it("respects range=7", async () => {
    const user = {
      ...createMockUser(),
      restaurant: { id: "rest_1", planTier: "PROFESSIONAL" },
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.aiUsageLog.findMany.mockResolvedValueOnce([]);

    const res = await GET(
      createRequest("http://localhost/api/ai/usage/analytics?range=7")
    );
    const { data } = await parseResponse(res);

    expect(data.data.range).toBe(7);
    expect(data.data.timeSeries).toHaveLength(7);
  });

  it("handles null userId as System Jobs", async () => {
    const user = {
      ...createMockUser(),
      restaurant: { id: "rest_1", planTier: "PROFESSIONAL" },
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const now = new Date();
    prismaMock.aiUsageLog.findMany.mockResolvedValueOnce([
      {
        feature: "WEEKLY_DIGEST",
        userId: null,
        inputTokens: 200,
        outputTokens: 100,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        createdAt: now,
      },
    ] as any);

    // No user IDs to resolve (system only)

    const res = await GET(
      createRequest("http://localhost/api/ai/usage/analytics?range=30")
    );
    const { data } = await parseResponse(res);

    expect(data.data.perUser).toHaveLength(1);
    expect(data.data.perUser[0]).toMatchObject({
      userId: "__system__",
      name: "System Jobs",
      requestCount: 1,
    });
  });

  it("returns zero-filled time series when no data", async () => {
    const user = {
      ...createMockUser(),
      restaurant: { id: "rest_1", planTier: "PROFESSIONAL" },
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.aiUsageLog.findMany.mockResolvedValueOnce([]);

    const res = await GET(
      createRequest("http://localhost/api/ai/usage/analytics?range=7")
    );
    const { data } = await parseResponse(res);

    expect(data.data.totalRequests).toBe(0);
    expect(data.data.totalCost).toBe(0);
    expect(data.data.timeSeries).toHaveLength(7);
    expect(data.data.perUser).toHaveLength(0);

    // All entries should be zero
    for (const entry of data.data.timeSeries) {
      expect(entry.CHAT).toBe(0);
      expect(entry.PARSE_MENU).toBe(0);
      expect(entry.PARSE_RECEIPT).toBe(0);
      expect(entry.SEARCH).toBe(0);
      expect(entry.WEEKLY_DIGEST).toBe(0);
      expect(entry.totalCost).toBe(0);
    }
  });
});
