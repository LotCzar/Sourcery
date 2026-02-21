// Typed API response wrappers
export interface ApiSuccessResponse<T> {
  success: true;
  data: T;
}

export interface ApiErrorResponse {
  success?: false;
  error: string;
  details?: unknown;
}

export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;

// Dashboard
export interface DashboardStats {
  thisMonthSpend: number;
  lastMonthSpend: number;
  spendChange: number;
  totalOrders: number;
  pendingOrders: number;
  activeSuppliers: number;
}

export interface DashboardBriefing {
  summary: string | null;
  lowStockCount: number;
  overdueInvoiceCount: number;
  criticalItems: string[];
}

export interface DashboardData {
  briefing: DashboardBriefing;
  stats: DashboardStats;
  ordersByStatus: Record<string, number>;
  recentOrders: {
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    supplier: string;
    supplierId: string;
    itemCount: number;
    createdAt: string;
  }[];
  topSuppliers: {
    id: string;
    name: string;
    orderCount: number;
    totalSpend: number;
  }[];
  savingsOpportunities: {
    productName: string;
    supplierCount: number;
    lowestPrice: number;
    highestPrice: number;
    potentialSavings: number;
  }[];
  restaurant: {
    name: string;
    cuisineType: string | null;
  };
}

// Orders
export interface OrderWithItems {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  deliveryDate: string | null;
  deliveryNotes: string | null;
  deliveredAt: string | null;
  restaurantId: string;
  supplierId: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  supplier: {
    id: string;
    name: string;
  };
  items: {
    id: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
    notes: string | null;
    product: {
      id: string;
      name: string;
      category: string;
      unit: string;
      price: number;
    };
  }[];
}

// Products
export interface ProductWithSupplier {
  id: string;
  name: string;
  description: string | null;
  sku: string | null;
  category: string;
  brand: string | null;
  imageUrl: string | null;
  price: number;
  unit: string;
  packSize: number | null;
  inStock: boolean;
  stockQuantity: number | null;
  supplierId: string;
  supplier: {
    id: string;
    name: string;
    rating: number | null;
    minimumOrder: number | null;
    deliveryFee: number | null;
    leadTimeDays: number;
  };
}

// Inventory
export interface InventoryItemData {
  id: string;
  name: string;
  category: string;
  currentQuantity: number;
  unit: string;
  parLevel: number | null;
  costPerUnit: number | null;
  location: string | null;
  notes: string | null;
  supplierProduct: {
    id: string;
    name: string;
    price: number;
    supplier: { id: string; name: string };
  } | null;
  recentLogs: {
    id: string;
    changeType: string;
    quantity: number;
    previousQuantity: number;
    newQuantity: number;
    notes: string | null;
    createdBy: { firstName: string | null; lastName: string | null };
    createdAt: string;
  }[];
  isLowStock: boolean;
  isOutOfStock: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryResponse {
  data: InventoryItemData[];
  summary: {
    totalItems: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalValue: number;
  };
}

// Notifications
export interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  userId: string;
  createdAt: string;
}

// Price Alerts
export interface PriceAlertData {
  id: string;
  alertType: string;
  targetPrice: number;
  isActive: boolean;
  triggeredAt: string | null;
  triggeredPrice: number | null;
  createdAt: string;
  product: {
    id: string;
    name: string;
    currentPrice: number;
    unit: string;
    category: string;
    supplier: { id: string; name: string };
    priceHistory: { price: number; recordedAt: string }[];
  };
}

// Analytics
export interface AnalyticsData {
  spendByMonth: { month: string; amount: number }[];
  spendByCategory: { category: string; amount: number }[];
  spendBySupplier: { supplier: string; amount: number }[];
  orderTrends: { month: string; count: number }[];
  topProducts: { name: string; quantity: number; totalSpend: number }[];
}

// Invoices
export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  issueDate: string;
  dueDate: string;
  paidAt: string | null;
  paidAmount: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  notes: string | null;
  fileUrl: string | null;
  restaurantId: string;
  supplierId: string;
  orderId: string | null;
  supplier: { id: string; name: string; email?: string };
  order?: { id?: string; orderNumber: string; status?: string } | null;
  createdAt: string;
  updatedAt: string;
}

// Suppliers
export interface SupplierDetail {
  id: string;
  name: string;
  description: string | null;
  email: string;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zipCode: string | null;
  website: string | null;
  logoUrl: string | null;
  minimumOrder: number | null;
  deliveryFee: number | null;
  leadTimeDays: number;
  status: string;
  rating: number | null;
  reviewCount: number;
  products: ProductWithSupplier[];
}
