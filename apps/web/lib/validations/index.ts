import { z } from "zod";

// ============================================
// Enum Schemas (mirroring Prisma enums)
// ============================================

export const OrderStatusSchema = z.enum([
  "DRAFT",
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

// AI Parse Menu
export const ParseMenuSchema = z.object({
  menuText: z.string().min(1, "Menu text is required"),
  menuType: z.string().optional(),
});
