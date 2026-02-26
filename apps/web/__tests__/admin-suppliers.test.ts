import { describe, it, expect, beforeEach } from "vitest";
import { GET, PATCH } from "@/app/api/admin/suppliers/route";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth } from "@/__tests__/mocks/clerk";
import { mockSendEmail, mockEmailTemplates } from "@/__tests__/mocks/email";
import {
  createMockUser,
  createMockSupplier,
} from "@/__tests__/fixtures";
import { createRequest, createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { NextRequest } from "next/server";

function createGetRequest(status?: string): NextRequest {
  const url = status
    ? `http://localhost:3000/api/admin/suppliers?status=${status}`
    : "http://localhost:3000/api/admin/suppliers";
  return new NextRequest(url);
}

describe("GET /api/admin/suppliers", () => {
  beforeEach(() => {
    const ownerUser = createMockUser({ role: "OWNER" });
    prismaMock.user.findUnique.mockResolvedValue(ownerUser as any);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const response = await GET(createGetRequest());
    const { status } = await parseResponse(response);

    expect(status).toBe(401);
  });

  it("returns 403 for STAFF role", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(
      createMockUser({ role: "STAFF" }) as any
    );

    const response = await GET(createGetRequest());
    const { status } = await parseResponse(response);

    expect(status).toBe(403);
  });

  it("returns 403 for MANAGER role", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(
      createMockUser({ role: "MANAGER" }) as any
    );

    const response = await GET(createGetRequest());
    const { status } = await parseResponse(response);

    expect(status).toBe(403);
  });

  it("returns all suppliers", async () => {
    const suppliers = [
      createMockSupplier({ id: "sup_1", status: "PENDING", verifiedAt: null }),
      createMockSupplier({ id: "sup_2", status: "VERIFIED" }),
    ];
    prismaMock.supplier.findMany.mockResolvedValueOnce(suppliers as any);

    const response = await GET(createGetRequest());
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveLength(2);
  });

  it("filters by status", async () => {
    prismaMock.supplier.findMany.mockResolvedValueOnce([] as any);

    const response = await GET(createGetRequest("PENDING"));
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(prismaMock.supplier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING" },
      })
    );
  });

  it("allows ORG_ADMIN access", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(
      createMockUser({ role: "ORG_ADMIN" }) as any
    );
    prismaMock.supplier.findMany.mockResolvedValueOnce([] as any);

    const response = await GET(createGetRequest());
    const { status } = await parseResponse(response);

    expect(status).toBe(200);
  });
});

describe("PATCH /api/admin/suppliers", () => {
  beforeEach(() => {
    const ownerUser = createMockUser({ role: "OWNER" });
    prismaMock.user.findUnique.mockResolvedValue(ownerUser as any);
    mockSendEmail.mockClear();
    mockEmailTemplates.supplierVerified.mockClear();
    mockEmailTemplates.supplierRejected.mockClear();
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const request = createJsonRequest(
      "http://localhost:3000/api/admin/suppliers",
      { supplierId: "sup_1", action: "approve" },
      "PATCH"
    );

    const response = await PATCH(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(401);
  });

  it("returns 403 for STAFF role", async () => {
    prismaMock.user.findUnique.mockResolvedValueOnce(
      createMockUser({ role: "STAFF" }) as any
    );

    const request = createJsonRequest(
      "http://localhost:3000/api/admin/suppliers",
      { supplierId: "sup_1", action: "approve" },
      "PATCH"
    );

    const response = await PATCH(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(403);
  });

  it("returns 400 for invalid action", async () => {
    const request = createJsonRequest(
      "http://localhost:3000/api/admin/suppliers",
      { supplierId: "sup_1", action: "invalid" },
      "PATCH"
    );

    const response = await PATCH(request);
    const { status } = await parseResponse(response);

    expect(status).toBe(400);
  });

  it("returns 404 for missing supplier", async () => {
    prismaMock.supplier.findUnique.mockResolvedValueOnce(null);

    const request = createJsonRequest(
      "http://localhost:3000/api/admin/suppliers",
      { supplierId: "nonexistent", action: "approve" },
      "PATCH"
    );

    const response = await PATCH(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("Supplier not found");
  });

  it("approve sets VERIFIED + verifiedAt + sends email + creates notification", async () => {
    const supplier = createMockSupplier({ status: "PENDING", verifiedAt: null });
    prismaMock.supplier.findUnique.mockResolvedValueOnce(supplier as any);
    prismaMock.supplier.update.mockResolvedValueOnce({
      ...supplier,
      status: "VERIFIED",
      verifiedAt: new Date(),
    } as any);
    prismaMock.user.findMany.mockResolvedValueOnce([
      createMockUser({ id: "su_1", role: "SUPPLIER_ADMIN", supplierId: "sup_1" }),
    ] as any);
    prismaMock.notification.create.mockResolvedValueOnce({} as any);

    const request = createJsonRequest(
      "http://localhost:3000/api/admin/suppliers",
      { supplierId: "sup_1", action: "approve" },
      "PATCH"
    );

    const response = await PATCH(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.status).toBe("VERIFIED");
    expect(prismaMock.supplier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "VERIFIED",
          verifiedAt: expect.any(Date),
        }),
      })
    );
    expect(mockEmailTemplates.supplierVerified).toHaveBeenCalledWith(supplier.name);
    expect(mockSendEmail).toHaveBeenCalled();
    expect(prismaMock.notification.create).toHaveBeenCalled();
  });

  it("reject sets INACTIVE + sends email with notes", async () => {
    const supplier = createMockSupplier({ status: "PENDING", verifiedAt: null });
    prismaMock.supplier.findUnique.mockResolvedValueOnce(supplier as any);
    prismaMock.supplier.update.mockResolvedValueOnce({
      ...supplier,
      status: "INACTIVE",
    } as any);
    prismaMock.user.findMany.mockResolvedValueOnce([] as any);

    const request = createJsonRequest(
      "http://localhost:3000/api/admin/suppliers",
      { supplierId: "sup_1", action: "reject", notes: "Incomplete information" },
      "PATCH"
    );

    const response = await PATCH(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.status).toBe("INACTIVE");
    expect(mockEmailTemplates.supplierRejected).toHaveBeenCalledWith(
      supplier.name,
      "Incomplete information"
    );
    expect(mockSendEmail).toHaveBeenCalled();
  });

  it("suspend sets SUSPENDED without email", async () => {
    const supplier = createMockSupplier({ status: "VERIFIED" });
    prismaMock.supplier.findUnique.mockResolvedValueOnce(supplier as any);
    prismaMock.supplier.update.mockResolvedValueOnce({
      ...supplier,
      status: "SUSPENDED",
    } as any);
    prismaMock.user.findMany.mockResolvedValueOnce([] as any);

    const request = createJsonRequest(
      "http://localhost:3000/api/admin/suppliers",
      { supplierId: "sup_1", action: "suspend" },
      "PATCH"
    );

    const response = await PATCH(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.status).toBe("SUSPENDED");
    expect(mockEmailTemplates.supplierVerified).not.toHaveBeenCalled();
    expect(mockEmailTemplates.supplierRejected).not.toHaveBeenCalled();
  });

  it("reactivate sets VERIFIED + verifiedAt without email", async () => {
    const supplier = createMockSupplier({ status: "SUSPENDED" });
    prismaMock.supplier.findUnique.mockResolvedValueOnce(supplier as any);
    prismaMock.supplier.update.mockResolvedValueOnce({
      ...supplier,
      status: "VERIFIED",
      verifiedAt: new Date(),
    } as any);
    prismaMock.user.findMany.mockResolvedValueOnce([] as any);

    const request = createJsonRequest(
      "http://localhost:3000/api/admin/suppliers",
      { supplierId: "sup_1", action: "reactivate" },
      "PATCH"
    );

    const response = await PATCH(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.data.status).toBe("VERIFIED");
    expect(prismaMock.supplier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "VERIFIED",
          verifiedAt: expect.any(Date),
        }),
      })
    );
    expect(mockSendEmail).not.toHaveBeenCalled();
  });
});
