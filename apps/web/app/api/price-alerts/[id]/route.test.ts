import { describe, it, expect, beforeEach } from "vitest";
import { DELETE, PATCH } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockUser,
  createMockPriceAlert,
  createMockProduct,
} from "@/__tests__/fixtures";
import {
  createRequest,
  createJsonRequest,
  parseResponse,
} from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

const mockParams = { params: Promise.resolve({ id: "alert_1" }) };

describe("DELETE /api/price-alerts/[id]", () => {
  beforeEach(() => {
    const user = createMockUser();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await DELETE(
      createRequest("http://localhost/api/price-alerts/alert_1", {
        method: "DELETE",
      }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when alert not found", async () => {
    prismaMock.priceAlert.findFirst.mockResolvedValueOnce(null);

    const response = await DELETE(
      createRequest("http://localhost/api/price-alerts/alert_1", {
        method: "DELETE",
      }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Alert not found");
  });

  it("deletes alert successfully", async () => {
    const alert = createMockPriceAlert();
    prismaMock.priceAlert.findFirst.mockResolvedValueOnce(alert as any);
    prismaMock.priceAlert.delete.mockResolvedValueOnce(alert as any);

    const response = await DELETE(
      createRequest("http://localhost/api/price-alerts/alert_1", {
        method: "DELETE",
      }),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Alert deleted successfully");
    expect(prismaMock.priceAlert.delete).toHaveBeenCalledWith({
      where: { id: "alert_1" },
    });
  });
});

describe("PATCH /api/price-alerts/[id]", () => {
  beforeEach(() => {
    const user = createMockUser();
    prismaMock.user.findUnique.mockResolvedValue(user as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await PATCH(
      createJsonRequest(
        "http://localhost/api/price-alerts/alert_1",
        { isActive: false },
        "PATCH"
      ),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when alert not found", async () => {
    prismaMock.priceAlert.findFirst.mockResolvedValueOnce(null);

    const response = await PATCH(
      createJsonRequest(
        "http://localhost/api/price-alerts/alert_1",
        { isActive: false },
        "PATCH"
      ),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Alert not found");
  });

  it("updates isActive to false (deactivate)", async () => {
    const existingAlert = createMockPriceAlert({ isActive: true });
    prismaMock.priceAlert.findFirst.mockResolvedValueOnce(existingAlert as any);

    const updatedAlert = {
      ...createMockPriceAlert({ isActive: false }),
      product: {
        ...createMockProduct(),
        supplier: { id: "sup_1", name: "Test Supplier" },
      },
    };
    prismaMock.priceAlert.update.mockResolvedValueOnce(updatedAlert as any);

    const response = await PATCH(
      createJsonRequest(
        "http://localhost/api/price-alerts/alert_1",
        { isActive: false },
        "PATCH"
      ),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.isActive).toBe(false);
  });

  it("updates targetPrice", async () => {
    const existingAlert = createMockPriceAlert();
    prismaMock.priceAlert.findFirst.mockResolvedValueOnce(existingAlert as any);

    const updatedAlert = {
      ...createMockPriceAlert({ targetPrice: new Decimal("2.99") }),
      product: {
        ...createMockProduct(),
        supplier: { id: "sup_1", name: "Test Supplier" },
      },
    };
    prismaMock.priceAlert.update.mockResolvedValueOnce(updatedAlert as any);

    const response = await PATCH(
      createJsonRequest(
        "http://localhost/api/price-alerts/alert_1",
        { targetPrice: 2.99 },
        "PATCH"
      ),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(typeof data.data.targetPrice).toBe("number");
  });

  it("updates alertType", async () => {
    const existingAlert = createMockPriceAlert();
    prismaMock.priceAlert.findFirst.mockResolvedValueOnce(existingAlert as any);

    const updatedAlert = {
      ...createMockPriceAlert({ alertType: "PRICE_INCREASE" }),
      product: {
        ...createMockProduct(),
        supplier: { id: "sup_1", name: "Test Supplier" },
      },
    };
    prismaMock.priceAlert.update.mockResolvedValueOnce(updatedAlert as any);

    const response = await PATCH(
      createJsonRequest(
        "http://localhost/api/price-alerts/alert_1",
        { alertType: "PRICE_INCREASE" },
        "PATCH"
      ),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.alertType).toBe("PRICE_INCREASE");
  });

  it("reactivating clears triggeredAt and triggeredPrice", async () => {
    const existingAlert = createMockPriceAlert({
      isActive: false,
      triggeredAt: new Date("2024-02-01"),
      triggeredPrice: new Decimal("3.25"),
    });
    prismaMock.priceAlert.findFirst.mockResolvedValueOnce(existingAlert as any);

    const updatedAlert = {
      ...createMockPriceAlert({
        isActive: true,
        triggeredAt: null,
        triggeredPrice: null,
      }),
      product: {
        ...createMockProduct(),
        supplier: { id: "sup_1", name: "Test Supplier" },
      },
    };
    prismaMock.priceAlert.update.mockResolvedValueOnce(updatedAlert as any);

    await PATCH(
      createJsonRequest(
        "http://localhost/api/price-alerts/alert_1",
        { isActive: true },
        "PATCH"
      ),
      mockParams
    );

    expect(prismaMock.priceAlert.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isActive: true,
          triggeredAt: null,
          triggeredPrice: null,
        }),
      })
    );
  });

  it("returns updated alert with product info and Decimal conversion", async () => {
    const existingAlert = createMockPriceAlert();
    prismaMock.priceAlert.findFirst.mockResolvedValueOnce(existingAlert as any);

    const updatedAlert = {
      ...createMockPriceAlert({
        triggeredPrice: new Decimal("3.00"),
        triggeredAt: new Date("2024-02-01"),
      }),
      product: {
        ...createMockProduct(),
        supplier: { id: "sup_1", name: "Test Supplier" },
      },
    };
    prismaMock.priceAlert.update.mockResolvedValueOnce(updatedAlert as any);

    const response = await PATCH(
      createJsonRequest(
        "http://localhost/api/price-alerts/alert_1",
        { isActive: false },
        "PATCH"
      ),
      mockParams
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(typeof data.data.targetPrice).toBe("number");
    expect(typeof data.data.triggeredPrice).toBe("number");
    expect(typeof data.data.product.currentPrice).toBe("number");
    expect(data.data.product.supplier.name).toBe("Test Supplier");
  });
});
