import { Decimal } from "@prisma/client/runtime/library";

export function createMockUser(overrides?: Record<string, unknown>) {
  return {
    id: "user_1",
    clerkId: "clerk_test_user_123",
    email: "test@restaurant.com",
    firstName: "Test",
    lastName: "User",
    phone: null,
    role: "OWNER" as const,
    avatarUrl: null,
    restaurantId: "rest_1",
    supplierId: null,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export function createMockRestaurant(overrides?: Record<string, unknown>) {
  return {
    id: "rest_1",
    name: "Test Restaurant",
    address: "123 Main St",
    city: "Austin",
    state: "TX",
    zipCode: "78701",
    phone: "512-555-0100",
    email: "info@testrestaurant.com",
    website: null,
    logoUrl: null,
    taxId: null,
    cuisineType: "American",
    seatingCapacity: 50,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export function createMockSupplier(overrides?: Record<string, unknown>) {
  return {
    id: "sup_1",
    name: "Test Supplier",
    description: "A test supplier",
    email: "orders@testsupplier.com",
    phone: "512-555-0200",
    address: "456 Supply Ave",
    city: "Austin",
    state: "TX",
    zipCode: "78702",
    website: null,
    logoUrl: null,
    taxId: null,
    minimumOrder: new Decimal("50.00"),
    deliveryFee: new Decimal("10.00"),
    leadTimeDays: 2,
    status: "VERIFIED" as const,
    verifiedAt: new Date("2024-01-01"),
    rating: new Decimal("4.50"),
    reviewCount: 10,
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export function createMockProduct(overrides?: Record<string, unknown>) {
  return {
    id: "prod_1",
    name: "Organic Tomatoes",
    description: "Fresh organic tomatoes",
    sku: "TOM-001",
    category: "PRODUCE" as const,
    brand: "Farm Fresh",
    imageUrl: null,
    price: new Decimal("4.99"),
    unit: "POUND" as const,
    packSize: null,
    inStock: true,
    stockQuantity: 100,
    supplierId: "sup_1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export function createMockOrder(overrides?: Record<string, unknown>) {
  return {
    id: "order_1",
    orderNumber: "ORD-TEST-001",
    status: "DRAFT" as const,
    subtotal: new Decimal("100.00"),
    tax: new Decimal("8.25"),
    deliveryFee: new Decimal("10.00"),
    discount: new Decimal("0.00"),
    total: new Decimal("118.25"),
    deliveryDate: null,
    deliveryNotes: null,
    deliveredAt: null,
    restaurantId: "rest_1",
    supplierId: "sup_1",
    createdById: "user_1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export function createMockOrderItem(overrides?: Record<string, unknown>) {
  return {
    id: "item_1",
    quantity: new Decimal("10"),
    unitPrice: new Decimal("4.99"),
    subtotal: new Decimal("49.90"),
    notes: null,
    orderId: "order_1",
    productId: "prod_1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export function createMockUserWithRestaurant(
  userOverrides?: Record<string, unknown>,
  restaurantOverrides?: Record<string, unknown>
) {
  return {
    ...createMockUser(userOverrides),
    restaurant: createMockRestaurant(restaurantOverrides),
  };
}

export function createMockInvoice(overrides?: Record<string, unknown>) {
  return {
    id: "inv_1",
    invoiceNumber: "INV-001",
    status: "PENDING" as const,
    subtotal: new Decimal("100.00"),
    tax: new Decimal("8.25"),
    total: new Decimal("108.25"),
    issueDate: new Date("2024-01-15"),
    dueDate: new Date("2024-02-15"),
    paidAt: null,
    paidAmount: null,
    paymentMethod: null,
    paymentReference: null,
    notes: null,
    fileUrl: null,
    restaurantId: "rest_1",
    supplierId: "sup_1",
    orderId: "order_1",
    createdAt: new Date("2024-01-15"),
    updatedAt: new Date("2024-01-15"),
    ...overrides,
  };
}

export function createMockSupplierUser(overrides?: Record<string, unknown>) {
  return createMockUser({
    id: "sup_user_1",
    role: "SUPPLIER_ADMIN" as const,
    restaurantId: null,
    supplierId: "sup_1",
    ...overrides,
  });
}

export function createMockConversation(overrides?: Record<string, unknown>) {
  return {
    id: "conv_1",
    title: "Test Conversation",
    userId: "user_1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export function createMockMessage(overrides?: Record<string, unknown>) {
  return {
    id: "msg_1",
    role: "USER" as const,
    content: "Hello, can you help me?",
    toolName: null,
    toolInput: null,
    toolResult: null,
    conversationId: "conv_1",
    createdAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export function createMockInventoryItem(overrides?: Record<string, unknown>) {
  return {
    id: "inv_item_1",
    name: "Organic Tomatoes",
    category: "PRODUCE" as const,
    currentQuantity: new Decimal("50.000"),
    unit: "POUND" as const,
    parLevel: new Decimal("20.000"),
    costPerUnit: new Decimal("4.99"),
    location: "Walk-in Cooler",
    notes: null,
    supplierProductId: "prod_1",
    restaurantId: "rest_1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export function createMockNotification(overrides?: Record<string, unknown>) {
  return {
    id: "notif_1",
    type: "ORDER_UPDATE" as const,
    title: "Order Confirmed",
    message: "Your order ORD-001 has been confirmed.",
    isRead: false,
    metadata: null,
    userId: "user_1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}

export function createMockPriceAlert(overrides?: Record<string, unknown>) {
  return {
    id: "alert_1",
    alertType: "PRICE_DROP" as const,
    targetPrice: new Decimal("3.50"),
    isActive: true,
    triggeredAt: null,
    triggeredPrice: null,
    userId: "user_1",
    productId: "prod_1",
    createdAt: new Date("2024-01-01"),
    updatedAt: new Date("2024-01-01"),
    ...overrides,
  };
}
