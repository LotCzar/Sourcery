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
    filtered: (filters: Record<string, string>) =>
      ["products", filters] as const,
  },
  suppliers: {
    all: ["suppliers"] as const,
    detail: (id: string) => ["suppliers", id] as const,
  },
  inventory: {
    all: ["inventory"] as const,
    detail: (id: string) => ["inventory", id] as const,
  },
  analytics: {
    all: ["analytics"] as const,
    byRange: (timeRange: string) => ["analytics", timeRange] as const,
  },
  notifications: {
    all: ["notifications"] as const,
  },
  priceAlerts: {
    all: ["priceAlerts"] as const,
  },
  invoices: {
    all: ["invoices"] as const,
    detail: (id: string) => ["invoices", id] as const,
  },
  search: {
    query: (q: string) => ["search", q] as const,
  },
  chat: {
    conversations: ["chat", "conversations"] as const,
    messages: (conversationId: string) =>
      ["chat", "messages", conversationId] as const,
  },
};
