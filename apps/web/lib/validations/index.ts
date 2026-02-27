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
  notes: z.string().max(1000).optional(),
});

export const CreateOrderSchema = z.object({
  supplierId: z.string().min(1),
  items: z.array(CreateOrderItemSchema).min(1).max(200),
  deliveryNotes: z.string().max(2000).optional(),
});

export const UpdateOrderSchema = z.object({
  action: OrderActionSchema,
});

// Inventory
export const CreateInventoryItemSchema = z.object({
  name: z.string().min(1).max(255),
  category: ProductCategorySchema,
  unit: UnitTypeSchema,
  currentQuantity: z.number().min(0).default(0),
  parLevel: z.number().min(0).optional(),
  costPerUnit: z.number().min(0).optional(),
  location: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
  supplierProductId: z.string().optional(),
});

export const UpdateInventoryItemSchema = z
  .object({
    // Item details update
    name: z.string().min(1).max(255).optional(),
    category: ProductCategorySchema.optional(),
    unit: UnitTypeSchema.optional(),
    parLevel: z.number().min(0).nullable().optional(),
    costPerUnit: z.number().min(0).nullable().optional(),
    location: z.string().max(255).nullable().optional(),
    notes: z.string().max(2000).nullable().optional(),
    supplierProductId: z.string().nullable().optional(),
    // Quantity adjustment
    adjustQuantity: z.number().optional(),
    changeType: InventoryChangeTypeSchema.optional(),
    adjustmentNotes: z.string().max(2000).optional(),
    reference: z.string().max(255).optional(),
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
  title: z.string().min(1).max(255),
  message: z.string().min(1).max(5000),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// POS Integration
export const POSProviderSchema = z.enum([
  "SQUARE",
  "TOAST",
  "CLOVER",
  "LIGHTSPEED",
  "SPOTON",
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
  notes: z.string().max(2000).optional(),
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
  name: z.string().min(1).max(255),
  category: ProductCategorySchema,
  price: z.number().positive(),
  unit: UnitTypeSchema,
  description: z.string().max(2000).optional(),
  sku: z.string().max(100).optional(),
  brand: z.string().max(255).optional(),
  imageUrl: z.string().url().optional(),
  packSize: z.number().positive().optional(),
  inStock: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).optional(),
});

export const UpdateSupplierProductSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  category: ProductCategorySchema.optional(),
  price: z.number().positive().optional(),
  unit: UnitTypeSchema.optional(),
  description: z.string().max(2000).nullable().optional(),
  sku: z.string().max(100).nullable().optional(),
  brand: z.string().max(255).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  packSize: z.number().positive().nullable().optional(),
  inStock: z.boolean().optional(),
  stockQuantity: z.number().int().min(0).nullable().optional(),
});

// Supplier Settings
export const UpdateSupplierSettingsSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(255).nullable().optional(),
  address: z.string().max(255).nullable().optional(),
  city: z.string().max(255).nullable().optional(),
  state: z.string().max(255).nullable().optional(),
  zipCode: z.string().max(255).nullable().optional(),
  website: z.string().url().nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  taxId: z.string().max(100).nullable().optional(),
  minimumOrder: z.number().min(0).nullable().optional(),
  deliveryFee: z.number().min(0).nullable().optional(),
  leadTimeDays: z.number().int().min(1).optional(),
});

// Onboarding
// Matches empty strings AND whitespace-only strings (common from mobile keyboards)
const emptyToUndefined = z.string().refine(s => s.trim() === "").transform(() => undefined);

export const OnboardingSchema = z.object({
  restaurantName: z.string().min(1, "Restaurant name is required").max(255),
  address: z.string().max(255).optional(),
  city: z.string().max(255).optional(),
  state: z.string().max(255).optional(),
  zipCode: z.string().max(255).optional(),
  phone: z.string().max(255).optional(),
  email: z.union([emptyToUndefined, z.string().trim().email()]).optional(),
  website: z.union([emptyToUndefined, z.string().trim().url()]).optional(),
  cuisineTypes: z.array(z.string().max(100)).max(5).optional(),
  seatingCapacity: z.string().max(255).optional(),
  deliveryPreference: z.string().max(255).optional(),
  orderFrequency: z.string().max(255).optional(),
  budgetRange: z.string().max(255).optional(),
});

// Ingredient Matching
export const MatchIngredientsSchema = z.object({
  ingredients: z.array(
    z.object({
      name: z.string().min(1).max(255),
      category: z.string().min(1).max(255),
      estimatedQuantity: z.string().min(1).max(255),
      unit: z.string().min(1).max(255),
    })
  ).min(1).max(200),
});

// AI Parse Menu
export const ParseMenuSchema = z.object({
  menuText: z.string().min(1, "Menu text is required").max(50000),
  menuType: z.string().max(255).optional(),
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
  trackingNotes: z.string().max(2000).optional(),
});

// Accounting Mappings Update
export const UpdateAccountingMappingsSchema = z.object({
  mappings: z.array(AccountingMappingSchema).min(1).max(50),
});

// Supplier Invoice Creation (discriminated union)
export const CreateSupplierInvoiceSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("from_order"),
    orderId: z.string().min(1),
    dueDate: z.string().optional(),
    notes: z.string().max(2000).optional(),
  }),
  z.object({
    type: z.literal("manual"),
    restaurantId: z.string().min(1),
    subtotal: z.number().positive(),
    tax: z.number().min(0).default(0),
    total: z.number().positive(),
    dueDate: z.string().optional(),
    notes: z.string().max(2000).optional(),
  }),
]);

// Bulk Update Supplier Products
export const BulkUpdateProductsSchema = z.object({
  updates: z
    .array(
      z.object({
        productId: z.string().min(1),
        price: z.number().positive().optional(),
        inStock: z.boolean().optional(),
      })
    )
    .min(1)
    .max(100),
});

// Supplier Order Action
export const SupplierOrderActionSchema = z.object({
  action: z.enum([
    "confirm",
    "ship",
    "out_for_delivery",
    "update_eta",
    "deliver",
    "reject",
  ]),
  estimatedDeliveryAt: z.string().max(255).optional(),
  trackingNotes: z.string().max(2000).optional(),
  driverId: z.string().optional(),
});

// Update Invoice (restaurant-side)
export const UpdateInvoiceSchema = z.object({
  status: z
    .enum(["PAID", "PARTIALLY_PAID", "CANCELLED", "DISPUTED"])
    .optional(),
  paidAmount: z.number().positive().optional(),
  paymentMethod: z.string().max(255).optional(),
  paymentReference: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
  dueDate: z.string().optional(),
});

// Supplier Invoice Update (supplier-side PATCH)
export const UpdateSupplierInvoiceSchema = z.object({
  action: z.enum(["markPaid", "markPartiallyPaid", "markOverdue", "markDisputed", "cancel"]).optional(),
  paidAmount: z.number().positive().optional(),
  paymentMethod: z.string().max(255).optional(),
  paymentReference: z.string().max(255).optional(),
  notes: z.string().max(2000).optional(),
  dueDate: z.string().max(255).optional(),
});

// Supplier Drivers
export const CreateDriverSchema = z.object({
  firstName: z.string().min(1).max(255),
  lastName: z.string().max(255).optional(),
  email: z.string().email().max(255),
  phone: z.string().max(50).optional(),
});

export const UpdateDriverSchema = z.object({
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
});

// Menu Item Management
export const UpdateMenuItemSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  price: z.number().min(0).optional(),
  category: z.string().max(255).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const AddIngredientSchema = z.object({
  name: z.string().min(1).max(255),
  quantity: z.number().min(0).default(0),
  unit: UnitTypeSchema.default("EACH"),
  notes: z.string().max(2000).optional(),
});

export const UpdateIngredientSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  quantity: z.number().min(0).optional(),
  unit: UnitTypeSchema.optional(),
  notes: z.string().max(2000).nullable().optional(),
});

// Save Menu Items (from AI parser)
export const SaveMenuItemSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000).optional(),
  price: z.number().min(0),
  category: z.string().max(255).optional(),
  ingredients: z.array(z.object({
    name: z.string().min(1).max(255),
    quantity: z.number().min(0).default(0),
    unit: UnitTypeSchema.default("EACH"),
    notes: z.string().max(2000).optional(),
  })).default([]),
});

export const SaveMenuItemsSchema = z.object({
  items: z.array(SaveMenuItemSchema).min(1).max(200),
});

// Staff Members
export const CreateStaffMemberSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(255),
  lastName: z.string().max(255).optional(),
  email: z.string().email("Valid email is required").max(255),
  phone: z.string().max(50).optional(),
  role: z.enum(["MANAGER", "STAFF"]),
});

export const UpdateStaffMemberSchema = z.object({
  firstName: z.string().min(1).max(255).optional(),
  lastName: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  role: z.enum(["MANAGER", "STAFF"]).optional(),
});

// Organization Onboarding
export const OrgOnboardingSchema = z.object({
  organizationName: z.string().min(1, "Organization name is required").max(255),
  slug: z.string().min(1, "Slug is required").max(255).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens"),
  restaurantName: z.string().min(1, "Restaurant name is required").max(255),
  address: z.string().max(255).optional(),
  city: z.string().max(255).optional(),
  state: z.string().max(255).optional(),
  zipCode: z.string().max(255).optional(),
  phone: z.string().max(255).optional(),
  email: z.union([emptyToUndefined, z.string().trim().email()]).optional(),
  website: z.union([emptyToUndefined, z.string().trim().url()]).optional(),
  cuisineTypes: z.array(z.string().max(100)).max(5).optional(),
  seatingCapacity: z.string().max(255).optional(),
  deliveryPreference: z.string().max(255).optional(),
  orderFrequency: z.string().max(255).optional(),
  budgetRange: z.string().max(255).optional(),
});

export const AddOrgRestaurantSchema = z.object({
  restaurantName: z.string().min(1, "Restaurant name is required").max(255),
  address: z.string().max(255).optional(),
  city: z.string().max(255).optional(),
  state: z.string().max(255).optional(),
  zipCode: z.string().max(255).optional(),
  phone: z.string().max(255).optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  cuisineTypes: z.array(z.string().max(100)).max(5).optional(),
  seatingCapacity: z.string().max(255).optional(),
});

// AI Chat
export const AiChatSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().nullable().optional(),
});

// Promotions
export const PromotionTypeSchema = z.enum([
  "PERCENTAGE_OFF",
  "FLAT_DISCOUNT",
  "FREE_DELIVERY",
  "BUY_X_GET_Y",
]);

export const CreatePromotionSchema = z
  .object({
    type: PromotionTypeSchema,
    value: z.number().min(0),
    minOrderAmount: z.number().min(0).nullable().optional(),
    startDate: z.string().min(1),
    endDate: z.string().min(1),
    description: z.string().max(2000).optional(),
    isActive: z.boolean().optional(),
    buyQuantity: z.number().int().positive().nullable().optional(),
    getQuantity: z.number().int().positive().nullable().optional(),
    productIds: z.array(z.string()).optional(),
  })
  .refine((data) => new Date(data.endDate) > new Date(data.startDate), {
    message: "End date must be after start date",
    path: ["endDate"],
  })
  .refine(
    (data) => data.type !== "PERCENTAGE_OFF" || data.value <= 100,
    { message: "Percentage discount cannot exceed 100%", path: ["value"] }
  )
  .refine(
    (data) =>
      data.type !== "BUY_X_GET_Y" ||
      (data.buyQuantity != null && data.getQuantity != null),
    { message: "BUY_X_GET_Y requires buyQuantity and getQuantity", path: ["buyQuantity"] }
  );

export const UpdatePromotionSchema = z
  .object({
    type: PromotionTypeSchema.optional(),
    value: z.number().min(0).optional(),
    minOrderAmount: z.number().min(0).nullable().optional(),
    startDate: z.string().min(1).optional(),
    endDate: z.string().min(1).optional(),
    description: z.string().max(2000).nullable().optional(),
    isActive: z.boolean().optional(),
    buyQuantity: z.number().int().positive().nullable().optional(),
    getQuantity: z.number().int().positive().nullable().optional(),
    productIds: z.array(z.string()).optional(),
  });

// AI Search
export const AiSearchSchema = z.object({
  query: z.string().min(2).max(1000),
});

// Accounting Sync
export const AccountingSyncSchema = z.object({
  invoiceIds: z.array(z.string().min(1)).max(200).optional(),
});

// Supplier Onboarding
export const SupplierOnboardingSchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(255),
  email: z.string().max(255).optional(),
  phone: z.string().max(50).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(255).optional(),
  state: z.string().max(255).optional(),
  zipCode: z.string().max(20).optional(),
  website: z.string().max(500).optional(),
  minimumOrder: z.union([z.string().max(20), z.number()]).optional(),
  deliveryFee: z.union([z.string().max(20), z.number()]).optional(),
  leadTimeDays: z.union([z.string().max(10), z.number()]).optional(),
});

// Supplier Verification
export const SupplierVerificationActionSchema = z.object({
  supplierId: z.string().min(1),
  action: z.enum(["approve", "reject", "suspend", "reactivate"]),
  notes: z.string().max(2000).optional(),
});

// Invoice Creation
export const CreateInvoiceSchema = z.object({
  invoiceNumber: z.string().min(1, "Invoice number is required").max(100),
  supplierId: z.string().min(1, "Supplier ID is required"),
  orderId: z.string().optional(),
  subtotal: z.number().positive("Subtotal must be positive"),
  tax: z.number().min(0).default(0),
  dueDate: z.string().min(1, "Due date is required"),
  notes: z.string().max(2000).optional(),
  fileUrl: z.string().url().optional(),
});
