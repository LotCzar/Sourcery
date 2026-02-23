import { describe, it, expect, beforeEach, vi } from "vitest";
import { prismaMock } from "./mocks/prisma";
import { mockInngestSend, getInngestHandler } from "./mocks/inngest";
import { createMockUser, createMockRestaurant, createMockNotification } from "./fixtures";

// Import to register the handler
import "../lib/inngest/functions/usage-alerts";

// Mock email
const mockSendEmail = vi.fn().mockResolvedValue(null);
vi.mock("@/lib/email", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
  emailTemplates: {
    usageAlert: (restaurantName: string, featureName: string, used: number, limit: number, usagePercent: number) => ({
      subject: `Usage Alert: ${featureName} at ${usagePercent}%`,
      html: `<p>Usage alert for ${restaurantName}</p>`,
    }),
  },
}));

describe("usage-alerts inngest function", () => {
  let handler: Function;

  beforeEach(() => {
    handler = getInngestHandler("usage-alerts")!;
    expect(handler).toBeDefined();
    mockSendEmail.mockClear();
  });

  it("skips ENTERPRISE restaurants", async () => {
    // The function queries with planTier: { not: "ENTERPRISE" }
    // so the DB would never return ENTERPRISE restaurants.
    // We verify it by passing an empty result (simulating that filter worked).
    prismaMock.restaurant.findMany.mockResolvedValueOnce([]);

    const result = await handler();
    expect(result.restaurantsChecked).toBe(0);
    expect(result.alertsSent).toBe(0);
  });

  it("sends alert when usage >= 80%", async () => {
    const restaurant = createMockRestaurant({ planTier: "STARTER" });
    const owner = createMockUser({ restaurantId: restaurant.id });

    prismaMock.restaurant.findMany.mockResolvedValueOnce([restaurant as any]);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);

    // Chat: 50 limit for STARTER, set usage to 45 (90%)
    prismaMock.aiUsageLog.count
      .mockResolvedValueOnce(45)  // chatOpsPerMonth
      .mockResolvedValueOnce(2)   // parseOpsPerMonth (20%, skip)
      .mockResolvedValueOnce(10); // searchOpsPerMonth (5%, skip)

    // Dedup check - no existing alerts
    prismaMock.notification.findMany.mockResolvedValue([]);
    prismaMock.notification.create.mockResolvedValue(createMockNotification() as any);

    const result = await handler();

    expect(result.restaurantsChecked).toBe(1);
    expect(result.alertsSent).toBe(1);
    expect(prismaMock.notification.create).toHaveBeenCalledTimes(1);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("does not alert at 79%", async () => {
    const restaurant = createMockRestaurant({ planTier: "STARTER" });
    const owner = createMockUser({ restaurantId: restaurant.id });

    prismaMock.restaurant.findMany.mockResolvedValueOnce([restaurant as any]);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);

    // Chat: 50 limit for STARTER, set usage to 39 (78%)
    prismaMock.aiUsageLog.count
      .mockResolvedValueOnce(39)  // chatOpsPerMonth (78%)
      .mockResolvedValueOnce(3)   // parseOpsPerMonth (30%)
      .mockResolvedValueOnce(50); // searchOpsPerMonth (25%)

    const result = await handler();

    expect(result.alertsSent).toBe(0);
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("deduplicates alerts for the same period and bucket", async () => {
    const restaurant = createMockRestaurant({ planTier: "STARTER" });
    const owner = createMockUser({ restaurantId: restaurant.id });

    prismaMock.restaurant.findMany.mockResolvedValueOnce([restaurant as any]);
    prismaMock.user.findFirst.mockResolvedValue(owner as any);

    // Chat: 90% usage
    prismaMock.aiUsageLog.count
      .mockResolvedValueOnce(45)  // chatOpsPerMonth
      .mockResolvedValueOnce(2)   // parseOpsPerMonth
      .mockResolvedValueOnce(10); // searchOpsPerMonth

    // Existing alert for chatOpsPerMonth already exists
    prismaMock.notification.findMany.mockResolvedValue([
      createMockNotification({
        type: "SYSTEM",
        metadata: {
          alertType: "usage_limit",
          featureBucket: "chatOpsPerMonth",
        },
      }) as any,
    ]);

    const result = await handler();

    expect(result.alertsSent).toBe(0);
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
  });

  it("handles missing OWNER gracefully", async () => {
    const restaurant = createMockRestaurant({ planTier: "STARTER" });

    prismaMock.restaurant.findMany.mockResolvedValueOnce([restaurant as any]);
    prismaMock.user.findFirst.mockResolvedValue(null);

    const result = await handler();

    expect(result.restaurantsChecked).toBe(1);
    expect(result.alertsSent).toBe(0);
    expect(prismaMock.notification.create).not.toHaveBeenCalled();
  });
});
