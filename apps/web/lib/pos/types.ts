export interface POSMenuItem {
  posItemId: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  imageUrl?: string | null;
}

export interface POSInventoryCount {
  posItemId: string;
  quantity: number;
  locationId?: string;
}

export interface TokenResult {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  merchantId?: string;
}

export interface SyncResult {
  created: number;
  updated: number;
  errors: string[];
}

export interface PushResult {
  pushed: number;
  errors: string[];
  idMappings: Array<{ localId: string; posItemId: string }>;
}

export interface POSAdapter {
  /** Exchange an OAuth authorization code for tokens */
  exchangeCodeForTokens?(
    code: string,
    redirectUri: string
  ): Promise<TokenResult>;

  /** Refresh an expired access token */
  refreshAccessToken?(refreshToken: string): Promise<TokenResult>;

  /** Authenticate via client credentials (non-OAuth flow, e.g. Toast) */
  authenticateClientCredentials?(storeId: string): Promise<TokenResult>;

  /** Fetch menu items from the POS system */
  fetchMenuItems(accessToken: string, merchantId?: string): Promise<POSMenuItem[]>;

  /** Push menu items to the POS system (write access required) */
  pushMenuItems?(
    accessToken: string,
    items: POSMenuItem[],
    merchantId?: string
  ): Promise<PushResult>;

  /** Fetch inventory counts from the POS system */
  fetchInventoryCounts?(
    accessToken: string,
    merchantId?: string
  ): Promise<POSInventoryCount[]>;

  /** Push inventory counts to the POS system (write access required) */
  pushInventoryCounts?(
    accessToken: string,
    counts: POSInventoryCount[],
    merchantId?: string
  ): Promise<SyncResult>;
}
