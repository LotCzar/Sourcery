import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUser,
  createMockOrgAdmin,
  createMockRestaurant,
} from "@/__tests__/fixtures";
import { createRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

describe("GET /api/org/restaurants", () => {
  let GET: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    const mod = await import("@/app/api/org/restaurants/route");
    GET = mod.GET;
  });

  it("returns 401 unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const res = await GET(createRequest("http://localhost/api/org/restaurants"));
    const { status } = await parseResponse(res);

    expect(status).toBe(401);
  });

  it("returns 403 for non-ORG_ADMIN", async () => {
    const user = createMockUser({ role: "OWNER" });
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const res = await GET(createRequest("http://localhost/api/org/restaurants"));
    const { status } = await parseResponse(res);

    expect(status).toBe(403);
  });

  it("returns restaurants with metrics", async () => {
    const user = createMockOrgAdmin();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    prismaMock.restaurant.findMany.mockResolvedValueOnce([
      {
        ...createMockRestaurant({ id: "rest_1", name: "Downtown" }),
        users: [{ id: "user_1" }],
        inventoryItems: [
          {
            id: "inv_1",
            currentQuantity: new Decimal("5.000"),
            parLevel: new Decimal("20.000"),
          },
        ],
      },
    ] as any);

    prismaMock.order.findMany.mockResolvedValueOnce([
      { total: new Decimal("250.00") },
      { total: new Decimal("150.00") },
    ] as any);

    const res = await GET(createRequest("http://localhost/api/org/restaurants"));
    const { status, data } = await parseResponse(res);

    expect(status).toBe(200);
    expect(data.data.restaurants).toHaveLength(1);
    expect(data.data.restaurants[0].mtdSpend).toBe(400);
    expect(data.data.restaurants[0].orderCount).toBe(2);
    expect(data.data.restaurants[0].lowStockCount).toBe(1);
  });

  it("only returns restaurants in user's org", async () => {
    const user = createMockOrgAdmin();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    // Only org restaurants returned (filtering done by query)
    prismaMock.restaurant.findMany.mockResolvedValueOnce([
      {
        ...createMockRestaurant({ id: "rest_1" }),
        users: [],
        inventoryItems: [],
      },
    ] as any);

    prismaMock.order.findMany.mockResolvedValueOnce([]);

    const res = await GET(createRequest("http://localhost/api/org/restaurants"));
    const { data } = await parseResponse(res);

    // Verify the query was scoped to the org
    expect(prismaMock.restaurant.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: "org_1",
        }),
      })
    );
    expect(data.data.restaurants).toHaveLength(1);
  });
});
