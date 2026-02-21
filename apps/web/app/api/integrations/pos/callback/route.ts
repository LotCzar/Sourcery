import { NextRequest, NextResponse } from "next/server";

// GET - OAuth callback stub
// TODO: Implement token exchange when POS developer accounts are available
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (error || !code || !state) {
    return NextResponse.redirect(
      `${appUrl}/settings?tab=integrations&status=error&reason=oauth_failed`
    );
  }

  // TODO: Decode state, exchange code for tokens, store in POSIntegration
  // const { restaurantId, provider } = JSON.parse(Buffer.from(state, "base64").toString());
  // const config = getPOSProviderConfig(provider);
  // Exchange code at config.tokenUrl for access/refresh tokens
  // Upsert POSIntegration with tokens

  return NextResponse.redirect(
    `${appUrl}/settings?tab=integrations&status=error&reason=oauth_not_implemented`
  );
}
