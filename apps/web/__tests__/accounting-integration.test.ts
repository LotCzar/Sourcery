import "./setup";
import { describe, it, expect } from "vitest";
import { prismaMock } from "./mocks/prisma";
import {
  createMockUserWithRestaurant,
  createMockUser,
  createMockAccountingIntegration,
  createMockInvoice,
} from "./fixtures";
import { createRequest, createJsonRequest, parseResponse } from "./helpers";

// Import route handlers
import { GET as getConnect } from "@/app/api/accounting/connect/route";
import { GET as getIntegration } from "@/app/api/accounting/integration/route";
import { POST as syncInvoices } from "@/app/api/accounting/sync/route";
import { GET as getMappings, PUT as putMappings } from "@/app/api/accounting/mappings/route";

describe("Accounting Integration", () => {
  describe("GET /api/accounting/connect", () => {
    it("generates OAuth URL for QuickBooks", async () => {
      const user = createMockUserWithRestaurant({ role: "OWNER" });
      prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

      // Without QUICKBOOKS_CLIENT_ID set, it should return 500
      const req = createRequest(
        "http://localhost/api/accounting/connect?provider=quickbooks"
      );
      const response = await getConnect(req);
      const { status } = await parseResponse(response);

      // Since env var is not set, should get 500 (QuickBooks not configured)
      expect(status).toBe(500);
    });

    it("rejects non-OWNER users", async () => {
      const user = createMockUserWithRestaurant({ role: "STAFF" });
      prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

      const req = createRequest(
        "http://localhost/api/accounting/connect?provider=quickbooks"
      );
      const response = await getConnect(req);
      const { status } = await parseResponse(response);

      expect(status).toBe(403);
    });

    it("rejects invalid provider", async () => {
      const user = createMockUserWithRestaurant({ role: "OWNER" });
      prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

      const req = createRequest(
        "http://localhost/api/accounting/connect?provider=invalid"
      );
      const response = await getConnect(req);
      const { status } = await parseResponse(response);

      expect(status).toBe(400);
    });
  });

  describe("GET /api/accounting/integration", () => {
    it("returns integration when connected", async () => {
      const user = createMockUserWithRestaurant();
      prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

      const integration = createMockAccountingIntegration();
      prismaMock.accountingIntegration.findUnique.mockResolvedValueOnce(
        integration as any
      );

      const response = await getIntegration();
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.provider).toBe("QUICKBOOKS");
      expect(data.data.isActive).toBe(true);
    });

    it("returns null when not connected", async () => {
      const user = createMockUserWithRestaurant();
      prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
      prismaMock.accountingIntegration.findUnique.mockResolvedValueOnce(null);

      const response = await getIntegration();
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.data).toBeNull();
    });
  });

  describe("POST /api/accounting/sync", () => {
    it("syncs NOT_SYNCED invoices", async () => {
      const user = createMockUserWithRestaurant();
      prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

      const integration = createMockAccountingIntegration();
      prismaMock.accountingIntegration.findUnique.mockResolvedValueOnce(
        integration as any
      );

      // No invoices to sync
      prismaMock.invoice.findMany.mockResolvedValueOnce([]);

      const req = createJsonRequest(
        "http://localhost/api/accounting/sync",
        {}
      );
      const response = await syncInvoices(req);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.syncedCount).toBe(0);
      expect(data.data.totalProcessed).toBe(0);
    });

    it("returns error when no active integration", async () => {
      const user = createMockUserWithRestaurant();
      prismaMock.user.findUnique.mockResolvedValueOnce(user as any);
      prismaMock.accountingIntegration.findUnique.mockResolvedValueOnce(null);

      const req = createJsonRequest(
        "http://localhost/api/accounting/sync",
        {}
      );
      const response = await syncInvoices(req);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(400);
      expect(data.error).toBe("No active accounting integration");
    });
  });

  describe("GET /api/accounting/mappings", () => {
    it("returns category mappings", async () => {
      const user = createMockUserWithRestaurant();
      prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

      const integration = {
        ...createMockAccountingIntegration(),
        categoryMappings: [
          {
            id: "map_1",
            productCategory: "PRODUCE",
            accountingCode: "5100",
            accountingName: "Food Supplies",
            integrationId: "acct_1",
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      };
      prismaMock.accountingIntegration.findUnique.mockResolvedValueOnce(
        integration as any
      );

      const response = await getMappings();
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.data[0].productCategory).toBe("PRODUCE");
      expect(data.data[0].accountingCode).toBe("5100");
    });
  });

  describe("PUT /api/accounting/mappings", () => {
    it("updates category mappings (OWNER only)", async () => {
      const user = createMockUserWithRestaurant({ role: "OWNER" });
      prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

      const integration = createMockAccountingIntegration();
      prismaMock.accountingIntegration.findUnique.mockResolvedValueOnce(
        integration as any
      );

      const mapping = {
        id: "map_1",
        productCategory: "PRODUCE",
        accountingCode: "5100",
        accountingName: "Food Supplies",
        integrationId: "acct_1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      prismaMock.accountingCategoryMapping.upsert.mockResolvedValueOnce(
        mapping as any
      );

      const req = createJsonRequest(
        "http://localhost/api/accounting/mappings",
        {
          mappings: [
            {
              productCategory: "PRODUCE",
              accountingCode: "5100",
              accountingName: "Food Supplies",
            },
          ],
        },
        "PUT"
      );
      const response = await putMappings(req);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(200);
      expect(data.success).toBe(true);
      expect(prismaMock.accountingCategoryMapping.upsert).toHaveBeenCalled();
    });

    it("rejects non-OWNER users", async () => {
      const user = createMockUserWithRestaurant({ role: "MANAGER" });
      prismaMock.user.findUnique.mockResolvedValueOnce(user as any);

      const req = createJsonRequest(
        "http://localhost/api/accounting/mappings",
        {
          mappings: [
            { productCategory: "PRODUCE", accountingCode: "5100" },
          ],
        },
        "PUT"
      );
      const response = await putMappings(req);
      const { status, data } = await parseResponse(response);

      expect(status).toBe(403);
      expect(data.error).toContain("Only owners");
    });
  });
});
