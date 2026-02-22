export const queryKeys = {
  dashboard: {
    all: ["dashboard"] as const,
  },
  orders: {
    all: ["orders"] as const,
    detail: (id: string) => ["orders", id] as const,
  },
  products: {
    all: ["products"] as const,
    filtered: (filters: Record<string, string | number | undefined>) =>
      ["products", filters] as const,
  },
  suppliers: {
    all: ["suppliers"] as const,
    detail: (id: string) => ["suppliers", id] as const,
  },
  inventory: {
    all: ["inventory"] as const,
    filtered: (filters: Record<string, string | boolean | undefined>) =>
      ["inventory", filters] as const,
    detail: (id: string) => ["inventory", id] as const,
    insights: ["inventory", "insights"] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    byRange: (timeRange: string) => ["analytics", timeRange] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    filtered: (unreadOnly: boolean) => ["notifications", { unreadOnly }] as const,
  },
  priceAlerts: {
    all: ["priceAlerts"] as const,
  },
  invoices: {
    all: ["invoices"] as const,
    detail: (id: string) => ["invoices", id] as const,
  },
  settings: {
    all: ["settings"] as const,
  },
  integration: {
    pos: ["integration", "pos"] as const,
  },
  search: {
    query: (q: string) => ["search", q] as const,
  },
  chat: {
    conversations: ["chat", "conversations"] as const,
    messages: (conversationId: string) =>
      ["chat", "messages", conversationId] as const,
  },
  org: {
    restaurants: ["org", "restaurants"] as const,
    summary: ["org", "summary"] as const,
  },
  supplier: {
    dashboard: ["supplier", "dashboard"] as const,
    products: {
      all: ["supplier", "products"] as const,
      detail: (id: string) => ["supplier", "products", id] as const,
    },
    orders: {
      all: ["supplier", "orders"] as const,
      detail: (id: string) => ["supplier", "orders", id] as const,
    },
    invoices: {
      all: ["supplier", "invoices"] as const,
      detail: (id: string) => ["supplier", "invoices", id] as const,
    },
    settings: ["supplier", "settings"] as const,
    analytics: (period?: string) => ["supplier", "analytics", period] as const,
    customers: ["supplier", "customers"] as const,
  },
  approvals: {
    rules: ["approvals", "rules"] as const,
    pending: ["approvals", "pending"] as const,
  },
  messages: {
    byOrder: (orderId: string) => ["messages", "order", orderId] as const,
    unread: ["messages", "unread"] as const,
  },
  accounting: {
    integration: ["accounting", "integration"] as const,
    mappings: ["accounting", "mappings"] as const,
  },
};
