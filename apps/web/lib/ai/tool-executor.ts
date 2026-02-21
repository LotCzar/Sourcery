import prisma from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";

interface ToolContext {
  userId: string;
  restaurantId: string;
}

export async function executeTool(
  name: string,
  input: Record<string, any>,
  context: ToolContext
): Promise<any> {
  switch (name) {
    case "search_products":
      return searchProducts(input, context);
    case "get_inventory":
      return getInventory(input, context);
    case "get_order_history":
      return getOrderHistory(input, context);
    case "create_draft_order":
      return createDraftOrder(input, context);
    case "compare_prices":
      return comparePrices(input);
    case "get_supplier_info":
      return getSupplierInfo(input);
    case "create_price_alert":
      return createPriceAlert(input, context);
    case "adjust_inventory":
      return adjustInventory(input, context);
    case "get_consumption_insights":
      return getConsumptionInsights(input, context);
    case "reorder_item":
      return reorderItem(input, context);
    case "get_spending_summary":
      return getSpendingSummary(input, context);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

async function searchProducts(
  input: Record<string, any>,
  _context: ToolContext
) {
  const where: any = {};

  if (input.query) {
    where.name = { contains: input.query, mode: "insensitive" };
  }
  if (input.category) {
    where.category = input.category;
  }
  if (input.supplier_id) {
    where.supplierId = input.supplier_id;
  }
  if (input.in_stock_only) {
    where.inStock = true;
  }

  const orderBy: any = {};
  if (input.sort_by === "price_asc") orderBy.price = "asc";
  else if (input.sort_by === "price_desc") orderBy.price = "desc";
  else orderBy.name = "asc";

  const products = await prisma.supplierProduct.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true } },
    },
    orderBy,
    take: 20,
  });

  return {
    count: products.length,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: Number(p.price),
      unit: p.unit,
      inStock: p.inStock,
      supplier: p.supplier.name,
      supplierId: p.supplier.id,
    })),
  };
}

async function getInventory(
  input: Record<string, any>,
  context: ToolContext
) {
  const where: any = { restaurantId: context.restaurantId };

  if (input.category) {
    where.category = input.category;
  }

  const items = await prisma.inventoryItem.findMany({
    where,
    include: {
      supplierProduct: {
        include: { supplier: { select: { name: true } } },
      },
    },
    orderBy: { name: "asc" },
  });

  let filtered = items;
  if (input.low_stock_only) {
    filtered = items.filter(
      (item) =>
        item.parLevel && Number(item.currentQuantity) <= Number(item.parLevel)
    );
  }

  return {
    count: filtered.length,
    items: filtered.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      currentQuantity: Number(i.currentQuantity),
      unit: i.unit,
      parLevel: i.parLevel ? Number(i.parLevel) : null,
      isLowStock: i.parLevel
        ? Number(i.currentQuantity) <= Number(i.parLevel)
        : false,
      supplier: i.supplierProduct?.supplier?.name || null,
    })),
  };
}

async function getOrderHistory(
  input: Record<string, any>,
  context: ToolContext
) {
  const where: any = { restaurantId: context.restaurantId };

  if (input.status) {
    where.status = input.status;
  }
  if (input.supplier_id) {
    where.supplierId = input.supplier_id;
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true } },
      items: {
        include: { product: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: input.limit || 10,
  });

  return {
    count: orders.length,
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      total: Number(o.total),
      supplier: o.supplier.name,
      itemCount: o.items.length,
      items: o.items.map((i) => ({
        product: i.product.name,
        quantity: Number(i.quantity),
        subtotal: Number(i.subtotal),
      })),
      createdAt: o.createdAt.toISOString(),
    })),
  };
}

async function createDraftOrder(
  input: Record<string, any>,
  context: ToolContext
) {
  const user = await prisma.user.findFirst({
    where: { id: context.userId },
  });

  if (!user) return { error: "User not found" };

  const supplier = await prisma.supplier.findUnique({
    where: { id: input.supplier_id },
  });

  if (!supplier) return { error: "Supplier not found" };

  const productIds = input.items.map((i: any) => i.product_id);
  const products = await prisma.supplierProduct.findMany({
    where: { id: { in: productIds } },
  });

  const productMap = new Map(products.map((p) => [p.id, p]));

  let subtotal = 0;
  const orderItems = input.items.map((item: any) => {
    const product = productMap.get(item.product_id);
    if (!product) throw new Error(`Product not found: ${item.product_id}`);

    const itemSubtotal = Number(product.price) * item.quantity;
    subtotal += itemSubtotal;

    return {
      productId: item.product_id,
      quantity: item.quantity,
      unitPrice: product.price,
      subtotal: itemSubtotal,
    };
  });

  const tax = subtotal * 0.0825;
  const deliveryFee = Number(supplier.deliveryFee) || 0;
  const total = subtotal + tax + deliveryFee;

  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();

  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-${timestamp}-${random}`,
      status: "DRAFT",
      subtotal,
      tax,
      deliveryFee,
      total,
      deliveryNotes: input.delivery_notes || null,
      restaurantId: context.restaurantId,
      supplierId: input.supplier_id,
      createdById: context.userId,
      items: { create: orderItems },
    },
    include: {
      items: { include: { product: { select: { name: true } } } },
      supplier: { select: { name: true } },
    },
  });

  return {
    success: true,
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      supplier: order.supplier.name,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      items: order.items.map((i) => ({
        product: i.product.name,
        quantity: Number(i.quantity),
        subtotal: Number(i.subtotal),
      })),
    },
    message:
      "Draft order created. Go to the Orders page to review and submit it.",
  };
}

async function comparePrices(input: Record<string, any>) {
  const where: any = {
    name: { contains: input.product_name, mode: "insensitive" },
  };

  if (input.category) {
    where.category = input.category;
  }

  const products = await prisma.supplierProduct.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true } },
    },
    orderBy: { price: "asc" },
  });

  if (products.length === 0) {
    return { message: "No matching products found for comparison." };
  }

  const prices = products.map((p) => Number(p.price));

  return {
    productName: input.product_name,
    comparisons: products.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      unit: p.unit,
      inStock: p.inStock,
      supplier: p.supplier.name,
      supplierId: p.supplier.id,
    })),
    summary: {
      lowestPrice: Math.min(...prices),
      highestPrice: Math.max(...prices),
      averagePrice: prices.reduce((a, b) => a + b, 0) / prices.length,
      supplierCount: products.length,
      potentialSavings: Math.max(...prices) - Math.min(...prices),
    },
  };
}

async function getSupplierInfo(input: Record<string, any>) {
  let supplier;

  if (input.supplier_id) {
    supplier = await prisma.supplier.findUnique({
      where: { id: input.supplier_id },
      include: {
        products: { take: 10, orderBy: { name: "asc" } },
        _count: { select: { products: true, orders: true } },
      },
    });
  } else if (input.supplier_name) {
    supplier = await prisma.supplier.findFirst({
      where: { name: { contains: input.supplier_name, mode: "insensitive" } },
      include: {
        products: { take: 10, orderBy: { name: "asc" } },
        _count: { select: { products: true, orders: true } },
      },
    });
  }

  if (!supplier) return { error: "Supplier not found" };

  return {
    id: supplier.id,
    name: supplier.name,
    description: supplier.description,
    email: supplier.email,
    phone: supplier.phone,
    location: [supplier.city, supplier.state].filter(Boolean).join(", "),
    minimumOrder: supplier.minimumOrder ? Number(supplier.minimumOrder) : null,
    deliveryFee: supplier.deliveryFee ? Number(supplier.deliveryFee) : null,
    leadTimeDays: supplier.leadTimeDays,
    rating: supplier.rating ? Number(supplier.rating) : null,
    reviewCount: supplier.reviewCount,
    totalProducts: supplier._count.products,
    totalOrders: supplier._count.orders,
    sampleProducts: supplier.products.map((p) => ({
      id: p.id,
      name: p.name,
      price: Number(p.price),
      unit: p.unit,
      category: p.category,
    })),
  };
}

async function createPriceAlert(
  input: Record<string, any>,
  context: ToolContext
) {
  const product = await prisma.supplierProduct.findUnique({
    where: { id: input.product_id },
    include: { supplier: { select: { name: true } } },
  });

  if (!product) return { error: "Product not found" };

  const existing = await prisma.priceAlert.findFirst({
    where: {
      userId: context.userId,
      productId: input.product_id,
      isActive: true,
    },
  });

  if (existing) {
    return {
      error: "An active alert already exists for this product",
      existingAlertId: existing.id,
    };
  }

  const alert = await prisma.priceAlert.create({
    data: {
      userId: context.userId,
      productId: input.product_id,
      alertType: input.alert_type,
      targetPrice: input.target_price,
    },
  });

  return {
    success: true,
    alert: {
      id: alert.id,
      alertType: alert.alertType,
      targetPrice: Number(alert.targetPrice),
      product: product.name,
      currentPrice: Number(product.price),
      supplier: product.supplier.name,
    },
    message: `Price alert created for ${product.name}. You'll be notified when the price ${input.alert_type === "PRICE_DROP" ? "drops below" : input.alert_type === "PRICE_INCREASE" ? "rises above" : "crosses"} $${input.target_price}.`,
  };
}

async function adjustInventory(
  input: Record<string, any>,
  context: ToolContext
) {
  // Find inventory item by name (case-insensitive fuzzy match)
  const matches = await prisma.inventoryItem.findMany({
    where: {
      restaurantId: context.restaurantId,
      name: { contains: input.item_name, mode: "insensitive" },
    },
  });

  if (matches.length === 0) {
    return {
      error: `No inventory item found matching "${input.item_name}". Check the name and try again, or use get_inventory to see available items.`,
    };
  }

  if (matches.length > 1) {
    return {
      error: "Multiple items matched. Please be more specific.",
      matches: matches.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        currentQuantity: Number(m.currentQuantity),
        unit: m.unit,
      })),
    };
  }

  const item = matches[0];
  const previousQuantity = Number(item.currentQuantity);
  let newQuantity: number;

  if (input.change_type === "COUNT") {
    newQuantity = input.quantity;
  } else if (input.change_type === "USED" || input.change_type === "WASTE") {
    newQuantity = previousQuantity - Math.abs(input.quantity);
  } else {
    // RECEIVED
    newQuantity = previousQuantity + input.quantity;
  }

  // Don't allow negative inventory
  if (newQuantity < 0) newQuantity = 0;

  // Update item quantity
  await prisma.inventoryItem.update({
    where: { id: item.id },
    data: { currentQuantity: newQuantity },
  });

  // Create log entry
  await prisma.inventoryLog.create({
    data: {
      inventoryItemId: item.id,
      changeType: input.change_type,
      quantity:
        input.change_type === "COUNT"
          ? newQuantity - previousQuantity
          : input.quantity,
      previousQuantity,
      newQuantity,
      notes: input.notes || null,
      reference: null,
      createdById: context.userId,
    },
  });

  // Check if below par level and emit event
  const itemParLevel = item.parLevel ? Number(item.parLevel) : null;
  if (itemParLevel && newQuantity < itemParLevel) {
    inngest
      .send({
        name: "inventory/below.par",
        data: {
          inventoryItemId: item.id,
          restaurantId: context.restaurantId,
          itemName: item.name,
          currentQuantity: newQuantity,
          parLevel: itemParLevel,
        },
      })
      .catch(() => {});
  }

  return {
    success: true,
    item: item.name,
    unit: item.unit,
    previousQuantity,
    newQuantity,
    changeType: input.change_type,
    belowParLevel: itemParLevel ? newQuantity < itemParLevel : false,
    message: `Updated ${item.name}: ${previousQuantity} → ${newQuantity} ${item.unit} (${input.change_type})`,
  };
}

async function getConsumptionInsights(
  input: Record<string, any>,
  context: ToolContext
) {
  const where: any = { restaurantId: context.restaurantId };

  if (input.category) {
    where.inventoryItem = { category: input.category };
  }
  if (input.item_name) {
    where.inventoryItem = {
      ...where.inventoryItem,
      name: { contains: input.item_name, mode: "insensitive" },
    };
  }

  const insights = await prisma.consumptionInsight.findMany({
    where,
    include: {
      inventoryItem: {
        select: {
          name: true,
          category: true,
          currentQuantity: true,
          unit: true,
          parLevel: true,
        },
      },
    },
    orderBy: { daysUntilStockout: "asc" },
    take: 20,
  });

  if (insights.length === 0) {
    return {
      message:
        "No consumption insights available yet. Insights are generated weekly from usage data (USED/WASTE inventory logs). Keep tracking inventory usage and insights will appear after the next analysis run.",
    };
  }

  const criticalItems = insights.filter(
    (i) => i.daysUntilStockout && Number(i.daysUntilStockout) < 3
  );

  return {
    count: insights.length,
    criticalCount: criticalItems.length,
    insights: insights.map((i) => ({
      itemName: i.inventoryItem.name,
      category: i.inventoryItem.category,
      unit: i.inventoryItem.unit,
      currentQuantity: Number(i.inventoryItem.currentQuantity),
      currentParLevel: i.inventoryItem.parLevel
        ? Number(i.inventoryItem.parLevel)
        : null,
      avgDailyUsage: Number(i.avgDailyUsage),
      avgWeeklyUsage: Number(i.avgWeeklyUsage),
      trendDirection: i.trendDirection,
      daysUntilStockout: i.daysUntilStockout
        ? Number(i.daysUntilStockout)
        : null,
      suggestedParLevel: i.suggestedParLevel
        ? Number(i.suggestedParLevel)
        : null,
      dataPointCount: i.dataPointCount,
      lastAnalyzedAt: i.lastAnalyzedAt.toISOString(),
    })),
  };
}

async function reorderItem(
  input: Record<string, any>,
  context: ToolContext
) {
  // Search past DELIVERED orders containing matching item
  const pastOrders = await prisma.order.findMany({
    where: {
      restaurantId: context.restaurantId,
      status: "DELIVERED",
      items: {
        some: {
          product: {
            name: { contains: input.item_name, mode: "insensitive" },
          },
        },
      },
      ...(input.supplier_name
        ? {
            supplier: {
              name: { contains: input.supplier_name, mode: "insensitive" },
            },
          }
        : {}),
    },
    include: {
      supplier: { select: { id: true, name: true, status: true, deliveryFee: true } },
      items: {
        include: { product: { select: { id: true, name: true, price: true, inStock: true, unit: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  if (pastOrders.length === 0) {
    return {
      error: `No past delivered orders found matching "${input.item_name}". Try search_products to find available items.`,
    };
  }

  // Find the most recent order with a matching item
  let matchedOrder = null;
  let matchedItem = null;

  for (const order of pastOrders) {
    const item = order.items.find((i) =>
      i.product.name.toLowerCase().includes(input.item_name.toLowerCase())
    );
    if (item) {
      matchedOrder = order;
      matchedItem = item;
      break;
    }
  }

  if (!matchedOrder || !matchedItem) {
    return {
      error: `Could not find a matching item in past orders for "${input.item_name}".`,
    };
  }

  // Verify supplier is still active
  if (matchedOrder.supplier.status !== "VERIFIED") {
    return {
      error: `Supplier "${matchedOrder.supplier.name}" is no longer verified (status: ${matchedOrder.supplier.status}). Use search_products to find an alternative supplier.`,
    };
  }

  // Verify product is still in stock
  if (!matchedItem.product.inStock) {
    return {
      error: `"${matchedItem.product.name}" is currently out of stock from ${matchedOrder.supplier.name}. Use search_products to find alternatives.`,
    };
  }

  const quantity = input.quantity || Number(matchedItem.quantity);
  const currentPrice = Number(matchedItem.product.price);
  const subtotal = currentPrice * quantity;
  const tax = subtotal * 0.0825;
  const deliveryFee = matchedOrder.supplier.deliveryFee
    ? Number(matchedOrder.supplier.deliveryFee)
    : 0;
  const total = subtotal + tax + deliveryFee;

  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();

  const order = await prisma.order.create({
    data: {
      orderNumber: `ORD-${timestamp}-${random}`,
      status: "DRAFT",
      subtotal,
      tax,
      deliveryFee,
      total,
      restaurantId: context.restaurantId,
      supplierId: matchedOrder.supplier.id,
      createdById: context.userId,
      items: {
        create: [
          {
            productId: matchedItem.product.id,
            quantity,
            unitPrice: matchedItem.product.price,
            subtotal,
          },
        ],
      },
    },
    include: {
      items: { include: { product: { select: { name: true, unit: true } } } },
      supplier: { select: { name: true } },
    },
  });

  return {
    success: true,
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      supplier: order.supplier.name,
      subtotal: Number(order.subtotal),
      tax: Number(order.tax),
      deliveryFee: Number(order.deliveryFee),
      total: Number(order.total),
      items: order.items.map((i) => ({
        product: i.product.name,
        quantity: Number(i.quantity),
        unit: i.product.unit,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
    },
    basedOn: {
      previousOrderNumber: matchedOrder.orderNumber,
      previousQuantity: Number(matchedItem.quantity),
    },
    message:
      "Draft order created based on your past order. Go to the Orders page to review and submit it.",
  };
}

function getDateRange(timeRange: string): { start: Date; end: Date; prevStart: Date; prevEnd: Date } {
  const now = new Date();
  let start: Date;
  let end: Date = now;
  let periodMs: number;

  switch (timeRange) {
    case "this_week": {
      const day = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      periodMs = end.getTime() - start.getTime();
      break;
    }
    case "last_week": {
      const day = now.getDay();
      end = new Date(now);
      end.setDate(now.getDate() - day);
      end.setHours(0, 0, 0, 0);
      start = new Date(end);
      start.setDate(end.getDate() - 7);
      periodMs = 7 * 24 * 60 * 60 * 1000;
      break;
    }
    case "this_month": {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      periodMs = end.getTime() - start.getTime();
      break;
    }
    case "last_month": {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end = new Date(now.getFullYear(), now.getMonth(), 1);
      periodMs = end.getTime() - start.getTime();
      break;
    }
    case "last_30_days": {
      start = new Date(now);
      start.setDate(now.getDate() - 30);
      periodMs = 30 * 24 * 60 * 60 * 1000;
      break;
    }
    case "last_90_days": {
      start = new Date(now);
      start.setDate(now.getDate() - 90);
      periodMs = 90 * 24 * 60 * 60 * 1000;
      break;
    }
    case "this_year": {
      start = new Date(now.getFullYear(), 0, 1);
      periodMs = end.getTime() - start.getTime();
      break;
    }
    default: {
      start = new Date(now);
      start.setDate(now.getDate() - 30);
      periodMs = 30 * 24 * 60 * 60 * 1000;
      break;
    }
  }

  const prevEnd = new Date(start);
  const prevStart = new Date(prevEnd.getTime() - periodMs);

  return { start, end, prevStart, prevEnd };
}

async function getSpendingSummary(
  input: Record<string, any>,
  context: ToolContext
) {
  const { start, end, prevStart, prevEnd } = getDateRange(input.time_range);

  const baseWhere: any = {
    restaurantId: context.restaurantId,
    status: { notIn: ["CANCELLED", "DRAFT"] },
  };

  if (input.supplier_name) {
    baseWhere.supplier = {
      name: { contains: input.supplier_name, mode: "insensitive" },
    };
  }

  // Current period orders
  const currentOrders = await prisma.order.findMany({
    where: {
      ...baseWhere,
      createdAt: { gte: start, lte: end },
    },
    include: {
      supplier: { select: { name: true } },
      items: {
        include: { product: { select: { name: true, category: true } } },
      },
    },
  });

  // Previous period orders for comparison
  const prevOrders = await prisma.order.findMany({
    where: {
      ...baseWhere,
      createdAt: { gte: prevStart, lte: prevEnd },
    },
    select: {
      total: true,
      items: {
        select: {
          subtotal: true,
          product: { select: { category: true } },
        },
      },
    },
  });

  // Aggregate current period
  const categoryBreakdown: Record<string, number> = {};
  const supplierBreakdown: Record<string, number> = {};
  const itemSpend: Record<string, { name: string; spend: number; quantity: number }> = {};
  let totalSpend = 0;

  for (const order of currentOrders) {
    for (const item of order.items) {
      const itemSubtotal = Number(item.subtotal);
      const category = item.product.category;
      const supplierName = order.supplier.name;

      // If category filter is set, only count matching items
      if (input.category && category !== input.category) continue;

      totalSpend += itemSubtotal;
      categoryBreakdown[category] = (categoryBreakdown[category] || 0) + itemSubtotal;
      supplierBreakdown[supplierName] = (supplierBreakdown[supplierName] || 0) + itemSubtotal;

      const key = item.product.name;
      if (!itemSpend[key]) {
        itemSpend[key] = { name: key, spend: 0, quantity: 0 };
      }
      itemSpend[key].spend += itemSubtotal;
      itemSpend[key].quantity += Number(item.quantity);
    }
  }

  // If no category filter, use order totals for totalSpend (more accurate with tax/fees)
  if (!input.category) {
    totalSpend = currentOrders.reduce((sum, o) => sum + Number(o.total), 0);
  }

  // Previous period total
  let prevTotalSpend = 0;
  if (input.category) {
    for (const order of prevOrders) {
      for (const item of order.items) {
        if (item.product.category === input.category) {
          prevTotalSpend += Number(item.subtotal);
        }
      }
    }
  } else {
    prevTotalSpend = prevOrders.reduce((sum, o) => sum + Number(o.total), 0);
  }

  const changePercent =
    prevTotalSpend > 0
      ? Math.round(((totalSpend - prevTotalSpend) / prevTotalSpend) * 10000) / 100
      : null;
  const trend =
    changePercent === null
      ? "no_previous_data"
      : changePercent > 1
        ? "up"
        : changePercent < -1
          ? "down"
          : "flat";

  // Top 5 items by spend
  const topItems = Object.values(itemSpend)
    .sort((a, b) => b.spend - a.spend)
    .slice(0, 5)
    .map((i) => ({
      name: i.name,
      spend: Math.round(i.spend * 100) / 100,
      quantity: i.quantity,
    }));

  // Round breakdowns
  const roundedCategoryBreakdown: Record<string, number> = {};
  for (const [k, v] of Object.entries(categoryBreakdown)) {
    roundedCategoryBreakdown[k] = Math.round(v * 100) / 100;
  }
  const roundedSupplierBreakdown: Record<string, number> = {};
  for (const [k, v] of Object.entries(supplierBreakdown)) {
    roundedSupplierBreakdown[k] = Math.round(v * 100) / 100;
  }

  return {
    timeRange: input.time_range,
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
    totalSpend: Math.round(totalSpend * 100) / 100,
    orderCount: currentOrders.length,
    categoryBreakdown: roundedCategoryBreakdown,
    supplierBreakdown: roundedSupplierBreakdown,
    topItems,
    comparison: {
      previousPeriodSpend: Math.round(prevTotalSpend * 100) / 100,
      changePercent,
      trend,
    },
  };
}
