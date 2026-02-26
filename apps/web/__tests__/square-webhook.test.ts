import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "./mocks/prisma";
import { mockInngestSend } from "./mocks/inngest";
import { createMockPOSIntegration } from "./fixtures";
import crypto from "crypto";

import { POST } from "@/app/api/webhooks/square/route";
import { NextRequest } from "next/server";

function computeSignature(body: string, webhookUrl: string, key: string): string {
  const payload = webhookUrl + body;
  return crypto.createHmac("sha256", key).update(payload).digest("base64");
}

function createWebhookRequest(body: object, signature?: string): NextRequest {
  const bodyStr = JSON.stringify(body);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (signature) {
    headers["x-square-hmacsha256-signature"] = signature;
  }
  return new NextRequest("http://localhost:3000/api/webhooks/square", {
    method: "POST",
    headers,
    body: bodyStr,
  });
}

describe("Square Webhook", () => {
  const signatureKey = "test_webhook_key_123";
  const webhookUrl = "http://localhost:3000/api/webhooks/square";

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = signatureKey;
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  it("rejects requests with invalid signature", async () => {
    const body = { type: "catalog.version.updated", merchant_id: "m_1" };
    const req = createWebhookRequest(body, "invalid_sig");

    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Invalid signature");
  });

  it("rejects requests without signature", async () => {
    const body = { type: "catalog.version.updated", merchant_id: "m_1" };
    const req = createWebhookRequest(body);

    const response = await POST(req);
    expect(response.status).toBe(401);
  });

  it("triggers sync on catalog.version.updated event", async () => {
    const body = {
      type: "catalog.version.updated",
      merchant_id: "merchant_789",
    };
    const bodyStr = JSON.stringify(body);
    const sig = computeSignature(bodyStr, webhookUrl, signatureKey);

    const integration = createMockPOSIntegration({
      provider: "SQUARE",
      merchantId: "merchant_789",
      accessToken: "sq_access",
    });

    prismaMock.pOSIntegration.findFirst.mockResolvedValue(integration as any);

    const req = createWebhookRequest(body, sig);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);

    expect(prismaMock.pOSIntegration.findFirst).toHaveBeenCalledWith({
      where: {
        merchantId: "merchant_789",
        provider: "SQUARE",
        isActive: true,
      },
    });

    expect(mockInngestSend).toHaveBeenCalledWith({
      name: "pos/sync.requested",
      data: {
        integrationId: integration.id,
        restaurantId: integration.restaurantId,
        provider: "SQUARE",
      },
    });
  });

  it("returns 200 even if no matching integration found", async () => {
    const body = {
      type: "catalog.version.updated",
      merchant_id: "unknown_merchant",
    };
    const bodyStr = JSON.stringify(body);
    const sig = computeSignature(bodyStr, webhookUrl, signatureKey);

    prismaMock.pOSIntegration.findFirst.mockResolvedValue(null);

    const req = createWebhookRequest(body, sig);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(mockInngestSend).not.toHaveBeenCalled();
  });

  it("ignores non-catalog events", async () => {
    const body = {
      type: "payment.updated",
      merchant_id: "merchant_789",
    };
    const bodyStr = JSON.stringify(body);
    const sig = computeSignature(bodyStr, webhookUrl, signatureKey);

    const req = createWebhookRequest(body, sig);
    const response = await POST(req);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.received).toBe(true);
    expect(prismaMock.pOSIntegration.findFirst).not.toHaveBeenCalled();
  });
});
