// API Response types (typed responses for frontend consumption)
export * from "./api";

// User types
export type UserRole =
  | "OWNER"
  | "MANAGER"
  | "STAFF"
  | "SUPPLIER_ADMIN"
  | "SUPPLIER_REP";

export interface User {
  id: string;
  clerkId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  role: UserRole;
  avatarUrl?: string | null;
  restaurantId?: string | null;
  supplierId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Restaurant types
export interface Restaurant {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  taxId?: string | null;
  cuisineType?: string | null;
  seatingCapacity?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Supplier types
export type SupplierStatus = "PENDING" | "VERIFIED" | "SUSPENDED" | "INACTIVE";

export interface Supplier {
  id: string;
  name: string;
  description?: string | null;
  email: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  taxId?: string | null;
  minimumOrder?: number | null;
  deliveryFee?: number | null;
  leadTimeDays: number;
  status: SupplierStatus;
  verifiedAt?: Date | null;
  rating?: number | null;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// Product types
export type ProductCategory =
  | "PRODUCE"
  | "MEAT"
  | "SEAFOOD"
  | "DAIRY"
  | "BAKERY"
  | "BEVERAGES"
  | "DRY_GOODS"
  | "FROZEN"
  | "CLEANING"
  | "EQUIPMENT"
  | "OTHER";

export type UnitType =
  | "POUND"
  | "OUNCE"
  | "KILOGRAM"
  | "GRAM"
  | "GALLON"
  | "LITER"
  | "QUART"
  | "PINT"
  | "EACH"
  | "CASE"
  | "DOZEN"
  | "BOX"
  | "BAG"
  | "BUNCH";

export interface SupplierProduct {
  id: string;
  name: string;
  description?: string | null;
  sku?: string | null;
  category: ProductCategory;
  brand?: string | null;
  imageUrl?: string | null;
  price: number;
  unit: UnitType;
  packSize?: number | null;
  inStock: boolean;
  stockQuantity?: number | null;
  supplierId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Order types
export type OrderStatus =
  | "DRAFT"
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURNED";

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  total: number;
  deliveryDate?: Date | null;
  deliveryNotes?: string | null;
  deliveredAt?: Date | null;
  restaurantId: string;
  supplierId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  notes?: string | null;
  orderId: string;
  productId: string;
  createdAt: Date;
  updatedAt: Date;
}

// Notification types
export type NotificationType =
  | "ORDER_UPDATE"
  | "PRICE_ALERT"
  | "DELIVERY_UPDATE"
  | "SYSTEM"
  | "PROMOTION";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: Record<string, unknown> | null;
  userId: string;
  createdAt: Date;
}

// PaginatedResponse kept here for backward compatibility
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
