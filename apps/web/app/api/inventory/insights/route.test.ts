import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import { createMockUserWithRestaurant } from "@/__tests__/fixtures";
import { createRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";
import { GET } from "./route";

function createMockConsumptionInsight(overrides?: Record<string, unknown>) {
  return {
    id: "insight_1",
    inventoryItemId: "inv_item_1",
    restaurantId: "rest_1",
    avgDailyUsage: new Decimal("5.00"),
    avgWeeklyUsage: new Decimal("35.00"),
    trendDirection: "STABLE",
    daysUntilStockout: new Decimal("10"),
    suggestedParLevel: new Decimal("25.00"),
    dataPointCount: 30,
    periodDays: 30,
    lastAnalyzedAt: new Date("2024-01-15"),
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-15"),
    inventoryItem: {
      id: "inv_item_1",
      name: "Tomatoes",
      category: "PRODUCE",
      currentQuantity: new Decimal("50.00"),
      unit: "POUND",
      parLevel: new Decimal("20.00"),
    },
    ...overrides,
  };
}

describe("GET /api/inventory/insights", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(
      createRequest("http://localhost/api/inventory/insights") as any
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when restaurant not found", async () => {
    const user = { ...createMockUserWithRestaurant(), restaurant: null };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const response = await GET(
      createRequest("http://localhost/api/inventory/insights") as any
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Restaurant not found");
  });

  it("returns insights with Decimal-to-Number conversion", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const insight = createMockConsumptionInsight();
    prismaMock.consumptionInsight.findMany.mockResolvedValueOnce([insight] as any);

    const response = await GET(
      createRequest("http://localhost/api/inventory/insights") as any
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(1);
    expect(typeof data.data[0].avgDailyUsage).toBe("number");
    expect(typeof data.data[0].avgWeeklyUsage).toBe("number");
    expect(typeof data.data[0].currentQuantity).toBe("number");
    expect(typeof data.data[0].daysUntilStockout).toBe("number");
    expect(typeof data.data[0].suggestedParLevel).toBe("number");
  });

  it("computes criticalItemCount for items with daysUntilStockout < 3", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const insights = [
      createMockConsumptionInsight({ id: "i1", daysUntilStockout: new Decimal("2") }),
      createMockConsumptionInsight({ id: "i2", daysUntilStockout: new Decimal("1") }),
      createMockConsumptionInsight({ id: "i3", daysUntilStockout: new Decimal("10") }),
    ];
    prismaMock.consumptionInsight.findMany.mockResolvedValueOnce(insights as any);

    const response = await GET(
      createRequest("http://localhost/api/inventory/insights") as any
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.summary.criticalItemCount).toBe(2);
  });

  it("computes parMismatchCount for >20% deviation", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const insights = [
      createMockConsumptionInsight({
        id: "i1",
        suggestedParLevel: new Decimal("30.00"),
        inventoryItem: {
          id: "inv_1",
          name: "Item1",
          category: "PRODUCE",
          currentQuantity: new Decimal("50"),
          unit: "POUND",
          parLevel: new Decimal("20.00"),
        },
      }),
      createMockConsumptionInsight({
        id: "i2",
        suggestedParLevel: new Decimal("21.00"),
        inventoryItem: {
          id: "inv_2",
          name: "Item2",
          category: "PRODUCE",
          currentQuantity: new Decimal("50"),
          unit: "POUND",
          parLevel: new Decimal("20.00"),
        },
      }),
    ];
    prismaMock.consumptionInsight.findMany.mockResolvedValueOnce(insights as any);

    const response = await GET(
      createRequest("http://localhost/api/inventory/insights") as any
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.summary.parMismatchCount).toBe(1);
  });

  it("filters by category and itemName query params", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.consumptionInsight.findMany.mockResolvedValueOnce([] as any);

    const response = await GET(
      createRequest("http://localhost/api/inventory/insights?category=PRODUCE&itemName=tomato") as any
    );
    const { status } = await parseResponse(response);

    expect(status).toBe(200);
    expect(prismaMock.consumptionInsight.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          restaurantId: "rest_1",
          inventoryItem: {
            category: "PRODUCE",
            name: { contains: "tomato", mode: "insensitive" },
          },
        }),
      })
    );
  });
});
