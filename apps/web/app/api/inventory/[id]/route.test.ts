import { describe, it, expect, beforeEach } from "vitest";
import { GET, PATCH, DELETE } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUserWithRestaurant,
  createMockInventoryItem,
} from "@/__tests__/fixtures";
import { createRequest, createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

const mockParams = { params: Promise.resolve({ id: "inv_item_1" }) };

describe("GET /api/inventory/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(
      createRequest("http://localhost/api/inventory/inv_item_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when item not found", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.inventoryItem.findFirst.mockResolvedValueOnce(null);

    const response = await GET(
      createRequest("http://localhost/api/inventory/inv_item_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Item not found");
  });

  it("returns item with logs", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const item = {
      ...createMockInventoryItem(),
      supplierProduct: null,
      logs: [
        {
          id: "log_1",
          changeType: "RECEIVED",
          quantity: new Decimal("50"),
          previousQuantity: new Decimal("0"),
          newQuantity: new Decimal("50"),
          notes: "Initial inventory",
          reference: null,
          createdBy: { firstName: "Test", lastName: "User" },
          createdAt: new Date("2024-01-01"),
        },
      ],
    };
    prismaMock.inventoryItem.findFirst.mockResolvedValueOnce(item as any);

    const response = await GET(
      createRequest("http://localhost/api/inventory/inv_item_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.data.currentQuantity).toBe("number");
    expect(data.data.logs).toHaveLength(1);
    expect(typeof data.data.logs[0].quantity).toBe("number");
    expect(data.data.logs[0].changeType).toBe("RECEIVED");
  });
});

describe("PATCH /api/inventory/[id]", () => {
  beforeEach(() => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await PATCH(
      createJsonRequest("http://localhost/api/inventory/inv_item_1", { name: "Updated" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when item not found", async () => {
    prismaMock.inventoryItem.findFirst.mockResolvedValueOnce(null);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/inventory/inv_item_1", { name: "Updated" }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Item not found");
  });

  it("RECEIVED adds to quantity", async () => {
    const existingItem = createMockInventoryItem({ currentQuantity: new Decimal("50") });
    prismaMock.inventoryItem.findFirst.mockResolvedValueOnce(existingItem as any);
    prismaMock.inventoryItem.update.mockResolvedValueOnce({} as any);
    prismaMock.inventoryLog.create.mockResolvedValueOnce({} as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/inventory/inv_item_1", {
        adjustQuantity: 20,
        changeType: "RECEIVED",
      }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.previousQuantity).toBe(50);
    expect(data.data.newQuantity).toBe(70);
  });

  it("USED subtracts from quantity", async () => {
    const existingItem = createMockInventoryItem({ currentQuantity: new Decimal("50") });
    prismaMock.inventoryItem.findFirst.mockResolvedValueOnce(existingItem as any);
    prismaMock.inventoryItem.update.mockResolvedValueOnce({} as any);
    prismaMock.inventoryLog.create.mockResolvedValueOnce({} as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/inventory/inv_item_1", {
        adjustQuantity: 10,
        changeType: "USED",
      }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.previousQuantity).toBe(50);
    expect(data.data.newQuantity).toBe(40);
  });

  it("WASTE subtracts from quantity", async () => {
    const existingItem = createMockInventoryItem({ currentQuantity: new Decimal("50") });
    prismaMock.inventoryItem.findFirst.mockResolvedValueOnce(existingItem as any);
    prismaMock.inventoryItem.update.mockResolvedValueOnce({} as any);
    prismaMock.inventoryLog.create.mockResolvedValueOnce({} as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/inventory/inv_item_1", {
        adjustQuantity: 5,
        changeType: "WASTE",
      }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.previousQuantity).toBe(50);
    expect(data.data.newQuantity).toBe(45);
  });

  it("COUNT sets absolute quantity", async () => {
    const existingItem = createMockInventoryItem({ currentQuantity: new Decimal("50") });
    prismaMock.inventoryItem.findFirst.mockResolvedValueOnce(existingItem as any);
    prismaMock.inventoryItem.update.mockResolvedValueOnce({} as any);
    prismaMock.inventoryLog.create.mockResolvedValueOnce({} as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/inventory/inv_item_1", {
        adjustQuantity: 30,
        changeType: "COUNT",
      }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.previousQuantity).toBe(50);
    expect(data.data.newQuantity).toBe(30);
  });

  it("floors quantity at 0 (no negative)", async () => {
    const existingItem = createMockInventoryItem({ currentQuantity: new Decimal("5") });
    prismaMock.inventoryItem.findFirst.mockResolvedValueOnce(existingItem as any);
    prismaMock.inventoryItem.update.mockResolvedValueOnce({} as any);
    prismaMock.inventoryLog.create.mockResolvedValueOnce({} as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/inventory/inv_item_1", {
        adjustQuantity: 20,
        changeType: "USED",
      }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.newQuantity).toBe(0);
  });

  it("creates inventory log entry", async () => {
    const existingItem = createMockInventoryItem({ currentQuantity: new Decimal("50") });
    prismaMock.inventoryItem.findFirst.mockResolvedValueOnce(existingItem as any);
    prismaMock.inventoryItem.update.mockResolvedValueOnce({} as any);
    prismaMock.inventoryLog.create.mockResolvedValueOnce({} as any);

    await PATCH(
      createJsonRequest("http://localhost/api/inventory/inv_item_1", {
        adjustQuantity: 10,
        changeType: "RECEIVED",
        adjustmentNotes: "New shipment",
      }, "PATCH"),
      mockParams
    );

    expect(prismaMock.inventoryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          inventoryItemId: "inv_item_1",
          changeType: "RECEIVED",
          quantity: 10,
          previousQuantity: 50,
          newQuantity: 60,
          notes: "New shipment",
          createdById: "user_1",
        }),
      })
    );
  });

  it("updates item fields when no adjustQuantity", async () => {
    const existingItem = createMockInventoryItem();
    prismaMock.inventoryItem.findFirst.mockResolvedValueOnce(existingItem as any);

    const updatedItem = {
      ...existingItem,
      name: "Updated Tomatoes",
      parLevel: new Decimal("30"),
    };
    prismaMock.inventoryItem.update.mockResolvedValueOnce(updatedItem as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/inventory/inv_item_1", {
        name: "Updated Tomatoes",
        parLevel: 30,
      }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe("Updated Tomatoes");
    expect(typeof data.data.currentQuantity).toBe("number");
  });

  it("returns updated item with Decimal conversion", async () => {
    const existingItem = createMockInventoryItem();
    prismaMock.inventoryItem.findFirst.mockResolvedValueOnce(existingItem as any);

    const updatedItem = {
      ...existingItem,
      location: "Pantry",
    };
    prismaMock.inventoryItem.update.mockResolvedValueOnce(updatedItem as any);

    const response = await PATCH(
      createJsonRequest("http://localhost/api/inventory/inv_item_1", {
        location: "Pantry",
      }, "PATCH"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(typeof data.data.currentQuantity).toBe("number");
    expect(typeof data.data.parLevel).toBe("number");
  });
});

describe("DELETE /api/inventory/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await DELETE(
      createRequest("http://localhost/api/inventory/inv_item_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when item not found", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
    prismaMock.inventoryItem.findFirst.mockResolvedValueOnce(null);

    const response = await DELETE(
      createRequest("http://localhost/api/inventory/inv_item_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Item not found");
  });

  it("deletes item successfully", async () => {
    const user = createMockUserWithRestaurant();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const item = createMockInventoryItem();
    prismaMock.inventoryItem.findFirst.mockResolvedValueOnce(item as any);
    prismaMock.inventoryItem.delete.mockResolvedValueOnce(item as any);

    const response = await DELETE(
      createRequest("http://localhost/api/inventory/inv_item_1"),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.inventoryItem.delete).toHaveBeenCalledWith({
      where: { id: "inv_item_1" },
    });
  });
});
