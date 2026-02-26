import { describe, it, expect, vi, beforeEach } from "vitest";
import { prismaMock } from "./mocks/prisma";
import { createMockPOSIntegration } from "./fixtures";

const { mockExchangeCodeForTokens } = vi.hoisted(() => ({
  mockExchangeCodeForTokens: vi.fn(),
}));

vi.mock("@/lib/pos", () => ({
  getAdapter: vi.fn().mockResolvedValue({
    exchangeCodeForTokens: mockExchangeCodeForTokens,
  }),
  getPOSProviderConfig: vi.fn(),
  isProviderConfigured: vi.fn(),
  buildOAuthUrl: vi.fn(),
}));

import { GET } from "@/app/api/integrations/pos/callback/route";
import { NextRequest } from "next/server";

function createCallbackRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/integrations/pos/callback");
  for (const [key, val] of Object.entries(params)) {
    url.searchParams.set(key, val);
  }
  return new NextRequest(url);
}

describe("POS OAuth Callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  });

  it("redirects with error if OAuth error param is present", async () => {
    const req = createCallbackRequest({ error: "access_denied" });
    const response = await GET(req);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("status=error");
    expect(location).toContain("reason=oauth_failed");
  });

  it("redirects with error if code is missing", async () => {
    const req = createCallbackRequest({ state: "abc" });
    const response = await GET(req);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("reason=oauth_failed");
  });

  it("redirects with error if state is invalid base64", async () => {
    const req = createCallbackRequest({
      code: "auth_code_123",
      state: "not-valid-json-base64!!!",
    });
    const response = await GET(req);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("reason=invalid_state");
  });

  it("exchanges code for tokens and upserts integration", async () => {
    const state = Buffer.from(
      JSON.stringify({ restaurantId: "rest_1", provider: "SQUARE" })
    ).toString("base64");

    mockExchangeCodeForTokens.mockResolvedValue({
      accessToken: "sq_access_123",
      refreshToken: "sq_refresh_456",
      expiresAt: new Date("2026-04-01"),
      merchantId: "merchant_789",
    });

    prismaMock.pOSIntegration.upsert.mockResolvedValue(
      createMockPOSIntegration({
        provider: "SQUARE",
        accessToken: "sq_access_123",
        merchantId: "merchant_789",
      }) as any
    );

    const req = createCallbackRequest({
      code: "auth_code_123",
      state,
    });

    const response = await GET(req);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("status=success");

    expect(prismaMock.pOSIntegration.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { restaurantId: "rest_1" },
        update: expect.objectContaining({
          provider: "SQUARE",
          accessToken: "sq_access_123",
          refreshToken: "sq_refresh_456",
          merchantId: "merchant_789",
        }),
        create: expect.objectContaining({
          provider: "SQUARE",
          accessToken: "sq_access_123",
          restaurantId: "rest_1",
        }),
      })
    );
  });

  it("redirects with error on token exchange failure", async () => {
    const state = Buffer.from(
      JSON.stringify({ restaurantId: "rest_1", provider: "SQUARE" })
    ).toString("base64");

    mockExchangeCodeForTokens.mockRejectedValue(
      new Error("Token exchange failed")
    );

    const req = createCallbackRequest({
      code: "bad_code",
      state,
    });

    const response = await GET(req);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("reason=token_exchange_failed");
  });
});
