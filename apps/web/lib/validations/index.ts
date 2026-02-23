import { z } from "zod";

// ============================================
// Enum Schemas (mirroring Prisma enums)
// ============================================

export const OrderStatusSchema = z.enum([
  "DRAFT",
  "AWAITING_APPROVAL",
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "IN_TRANSIT",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
]);

export const ProductCategorySchema = z.enum([
  "PRODUCE",
  "MEAT",
  "SEAFOOD",
  "DAIRY",
  "BAKERY",
  "BEVERAGES",
  "DRY_GOODS",
  "FROZEN",
  "CLEANING",
  "EQUIPMENT",
  "OTHER",
]);

export const UnitTypeSchema = z.enum([
  "POUND",
  "OUNCE",
  "KILOGRAM",
  "GRAM",
  "GALLON",
  "LITER",
  "QUART",
  "PINT",
  "EACH",
  "CASE",
  "DOZEN",
  "BOX",
  "BAG",
  "BUNCH",
]);

export const AlertTypeSchema = z.enum([
  "PRICE_DROP",
  "PRICE_INCREASE",
  "PRICE_THRESHOLD",
]);

export const NotificationTypeSchema = z.enum([
  "ORDER_UPDATE",
  "PRICE_ALERT",
  "DELIVERY_UPDATE",
  "SYSTEM",
  "PROMOTION",
]);

export const InventoryChangeTypeSchema = z.enum([
  "RECEIVED",
  "USED",
  "ADJUSTED",
  "WASTE",
  "TRANSFERRED",
  "COUNT",
]);

export const OrderActionSchema = z.enum([
  "submit",
  "cancel",
  "confirm",
  "ship",
  "deliver",
]);

// ============================================
// Route-specific Schemas
// ============================================

// Orders
export const CreateOrderItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  notes: z.string().optional(),
});

export const CreateOrderSchema = z.object({
  supplierId: z.string().min(1),
  items: z.array(CreateOrderItemSchema).min(1),
  deliveryNotes: z.string().optional(),
});

export const UpdateOrderSchema = z.object({
  action: OrderActionSchema,
});

// Inventory
export const CreateInventoryItemSchema = z.object({
  name: z.string().min(1),
  category: ProductCategorySchema,
  unit: UnitTypeSchema,
  currentQuantity: z.number().min(0).default(0),
  parLevel: z.number().min(0).optional(),
  costPerUnit: z.number().min(0).optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  supplierProductId: z.string().optional(),
});

export const UpdateInventoryItemSchema = z
  .object({
    // Item details update
    name: z.string().min(1).optional(),
    category: ProductCategorySchema.optional(),
    unit: UnitTypeSchema.optional(),
    parLevel: z.number().min(0).nullable().optional(),
    costPerUnit: z.number().min(0).nullable().optional(),
    location: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
    supplierProductId: z.string().nullable().optional(),
    // Quantity adjustment
    adjustQuantity: z.number().optional(),
    changeType: InventoryChangeTypeSchema.optional(),
    adjustmentNotes: z.string().optional(),
    reference: z.string().optional(),
  });

// Price Alerts
export const CreatePriceAlertSchema = z.object({
  productId: z.string().min(1),
  alertType: AlertTypeSchema,
  targetPrice: z.number().min(0),
});

// Notifications
export const CreateNotificationSchema = z.object({
  type: NotificationTypeSchema,
  title: z.string().min(1),
  message: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// POS Integration
export const POSProviderSchema = z.enum([
  "SQUARE",
  "TOAST",
  "CLOVER",
  "LIGHTSPEED",
  "MANUAL",
]);

export const ConnectIntegrationSchema = z.object({
  provider: POSProviderSchema,
  storeId: z.string().optional(),
});

// Approval Workflows
export const UserRoleSchema = z.enum([
  "OWNER",
  "MANAGER",
  "STAFF",
  "ORG_ADMIN",
  "SUPPLIER_ADMIN",
  "SUPPLIER_REP",
]);

export const ApprovalRuleSchema = z.object({
  minAmount: z.number().positive("Minimum amount must be positive"),
  maxAmount: z.number().positive().optional(),
  requiredRole: UserRoleSchema.default("MANAGER"),
  isActive: z.boolean().optional(),
});

export const ReviewApprovalSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  notes: z.string().optional(),
});

// Messaging
export const OrderMessageSchema = z.object({
  content: z.string().min(1, "Message cannot be empty").max(5000, "Message too long"),
  isInternal: z.boolean().optional(),
});

// Accounting
export const AccountingProviderSchema = z.enum(["QUICKBOOKS", "XERO"]);

export const AccountingMappingSchema = z.object({
  productCategory: ProductCategorySchema,
  accountingCode: z.string().min(1),
  accountingName: z.string().optional(),
});

// Supplier Products
export const CreateSupplierProductSchema = z.object({
  name: z.string().min(1),
  category: ProductCategorySchema,
  price: z.number().positive(),
  unit: UnitTypeSchema,
  description: z.string().optional(),
  sku: z.string().optional(),
  brand: z.string().optional(),
  imageUrl: z.string().url().optional(),
  packSize: z.number().positive().optional(),
  inStock: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).optional(),
});

export const UpdateSupplierProductSchema = z.object({
  name: z.string().min(1).optional(),
  category: ProductCategorySchema.optional(),
  price: z.number().positive().optional(),
  unit: UnitTypeSchema.optional(),
  description: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  brand: z.string().nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  packSize: z.number().positive().nullable().optional(),
  inStock: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).nullable().optional(),
});

// Supplier Settings
export const UpdateSupplierSettingsSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  zipCode: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  taxId: z.string().nullable().optional(),
  minimumOrder: z.number().min(0).nullable().optional(),
  deliveryFee: z.number().min(0).nullable().optional(),
  leadTimeDays: z.number().int().min(1).optional(),
});

// Onboarding
export const OnboardingSchema = z.object({
  restaurantName: z.string().min(1, "Restaurant name is required"),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  cuisineType: z.string().optional(),
  seatingCapacity: z.string().optional(),
});

// Ingredient Matching
export const MatchIngredientsSchema = z.object({
  ingredients: z.array(
    z.object({
      name: z.string().min(1),
      category: z.string().min(1),
      estimatedQuantity: z.string().min(1),
      unit: z.string().min(1),
    })
  ).min(1).max(200),
});

// AI Parse Menu
export const ParseMenuSchema = z.object({
  menuText: z.string().min(1, "Menu text is required"),
  menuType: z.string().optional(),
});

// Settings
export const SettingsSectionSchema = z.enum([
  "profile",
  "restaurant",
  "preferences",
]);

export const UpdateSettingsSchema = z.object({
  section: SettingsSectionSchema,
  data: z.record(z.string(), z.unknown()),
});

// Notification Update
export const UpdateNotificationSchema = z.object({
  isRead: z.boolean().optional(),
});

// Price Alert Update
export const UpdatePriceAlertSchema = z.object({
  isActive: z.boolean().optional(),
  targetPrice: z.number().min(0).optional(),
  alertType: AlertTypeSchema.optional(),
});

// Driver Delivery Update
export const DriverDeliveryActionSchema = z.enum([
  "out_for_delivery",
  "update_eta",
  "deliver",
]);

export const UpdateDeliverySchema = z.object({
  action: DriverDeliveryActionSchema,
  estimatedDeliveryAt: z.string().optional(),
  trackingNotes: z.string().optional(),
});

// Accounting Mappings Update
export const UpdateAccountingMappingsSchema = z.object({
  mappings: z.array(AccountingMappingSchema).min(1),
});

// Invoice Creation
export const CreateInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  supplierId: z.string().min(1, "Supplier ID is required"),
  orderId: z.string().optional(),
  subtotal: z.number().positive("Subtotal must be positive"),
  tax: z.number().min(0).default(0),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().optional(),
  fileUrl: z.string().url().optional(),
});
