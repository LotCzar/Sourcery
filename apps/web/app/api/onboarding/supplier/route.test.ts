import { describe, it, expect, beforeEach } from "vitest";
import { prismaMock } from "@/__tests__/mocks/prisma";
import { mockAuth, mockCurrentUser } from "@/__tests__/mocks/clerk";
import { createMockUser, createMockSupplier } from "@/__tests__/fixtures";
import { createJsonRequest, parseResponse } from "@/__tests__/helpers";
import { POST } from "./route";

describe("POST /api/onboarding/supplier", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
    mockCurrentUser.mockResolvedValue({
      id: "clerk_test_user_123",
      firstName: "Test",
      lastName: "User",
      emailAddresses: [{ emailAddress: "test@supplier.com" }],
    });
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValueOnce({ userId: null });

    const request = createJsonRequest("http://localhost/api/onboarding/supplier", {
      companyName: "Test Supplier",
    });
    const response = await POST(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns 404 when currentUser returns null", async () => {
    mockCurrentUser.mockResolvedValueOnce(null);

    const request = createJsonRequest("http://localhost/api/onboarding/supplier", {
      companyName: "Test Supplier",
    });
    const response = await POST(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(404);
    expect(data.error).toBe("User not found");
  });

  it("returns early if user already has a supplier", async () => {
    const existingUser = {
      ...createMockUser({ supplierId: "sup_1" }),
      supplier: createMockSupplier(),
    };
    prismaMock.user.findUnique.mockResolvedValueOnce(existingUser as any);

    const request = createJsonRequest("http://localhost/api/onboarding/supplier", {
      companyName: "New Supplier",
    });
    const response = await POST(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.supplier.id).toBe("sup_1");
    expect(data.supplier.name).toBe("Test Supplier");
    expect(prismaMock.supplier.create).not.toHaveBeenCalled();
  });

  it("creates new supplier when no existing one found", async () => {
    const existingUser = {
      ...createMockUser({ supplierId: null }),
      supplier: null,
    };
    const dbUser = createMockUser({ role: "SUPPLIER_ADMIN", supplierId: null });
    const newSupplier = createMockSupplier({ id: "sup_new", name: "Fresh Supplier" });

    prismaMock.user.findUnique.mockResolvedValueOnce(existingUser as any);
    prismaMock.user.upsert.mockResolvedValueOnce(dbUser as any);
    prismaMock.supplier.findUnique.mockResolvedValueOnce(null);
    prismaMock.supplier.create.mockResolvedValueOnce(newSupplier as any);
    prismaMock.user.update.mockResolvedValueOnce(dbUser as any);

    const request = createJsonRequest("http://localhost/api/onboarding/supplier", {
      companyName: "Fresh Supplier",
      email: "fresh@supplier.com",
    });
    const response = await POST(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.supplier.name).toBe("Fresh Supplier");
    expect(prismaMock.supplier.create).toHaveBeenCalled();
  });

  it("links existing supplier by email match", async () => {
    const existingUser = {
      ...createMockUser({ supplierId: null }),
      supplier: null,
    };
    const dbUser = createMockUser({ role: "SUPPLIER_ADMIN" });
    const existingSupplier = createMockSupplier({ id: "sup_existing", name: "Existing Supplier" });

    prismaMock.user.findUnique.mockResolvedValueOnce(existingUser as any);
    prismaMock.user.upsert.mockResolvedValueOnce(dbUser as any);
    prismaMock.supplier.findUnique.mockResolvedValueOnce(existingSupplier as any);
    prismaMock.user.update.mockResolvedValueOnce(dbUser as any);

    const request = createJsonRequest("http://localhost/api/onboarding/supplier", {
      companyName: "Some Name",
      email: "orders@testsupplier.com",
    });
    const response = await POST(request);
    const { status, data } = await parseResponse(response);

    expect(status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.supplier.id).toBe("sup_existing");
    expect(prismaMock.supplier.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { supplierId: "sup_existing" },
      })
    );
  });

  it("sets user role to SUPPLIER_ADMIN", async () => {
    const existingUser = {
      ...createMockUser({ supplierId: null }),
      supplier: null,
    };
    const dbUser = createMockUser({ role: "SUPPLIER_ADMIN" });
    const newSupplier = createMockSupplier();

    prismaMock.user.findUnique.mockResolvedValueOnce(existingUser as any);
    prismaMock.user.upsert.mockResolvedValueOnce(dbUser as any);
    prismaMock.supplier.findUnique.mockResolvedValueOnce(null);
    prismaMock.supplier.create.mockResolvedValueOnce(newSupplier as any);
    prismaMock.user.update.mockResolvedValueOnce(dbUser as any);

    const request = createJsonRequest("http://localhost/api/onboarding/supplier", {
      companyName: "Test Supplier",
    });
    await POST(request);

    expect(prismaMock.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          role: "SUPPLIER_ADMIN",
        }),
        create: expect.objectContaining({
          role: "SUPPLIER_ADMIN",
        }),
      })
    );
  });
});
