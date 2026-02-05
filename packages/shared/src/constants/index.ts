import type {
  OrderStatus,
  ProductCategory,
  SupplierStatus,
  UnitType,
  UserRole,
  NotificationType,
} from "../types";

// Order status labels and colors
export const ORDER_STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string }
> = {
  DRAFT: { label: "Draft", color: "gray" },
  PENDING: { label: "Pending", color: "yellow" },
  CONFIRMED: { label: "Confirmed", color: "blue" },
  PROCESSING: { label: "Processing", color: "blue" },
  SHIPPED: { label: "Shipped", color: "purple" },
  IN_TRANSIT: { label: "In Transit", color: "purple" },
  DELIVERED: { label: "Delivered", color: "green" },
  CANCELLED: { label: "Cancelled", color: "red" },
  RETURNED: { label: "Returned", color: "orange" },
};

// Supplier status labels and colors
export const SUPPLIER_STATUS_CONFIG: Record<
  SupplierStatus,
  { label: string; color: string }
> = {
  PENDING: { label: "Pending", color: "yellow" },
  VERIFIED: { label: "Verified", color: "green" },
  SUSPENDED: { label: "Suspended", color: "red" },
  INACTIVE: { label: "Inactive", color: "gray" },
};

// Product categories
export const PRODUCT_CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "PRODUCE", label: "Produce" },
  { value: "MEAT", label: "Meat" },
  { value: "SEAFOOD", label: "Seafood" },
  { value: "DAIRY", label: "Dairy" },
  { value: "BAKERY", label: "Bakery" },
  { value: "BEVERAGES", label: "Beverages" },
  { value: "DRY_GOODS", label: "Dry Goods" },
  { value: "FROZEN", label: "Frozen" },
  { value: "CLEANING", label: "Cleaning Supplies" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "OTHER", label: "Other" },
];

// Unit types
export const UNIT_TYPES: { value: UnitType; label: string; abbr: string }[] = [
  { value: "POUND", label: "Pound", abbr: "lb" },
  { value: "OUNCE", label: "Ounce", abbr: "oz" },
  { value: "KILOGRAM", label: "Kilogram", abbr: "kg" },
  { value: "GRAM", label: "Gram", abbr: "g" },
  { value: "GALLON", label: "Gallon", abbr: "gal" },
  { value: "LITER", label: "Liter", abbr: "L" },
  { value: "QUART", label: "Quart", abbr: "qt" },
  { value: "PINT", label: "Pint", abbr: "pt" },
  { value: "EACH", label: "Each", abbr: "ea" },
  { value: "CASE", label: "Case", abbr: "cs" },
  { value: "DOZEN", label: "Dozen", abbr: "dz" },
  { value: "BOX", label: "Box", abbr: "box" },
  { value: "BAG", label: "Bag", abbr: "bag" },
  { value: "BUNCH", label: "Bunch", abbr: "bn" },
];

// User roles
export const USER_ROLES: { value: UserRole; label: string }[] = [
  { value: "OWNER", label: "Owner" },
  { value: "MANAGER", label: "Manager" },
  { value: "STAFF", label: "Staff" },
  { value: "SUPPLIER_ADMIN", label: "Supplier Admin" },
  { value: "SUPPLIER_REP", label: "Supplier Representative" },
];

// Notification types
export const NOTIFICATION_TYPES: {
  value: NotificationType;
  label: string;
  icon: string;
}[] = [
  { value: "ORDER_UPDATE", label: "Order Update", icon: "shopping-cart" },
  { value: "PRICE_ALERT", label: "Price Alert", icon: "dollar-sign" },
  { value: "DELIVERY_UPDATE", label: "Delivery Update", icon: "truck" },
  { value: "SYSTEM", label: "System", icon: "info" },
  { value: "PROMOTION", label: "Promotion", icon: "tag" },
];

// Pagination defaults
export const PAGINATION_DEFAULTS = {
  PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: "/api/auth",
  USERS: "/api/users",
  RESTAURANTS: "/api/restaurants",
  SUPPLIERS: "/api/suppliers",
  PRODUCTS: "/api/products",
  ORDERS: "/api/orders",
  NOTIFICATIONS: "/api/notifications",
  AI: "/api/ai",
};

// Brand colors
export const BRAND_COLORS = {
  primary: "#22C55E", // Green - savings/freshness
  secondary: "#3B82F6", // Blue - trust
  accent: "#F97316", // Orange - alerts/CTAs
  background: "#F9FAFB",
  foreground: "#111827",
};

// US States
export const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];
