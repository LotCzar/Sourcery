import type { POSProvider } from "@prisma/client";
import type { POSAdapter } from "./types";

export {
  getPOSProviderConfig,
  isProviderConfigured,
  buildOAuthUrl,
} from "./config";
export type {
  POSAdapter,
  POSMenuItem,
  POSInventoryCount,
  TokenResult,
  SyncResult,
  PushResult,
} from "./types";

const adapterCache = new Map<string, POSAdapter>();

export async function getAdapter(provider: POSProvider): Promise<POSAdapter | null> {
  if (provider === "MANUAL") return null;

  if (adapterCache.has(provider)) {
    return adapterCache.get(provider)!;
  }

  let adapter: POSAdapter | null = null;

  switch (provider) {
    case "SQUARE": {
      const { SquareAdapter } = await import("./square-adapter");
      adapter = new SquareAdapter();
      break;
    }
    case "TOAST": {
      const { ToastAdapter } = await import("./toast-adapter");
      adapter = new ToastAdapter();
      break;
    }
    default:
      return null;
  }

  if (adapter) {
    adapterCache.set(provider, adapter);
  }

  return adapter;
}
