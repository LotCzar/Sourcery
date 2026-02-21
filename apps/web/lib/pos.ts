import { POSProvider } from "@prisma/client";

interface POSProviderConfig {
  clientId: string;
  clientSecret: string;
  authUrl: string;
  tokenUrl: string;
  scopes: string[];
}

const providerEnvMap: Record<
  Exclude<POSProvider, "MANUAL">,
  { clientId: string; clientSecret: string; authUrl: string; tokenUrl: string; scopes: string[] }
> = {
  SQUARE: {
    clientId: "SQUARE_CLIENT_ID",
    clientSecret: "SQUARE_CLIENT_SECRET",
    authUrl: "https://connect.squareup.com/oauth2/authorize",
    tokenUrl: "https://connect.squareup.com/oauth2/token",
    scopes: ["ITEMS_READ", "MERCHANT_PROFILE_READ"],
  },
  TOAST: {
    clientId: "TOAST_CLIENT_ID",
    clientSecret: "TOAST_CLIENT_SECRET",
    authUrl: "https://ws-api.toasttab.com/usermgmt/v1/oauth/authorize",
    tokenUrl: "https://ws-api.toasttab.com/usermgmt/v1/oauth/token",
    scopes: ["menus.read"],
  },
  CLOVER: {
    clientId: "CLOVER_CLIENT_ID",
    clientSecret: "CLOVER_CLIENT_SECRET",
    authUrl: "https://sandbox.dev.clover.com/oauth/authorize",
    tokenUrl: "https://sandbox.dev.clover.com/oauth/token",
    scopes: ["INVENTORY_READ"],
  },
  LIGHTSPEED: {
    clientId: "LIGHTSPEED_CLIENT_ID",
    clientSecret: "LIGHTSPEED_CLIENT_SECRET",
    authUrl: "https://cloud.lightspeedapp.com/oauth/authorize",
    tokenUrl: "https://cloud.lightspeedapp.com/oauth/token",
    scopes: ["employee:inventory"],
  },
};

export function getPOSProviderConfig(
  provider: POSProvider
): POSProviderConfig | null {
  if (provider === "MANUAL") return null;

  const env = providerEnvMap[provider];
  const clientId = process.env[env.clientId];
  const clientSecret = process.env[env.clientSecret];

  if (!clientId || !clientSecret) return null;

  return {
    clientId,
    clientSecret,
    authUrl: env.authUrl,
    tokenUrl: env.tokenUrl,
    scopes: env.scopes,
  };
}

export function isProviderConfigured(provider: POSProvider): boolean {
  if (provider === "MANUAL") return true;
  return getPOSProviderConfig(provider) !== null;
}

export function buildOAuthUrl(
  provider: POSProvider,
  redirectUri: string,
  state: string
): string | null {
  const config = getPOSProviderConfig(provider);
  if (!config) return null;

  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    scope: config.scopes.join(" "),
    redirect_uri: redirectUri,
    state,
  });

  return `${config.authUrl}?${params.toString()}`;
}
