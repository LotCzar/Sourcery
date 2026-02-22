import prisma from "@/lib/prisma";

interface SyncResult {
  externalId: string;
}

interface AccountingAccount {
  id: string;
  name: string;
  code: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface AccountingService {
  syncInvoice(invoice: any, integration: any): Promise<SyncResult>;
  getChartOfAccounts(integration: any): Promise<AccountingAccount[]>;
  refreshTokens(integration: any): Promise<TokenPair>;
}

class QuickBooksService implements AccountingService {
  async syncInvoice(invoice: any, integration: any): Promise<SyncResult> {
    const tokens = await this.ensureValidTokens(integration);

    const qbInvoice = {
      Line: [
        {
          Amount: Number(invoice.total),
          DetailType: "SalesItemLineDetail",
          SalesItemLineDetail: {
            ItemRef: { name: "Services" },
          },
          Description: `FreshSheet Invoice ${invoice.invoiceNumber}`,
        },
      ],
      CustomerRef: {
        name: invoice.supplier?.name || "Unknown Supplier",
      },
      DocNumber: invoice.invoiceNumber,
      TxnDate: invoice.issueDate?.toISOString().split("T")[0],
      DueDate: invoice.dueDate?.toISOString().split("T")[0],
    };

    const response = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${integration.realmId}/invoice`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(qbInvoice),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`QuickBooks sync failed: ${error}`);
    }

    const data = await response.json();
    return { externalId: data.Invoice.Id };
  }

  async getChartOfAccounts(integration: any): Promise<AccountingAccount[]> {
    const tokens = await this.ensureValidTokens(integration);

    const response = await fetch(
      `https://quickbooks.api.intuit.com/v3/company/${integration.realmId}/query?query=SELECT * FROM Account WHERE AccountType = 'Expense'`,
      {
        headers: {
          Authorization: `Bearer ${tokens.accessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    return (data.QueryResponse?.Account || []).map((a: any) => ({
      id: a.Id,
      name: a.Name,
      code: a.AcctNum || a.Id,
    }));
  }

  async refreshTokens(integration: any): Promise<TokenPair> {
    const clientId = process.env.QUICKBOOKS_CLIENT_ID;
    const clientSecret = process.env.QUICKBOOKS_CLIENT_SECRET;

    const response = await fetch("https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: integration.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh QuickBooks tokens");
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  private async ensureValidTokens(integration: any): Promise<TokenPair> {
    // Refresh tokens proactively
    try {
      const tokens = await this.refreshTokens(integration);
      await prisma.accountingIntegration.update({
        where: { id: integration.id },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
      return tokens;
    } catch {
      return {
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
      };
    }
  }
}

class XeroService implements AccountingService {
  async syncInvoice(invoice: any, integration: any): Promise<SyncResult> {
    const tokens = await this.ensureValidTokens(integration);

    const xeroInvoice = {
      Type: "ACCPAY",
      Contact: { Name: invoice.supplier?.name || "Unknown Supplier" },
      LineItems: [
        {
          Description: `FreshSheet Invoice ${invoice.invoiceNumber}`,
          Quantity: 1,
          UnitAmount: Number(invoice.total),
          AccountCode: "200",
        },
      ],
      InvoiceNumber: invoice.invoiceNumber,
      Date: invoice.issueDate?.toISOString().split("T")[0],
      DueDate: invoice.dueDate?.toISOString().split("T")[0],
      Status: "AUTHORISED",
    };

    const response = await fetch("https://api.xero.com/api.xro/2.0/Invoices", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Xero-Tenant-Id": integration.tenantId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ Invoices: [xeroInvoice] }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Xero sync failed: ${error}`);
    }

    const data = await response.json();
    return { externalId: data.Invoices[0].InvoiceID };
  }

  async getChartOfAccounts(integration: any): Promise<AccountingAccount[]> {
    const tokens = await this.ensureValidTokens(integration);

    const response = await fetch("https://api.xero.com/api.xro/2.0/Accounts?where=Type==%22EXPENSE%22", {
      headers: {
        Authorization: `Bearer ${tokens.accessToken}`,
        "Xero-Tenant-Id": integration.tenantId,
      },
    });

    if (!response.ok) return [];

    const data = await response.json();
    return (data.Accounts || []).map((a: any) => ({
      id: a.AccountID,
      name: a.Name,
      code: a.Code,
    }));
  }

  async refreshTokens(integration: any): Promise<TokenPair> {
    const clientId = process.env.XERO_CLIENT_ID;
    const clientSecret = process.env.XERO_CLIENT_SECRET;

    const response = await fetch("https://identity.xero.com/connect/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: integration.refreshToken,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to refresh Xero tokens");
    }

    const data = await response.json();
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }

  private async ensureValidTokens(integration: any): Promise<TokenPair> {
    try {
      const tokens = await this.refreshTokens(integration);
      await prisma.accountingIntegration.update({
        where: { id: integration.id },
        data: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        },
      });
      return tokens;
    } catch {
      return {
        accessToken: integration.accessToken,
        refreshToken: integration.refreshToken,
      };
    }
  }
}

export function getAccountingService(provider: "QUICKBOOKS" | "XERO"): AccountingService {
  switch (provider) {
    case "QUICKBOOKS":
      return new QuickBooksService();
    case "XERO":
      return new XeroService();
    default:
      throw new Error(`Unsupported accounting provider: ${provider}`);
  }
}
