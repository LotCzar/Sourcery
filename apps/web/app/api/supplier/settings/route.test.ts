import { describe, it, expect } from "vitest";
import { GET, PATCH } from "./route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  createMockSupplierUserWithSupplier,
  createMockSupplier,
} from "@/__tests__/fixtures";
import { createRequest, createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { Decimal } from "@prisma/client/runtime/library";

describe("GET /api/supplier/settings", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when supplier not found", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce({
      ...createMockSupplierUserWithSupplier(),
      supplier: null,
    } as any);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Supplier not found");
  });

  it("returns settings with Decimal→Number conversion", async () => {
    const user = {
      ...createMockSupplierUserWithSupplier(),
      supplier: {
        ...createMockSupplier(),
        deliveryZones: [
          {
            id: "zone_1",
            name: "Downtown",
            deliveryFee: new Decimal("5.00"),
            minimumOrder: new Decimal("25.00"),
            supplierId: "sup_1",
          },
        ],
      },
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const response = await GET();
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(typeof data.data.minimumOrder).toBe("number");
    expect(typeof data.data.deliveryFee).toBe("number");
    expect(typeof data.data.rating).toBe("number");
    expect(data.data.deliveryZones).toHaveLength(1);
    expect(typeof data.data.deliveryZones[0].deliveryFee).toBe("number");
  });
});

describe("PATCH /api/supplier/settings", () => {
  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await PATCH(
      createJsonRequest("http://localhost/api/supplier/settings", { name: "New Name" }, "PATCH")
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("updates supplier fields", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const updated = createMockSupplier({
      name: "Updated Supplier",
      phone: "512-555-9999",
    });
    prismaMock.supplier.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest(
        "http://localhost/api/supplier/settings",
        { name: "Updated Supplier", phone: "512-555-9999" },
        "PATCH"
      )
    );
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.supplier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sup_1" },
        data: expect.objectContaining({
          name: "Updated Supplier",
          phone: "512-555-9999",
        }),
      })
    );
  });

  it("returns updated settings with Decimal→Number", async () => {
    const user = createMockSupplierUserWithSupplier();
    prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

    const updated = createMockSupplier({
      minimumOrder: new Decimal("75.00"),
      deliveryFee: new Decimal("15.00"),
    });
    prismaMock.supplier.update.mockResolvedValueOnce(updated as any);

    const response = await PATCH(
      createJsonRequest(
        "http://localhost/api/supplier/settings",
        { minimumOrder: "75.00", deliveryFee: "15.00" },
        "PATCH"
      )
    );
    const { data } = await parseResponse(response);

    expect(typeof data.data.minimumOrder).toBe("number");
    expect(typeof data.data.deliveryFee).toBe("number");
    expect(typeof data.data.rating).toBe("number");
  });
});
