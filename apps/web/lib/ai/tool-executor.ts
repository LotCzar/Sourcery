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
    case "generate_restock_list":
      return generateRestockList(input, context);
    case "check_invoice":
      return checkInvoice(input, context);
    case "calculate_menu_cost":
      return calculateMenuCost(input);
    case "recommend_supplier":
      return recommendSupplier(input, context);
    case "optimize_par_levels":
      return optimizeParLevels(input, context);
    case "analyze_waste":
      return analyzeWaste(input, context);
    case "consolidate_orders":
      return consolidateOrders(input, context);
    case "get_supplier_performance":
      return getSupplierPerformance(input, context);
    case "get_budget_forecast":
      return getBudgetForecast(input, context);
    case "get_disputed_invoices":
      return getDisputedInvoices(input, context);
    case "get_seasonal_forecast":
      return getSeasonalForecast(input, context);
    case "find_substitutes":
      return findSubstitutes(input, context);
    case "get_price_trends":
      return getPriceTrends(input, context);
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

async function generateRestockList(
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
        include: { supplier: { select: { id: true, name: true, deliveryFee: true } } },
      },
      consumptionInsights: {
        where: { restaurantId: context.restaurantId },
        take: 1,
      },
    },
  });

  // Filter to items below par (or all if include_all)
  let restockItems = items;
  if (!input.include_all) {
    restockItems = items.filter(
      (item) =>
        item.parLevel && Number(item.currentQuantity) <= Number(item.parLevel)
    );
  }

  if (restockItems.length === 0) {
    return { message: "All inventory items are above par level. Nothing to restock." };
  }

  // Calculate suggested quantities and find suppliers for unlinked items
  const restockEntries: any[] = [];
  for (const item of restockItems) {
    const currentQty = Number(item.currentQuantity);
    const parLevel = item.parLevel ? Number(item.parLevel) : 0;
    const insight = item.consumptionInsights[0];

    let suggestedQty: number;
    if (insight?.suggestedParLevel) {
      suggestedQty = Math.max(Number(insight.suggestedParLevel) - currentQty, parLevel - currentQty);
    } else {
      suggestedQty = Math.max(parLevel - currentQty, 0);
    }
    if (suggestedQty <= 0) suggestedQty = parLevel > 0 ? parLevel : 1;

    let supplierProduct = item.supplierProduct;

    // If no linked supplier product, try to find cheapest match
    if (!supplierProduct) {
      const match = await prisma.supplierProduct.findFirst({
        where: {
          name: { contains: item.name, mode: "insensitive" },
          inStock: true,
        },
        include: { supplier: { select: { id: true, name: true, deliveryFee: true } } },
        orderBy: { price: "asc" },
      });
      if (match) supplierProduct = match;
    }

    restockEntries.push({
      itemId: item.id,
      itemName: item.name,
      category: item.category,
      unit: item.unit,
      currentQuantity: currentQty,
      parLevel,
      suggestedQuantity: Math.ceil(suggestedQty),
      supplierId: supplierProduct?.supplier?.id || null,
      supplierName: supplierProduct?.supplier?.name || "No supplier found",
      productId: supplierProduct?.id || null,
      unitPrice: supplierProduct ? Number(supplierProduct.price) : null,
      estimatedCost: supplierProduct
        ? Math.round(Number(supplierProduct.price) * Math.ceil(suggestedQty) * 100) / 100
        : null,
    });
  }

  // Group by supplier
  const grouped: Record<string, { supplier: string; supplierId: string | null; items: any[]; subtotal: number }> = {};
  for (const entry of restockEntries) {
    const key = entry.supplierId || "unlinked";
    if (!grouped[key]) {
      grouped[key] = {
        supplier: entry.supplierName,
        supplierId: entry.supplierId,
        items: [],
        subtotal: 0,
      };
    }
    grouped[key].items.push(entry);
    if (entry.estimatedCost) grouped[key].subtotal += entry.estimatedCost;
  }

  const supplierGroups = Object.values(grouped).map((g) => ({
    ...g,
    subtotal: Math.round(g.subtotal * 100) / 100,
  }));

  // Auto-create draft orders if requested
  const createdOrders: any[] = [];
  if (input.auto_create_orders) {
    const user = await prisma.user.findFirst({ where: { id: context.userId } });
    if (!user) return { error: "User not found" };

    for (const group of supplierGroups) {
      if (!group.supplierId) continue;
      const validItems = group.items.filter((i: any) => i.productId && i.unitPrice);
      if (validItems.length === 0) continue;

      let subtotal = 0;
      const orderItems = validItems.map((item: any) => {
        const itemSubtotal = item.unitPrice * item.suggestedQuantity;
        subtotal += itemSubtotal;
        return {
          productId: item.productId,
          quantity: item.suggestedQuantity,
          unitPrice: item.unitPrice,
          subtotal: itemSubtotal,
        };
      });

      const tax = subtotal * 0.0825;
      const deliveryFee = 0;
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
          deliveryNotes: "Auto-generated restock order",
          restaurantId: context.restaurantId,
          supplierId: group.supplierId,
          createdById: context.userId,
          items: { create: orderItems },
        },
        include: { supplier: { select: { name: true } } },
      });

      createdOrders.push({
        orderId: order.id,
        orderNumber: order.orderNumber,
        supplier: order.supplier.name,
        total: Math.round(total * 100) / 100,
        itemCount: orderItems.length,
      });
    }
  }

  return {
    totalItems: restockEntries.length,
    supplierGroups,
    estimatedTotal: Math.round(
      supplierGroups.reduce((sum, g) => sum + g.subtotal, 0) * 100
    ) / 100,
    ...(createdOrders.length > 0
      ? {
          ordersCreated: createdOrders,
          message: `Created ${createdOrders.length} draft order(s). Go to the Orders page to review and submit.`,
        }
      : {}),
  };
}

async function checkInvoice(
  input: Record<string, any>,
  context: ToolContext
) {
  let invoice;

  if (input.invoice_id) {
    invoice = await prisma.invoice.findFirst({
      where: { id: input.invoice_id, restaurantId: context.restaurantId },
      include: {
        order: {
          include: {
            items: {
              include: { product: { select: { name: true, price: true, unit: true } } },
            },
          },
        },
        supplier: { select: { name: true } },
      },
    });
  } else if (input.invoice_number) {
    invoice = await prisma.invoice.findFirst({
      where: {
        restaurantId: context.restaurantId,
        invoiceNumber: { contains: input.invoice_number, mode: "insensitive" },
      },
      include: {
        order: {
          include: {
            items: {
              include: { product: { select: { name: true, price: true, unit: true } } },
            },
          },
        },
        supplier: { select: { name: true } },
      },
    });
  }

  if (!invoice) {
    return { error: "Invoice not found. Check the invoice number or ID and try again." };
  }

  if (!invoice.order) {
    return {
      invoiceNumber: invoice.invoiceNumber,
      supplier: invoice.supplier.name,
      total: Number(invoice.total),
      status: "NO_LINKED_ORDER",
      message: "This invoice has no linked order to compare against.",
    };
  }

  const order = invoice.order;
  const discrepancies: any[] = [];

  // Compare totals
  const invoiceSubtotal = Number(invoice.subtotal);
  const orderSubtotal = Number(order.subtotal);
  const invoiceTax = Number(invoice.tax);
  const orderTax = Number(order.tax);
  const invoiceTotal = Number(invoice.total);
  const orderTotal = Number(order.total);

  if (Math.abs(invoiceSubtotal - orderSubtotal) > 0.01) {
    discrepancies.push({
      type: "SUBTOTAL_MISMATCH",
      invoiceValue: invoiceSubtotal,
      orderValue: orderSubtotal,
      difference: Math.round((invoiceSubtotal - orderSubtotal) * 100) / 100,
    });
  }

  if (Math.abs(invoiceTax - orderTax) > 0.01) {
    discrepancies.push({
      type: "TAX_MISMATCH",
      invoiceValue: invoiceTax,
      orderValue: orderTax,
      difference: Math.round((invoiceTax - orderTax) * 100) / 100,
    });
  }

  if (Math.abs(invoiceTotal - orderTotal) > 0.01) {
    discrepancies.push({
      type: "TOTAL_MISMATCH",
      invoiceValue: invoiceTotal,
      orderValue: orderTotal,
      difference: Math.round((invoiceTotal - orderTotal) * 100) / 100,
    });
  }

  // Check each order item for price changes
  const priceChanges: any[] = [];
  for (const item of order.items) {
    const orderPrice = Number(item.unitPrice);
    const currentPrice = Number(item.product.price);
    if (Math.abs(orderPrice - currentPrice) > 0.01) {
      priceChanges.push({
        product: item.product.name,
        orderPrice,
        currentPrice,
        change: Math.round((currentPrice - orderPrice) * 100) / 100,
        changePercent: Math.round(((currentPrice - orderPrice) / orderPrice) * 10000) / 100,
      });
    }
  }

  const hasDiscrepancies = discrepancies.length > 0;
  const totalDifference = hasDiscrepancies
    ? Math.round((invoiceTotal - orderTotal) * 100) / 100
    : 0;

  return {
    invoiceNumber: invoice.invoiceNumber,
    supplier: invoice.supplier.name,
    status: hasDiscrepancies ? "DISCREPANCIES_FOUND" : "MATCH",
    invoice: {
      subtotal: invoiceSubtotal,
      tax: invoiceTax,
      total: invoiceTotal,
    },
    order: {
      orderNumber: order.orderNumber,
      subtotal: orderSubtotal,
      tax: orderTax,
      total: orderTotal,
    },
    discrepancies,
    priceChanges,
    summary: hasDiscrepancies
      ? `Found ${discrepancies.length} discrepancy(ies). Invoice is $${Math.abs(totalDifference).toFixed(2)} ${totalDifference > 0 ? "higher" : "lower"} than the order.`
      : "Invoice matches the order. No discrepancies found.",
  };
}

async function calculateMenuCost(input: Record<string, any>) {
  const targetPercent = input.target_food_cost_percent || 30;
  const ingredientBreakdown: any[] = [];
  let totalCost = 0;
  const missingIngredients: string[] = [];

  for (const ingredient of input.ingredients) {
    const products = await prisma.supplierProduct.findMany({
      where: {
        name: { contains: ingredient.name, mode: "insensitive" },
        inStock: true,
      },
      include: { supplier: { select: { name: true } } },
      orderBy: { price: "asc" },
      take: 1,
    });

    if (products.length === 0) {
      missingIngredients.push(ingredient.name);
      ingredientBreakdown.push({
        name: ingredient.name,
        quantity: ingredient.quantity,
        unit: ingredient.unit || null,
        unitPrice: null,
        cost: null,
        supplier: null,
        status: "NOT_FOUND",
      });
      continue;
    }

    const product = products[0];
    const unitPrice = Number(product.price);
    const cost = Math.round(unitPrice * ingredient.quantity * 100) / 100;
    totalCost += cost;

    ingredientBreakdown.push({
      name: ingredient.name,
      quantity: ingredient.quantity,
      unit: ingredient.unit || product.unit,
      unitPrice,
      cost,
      supplier: product.supplier.name,
      status: "FOUND",
    });
  }

  const suggestedMenuPrice = totalCost > 0
    ? Math.round((totalCost / (targetPercent / 100)) * 100) / 100
    : 0;
  const margin = suggestedMenuPrice - totalCost;

  return {
    dishName: input.dish_name,
    ingredients: ingredientBreakdown,
    totalCostPerPlate: Math.round(totalCost * 100) / 100,
    targetFoodCostPercent: targetPercent,
    suggestedMenuPrice,
    margin: Math.round(margin * 100) / 100,
    marginPercent: Math.round((1 - targetPercent / 100) * 10000) / 100,
    missingIngredients,
    message: missingIngredients.length > 0
      ? `Cost calculated but ${missingIngredients.length} ingredient(s) not found in supplier catalog. Actual cost may be higher.`
      : `Total plate cost: $${totalCost.toFixed(2)}. Suggested menu price at ${targetPercent}% food cost: $${suggestedMenuPrice.toFixed(2)}.`,
  };
}

async function recommendSupplier(
  input: Record<string, any>,
  context: ToolContext
) {
  const where: any = {};
  if (input.product_name) {
    where.name = { contains: input.product_name, mode: "insensitive" };
  }
  if (input.category) {
    where.category = input.category;
  }

  if (!input.product_name && !input.category) {
    return { error: "Please provide a product_name or category to search for." };
  }

  const products = await prisma.supplierProduct.findMany({
    where,
    include: {
      supplier: {
        select: {
          id: true,
          name: true,
          rating: true,
          leadTimeDays: true,
          deliveryFee: true,
          minimumOrder: true,
          status: true,
          reviewCount: true,
        },
      },
    },
  });

  // Filter to VERIFIED suppliers only
  const verified = products.filter((p) => p.supplier.status === "VERIFIED");
  if (verified.length === 0) {
    return { message: "No verified suppliers found for this search." };
  }

  // Group by supplier, track best price
  const supplierMap: Record<string, {
    supplier: any;
    bestPrice: number;
    productCount: number;
    products: any[];
  }> = {};

  for (const p of verified) {
    const sid = p.supplier.id;
    if (!supplierMap[sid]) {
      supplierMap[sid] = {
        supplier: p.supplier,
        bestPrice: Number(p.price),
        productCount: 0,
        products: [],
      };
    }
    const price = Number(p.price);
    if (price < supplierMap[sid].bestPrice) supplierMap[sid].bestPrice = price;
    supplierMap[sid].productCount++;
    supplierMap[sid].products.push({
      name: p.name,
      price: Number(p.price),
      unit: p.unit,
      inStock: p.inStock,
    });
  }

  // Get order history per supplier for this restaurant
  const supplierIds = Object.keys(supplierMap);
  const orderCounts = await prisma.order.groupBy({
    by: ["supplierId"],
    where: {
      restaurantId: context.restaurantId,
      supplierId: { in: supplierIds },
      status: "DELIVERED",
    },
    _count: { id: true },
  });

  const orderCountMap: Record<string, number> = {};
  for (const oc of orderCounts) {
    orderCountMap[oc.supplierId] = oc._count.id;
  }

  // Find price range for normalization
  const allPrices = Object.values(supplierMap).map((s) => s.bestPrice);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice || 1;

  const maxOrders = Math.max(...Object.values(orderCountMap), 1);

  // Score suppliers
  const scored = Object.entries(supplierMap).map(([sid, data]) => {
    const rating = data.supplier.rating ? Number(data.supplier.rating) : 3;
    const leadTime = data.supplier.leadTimeDays || 3;
    const orders = orderCountMap[sid] || 0;

    // Price score: 0–1, lower is better
    const priceScore = 1 - (data.bestPrice - minPrice) / priceRange;
    // Rating score: 0–1
    const ratingScore = rating / 5;
    // Lead time score: 0–1, shorter is better (cap at 14 days)
    const leadTimeScore = 1 - Math.min(leadTime, 14) / 14;
    // Order history score: 0–1
    const historyScore = orders / maxOrders;

    const totalScore =
      priceScore * 0.4 +
      ratingScore * 0.25 +
      leadTimeScore * 0.15 +
      historyScore * 0.2;

    return {
      supplierId: sid,
      supplierName: data.supplier.name,
      rating: Number(data.supplier.rating) || null,
      reviewCount: data.supplier.reviewCount,
      leadTimeDays: data.supplier.leadTimeDays,
      deliveryFee: data.supplier.deliveryFee ? Number(data.supplier.deliveryFee) : null,
      minimumOrder: data.supplier.minimumOrder ? Number(data.supplier.minimumOrder) : null,
      bestPrice: data.bestPrice,
      matchingProducts: data.products,
      pastOrders: orders,
      score: Math.round(totalScore * 100) / 100,
      breakdown: {
        price: Math.round(priceScore * 100) / 100,
        rating: Math.round(ratingScore * 100) / 100,
        leadTime: Math.round(leadTimeScore * 100) / 100,
        history: Math.round(historyScore * 100) / 100,
      },
    };
  });

  scored.sort((a, b) => b.score - a.score);

  return {
    query: input.product_name || input.category,
    recommendations: scored,
    topPick: scored[0]
      ? `${scored[0].supplierName} (score: ${scored[0].score}) — best price: $${scored[0].bestPrice.toFixed(2)}`
      : null,
  };
}

async function analyzeWaste(
  input: Record<string, any>,
  context: ToolContext
) {
  const days = input.days || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const itemWhere: any = { restaurantId: context.restaurantId };
  if (input.category) {
    itemWhere.category = input.category;
  }

  // Get inventory items for this restaurant (scoped by category)
  const inventoryItems = await prisma.inventoryItem.findMany({
    where: itemWhere,
    select: { id: true, name: true, category: true, unit: true, costPerUnit: true, parLevel: true },
  });

  if (inventoryItems.length === 0) {
    return { message: "No inventory items found." };
  }

  const itemIds = inventoryItems.map((i) => i.id);

  // Fetch WASTE and USED logs in parallel
  const [wasteLogs, usedLogs] = await Promise.all([
    prisma.inventoryLog.findMany({
      where: {
        inventoryItemId: { in: itemIds },
        changeType: "WASTE",
        createdAt: { gte: startDate },
      },
    }),
    prisma.inventoryLog.findMany({
      where: {
        inventoryItemId: { in: itemIds },
        changeType: "USED",
        createdAt: { gte: startDate },
      },
    }),
  ]);

  // Aggregate by item
  const itemMap = new Map(inventoryItems.map((i) => [i.id, i]));
  const wasteAgg: Record<string, number> = {};
  const usedAgg: Record<string, number> = {};

  for (const log of wasteLogs) {
    wasteAgg[log.inventoryItemId] =
      (wasteAgg[log.inventoryItemId] || 0) + Math.abs(Number(log.quantity));
  }
  for (const log of usedLogs) {
    usedAgg[log.inventoryItemId] =
      (usedAgg[log.inventoryItemId] || 0) + Math.abs(Number(log.quantity));
  }

  // Build analysis results
  const analysis: any[] = [];
  let totalDollarLoss = 0;

  for (const itemId of Object.keys(wasteAgg)) {
    const item = itemMap.get(itemId);
    if (!item) continue;

    const wasteQty = wasteAgg[itemId];
    const usedQty = usedAgg[itemId] || 0;
    const costPerUnit = item.costPerUnit ? Number(item.costPerUnit) : 0;
    const dollarLoss = Math.round(wasteQty * costPerUnit * 100) / 100;
    const wastePercent =
      wasteQty + usedQty > 0
        ? Math.round((wasteQty / (wasteQty + usedQty)) * 10000) / 100
        : 0;

    totalDollarLoss += dollarLoss;

    const entry: any = {
      itemName: item.name,
      category: item.category,
      unit: item.unit,
      wasteQuantity: wasteQty,
      usedQuantity: usedQty,
      dollarLoss,
      wastePercent,
    };

    // Suggest par level reduction for high waste
    if (wastePercent > 20 && item.parLevel) {
      const currentPar = Number(item.parLevel);
      const suggestedPar = Math.max(
        Math.round(currentPar * (1 - wastePercent / 200)),
        1
      );
      entry.suggestion = `Reduce par level from ${currentPar} to ${suggestedPar} (${item.unit}) — waste rate is ${wastePercent}%`;
      entry.suggestedParLevel = suggestedPar;
    }

    analysis.push(entry);
  }

  // Sort by dollar loss descending
  analysis.sort((a, b) => b.dollarLoss - a.dollarLoss);

  const highWasteCount = analysis.filter((a) => a.wastePercent > 20).length;

  return {
    periodDays: days,
    itemsWithWaste: analysis.length,
    totalDollarLoss: Math.round(totalDollarLoss * 100) / 100,
    highWasteItemCount: highWasteCount,
    items: analysis,
    message:
      analysis.length === 0
        ? "No waste recorded in this period."
        : `Found $${totalDollarLoss.toFixed(2)} in waste across ${analysis.length} items over ${days} days.${highWasteCount > 0 ? ` ${highWasteCount} item(s) have >20% waste rate — consider reducing par levels.` : ""}`,
  };
}

async function optimizeParLevels(
  input: Record<string, any>,
  context: ToolContext
) {
  const insightWhere: any = {
    restaurantId: context.restaurantId,
    dataPointCount: { gte: 30 },
    suggestedParLevel: { not: null },
  };

  if (input.category) {
    insightWhere.inventoryItem = { category: input.category };
  }

  const insights = await prisma.consumptionInsight.findMany({
    where: insightWhere,
    include: {
      inventoryItem: {
        include: {
          supplierProduct: {
            include: {
              supplier: { select: { leadTimeDays: true } },
            },
          },
        },
      },
    },
  });

  const suggestions: Array<{
    itemName: string;
    category: string;
    currentPar: number;
    optimalPar: number;
    direction: string;
    avgDailyUsage: number;
    trend: string;
    leadTimeDays: number;
  }> = [];

  for (const insight of insights) {
    const currentPar = insight.inventoryItem.parLevel
      ? Number(insight.inventoryItem.parLevel)
      : 0;
    if (currentPar === 0) continue;

    const avgDailyUsage = Number(insight.avgDailyUsage);
    const leadTimeDays =
      insight.inventoryItem.supplierProduct?.supplier?.leadTimeDays ?? 3;
    const trend = insight.trendDirection;
    const bufferDays = trend === "UP" ? 3 : trend === "STABLE" ? 2 : 1;
    const optimalPar = Math.ceil(avgDailyUsage * (leadTimeDays + bufferDays));

    const diff = Math.abs(optimalPar - currentPar);
    if (diff / currentPar > 0.2) {
      suggestions.push({
        itemName: insight.inventoryItem.name,
        category: insight.inventoryItem.category,
        currentPar,
        optimalPar,
        direction: optimalPar > currentPar ? "increase" : "decrease",
        avgDailyUsage: Math.round(avgDailyUsage * 100) / 100,
        trend,
        leadTimeDays,
      });
    }
  }

  if (suggestions.length === 0) {
    return {
      totalSuggestions: 0,
      message:
        "All par levels are within 20% of optimal values based on current usage data. No adjustments needed.",
    };
  }

  const increases = suggestions.filter((s) => s.direction === "increase").length;
  const decreases = suggestions.filter((s) => s.direction === "decrease").length;

  let applied = false;
  if (input.apply) {
    for (const suggestion of suggestions) {
      const insight = insights.find(
        (i) => i.inventoryItem.name === suggestion.itemName
      );
      if (insight) {
        await prisma.inventoryItem.update({
          where: { id: insight.inventoryItemId },
          data: { parLevel: suggestion.optimalPar },
        });
      }
    }
    applied = true;
  }

  return {
    totalSuggestions: suggestions.length,
    increases,
    decreases,
    applied,
    suggestions,
    message: applied
      ? `Applied ${suggestions.length} par level adjustment(s): ${increases} increased, ${decreases} decreased.`
      : `Found ${suggestions.length} par level adjustment(s): ${increases} to increase, ${decreases} to decrease. Use apply: true to apply changes.`,
  };
}

async function consolidateOrders(
  input: Record<string, any>,
  context: ToolContext
) {
  const orderIds: string[] = input.order_ids;
  if (!orderIds || orderIds.length < 2) {
    return { error: "At least 2 order IDs are required to consolidate." };
  }

  const orders = await prisma.order.findMany({
    where: {
      id: { in: orderIds },
      restaurantId: context.restaurantId,
    },
    include: {
      supplier: { select: { id: true, name: true, deliveryFee: true } },
      items: {
        include: { product: { select: { id: true, name: true, price: true, unit: true } } },
      },
    },
  });

  if (orders.length !== orderIds.length) {
    return { error: "One or more orders not found or do not belong to your restaurant." };
  }

  // Verify all are DRAFT
  const nonDrafts = orders.filter((o) => o.status !== "DRAFT");
  if (nonDrafts.length > 0) {
    return {
      error: `All orders must be DRAFT status. Orders ${nonDrafts.map((o) => o.orderNumber).join(", ")} are not drafts.`,
    };
  }

  // Verify all same supplier
  const supplierIds = new Set(orders.map((o) => o.supplierId));
  if (supplierIds.size > 1) {
    return { error: "All orders must be from the same supplier to consolidate." };
  }

  const supplier = orders[0].supplier;

  // Merge items by productId (sum quantities, use current price)
  const mergedItems: Record<string, { productId: string; name: string; quantity: number; unitPrice: number; unit: string }> = {};

  for (const order of orders) {
    for (const item of order.items) {
      const pid = item.productId;
      if (!mergedItems[pid]) {
        mergedItems[pid] = {
          productId: pid,
          name: item.product.name,
          quantity: 0,
          unitPrice: Number(item.product.price),
          unit: item.product.unit,
        };
      }
      mergedItems[pid].quantity += Number(item.quantity);
    }
  }

  const itemEntries = Object.values(mergedItems);
  let subtotal = 0;
  const orderItemsData = itemEntries.map((item) => {
    const itemSubtotal = item.unitPrice * item.quantity;
    subtotal += itemSubtotal;
    return {
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: itemSubtotal,
    };
  });

  const tax = subtotal * 0.0825;
  const deliveryFee = supplier.deliveryFee ? Number(supplier.deliveryFee) : 0;
  const total = subtotal + tax + deliveryFee;

  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();

  const consolidatedOrder = await prisma.order.create({
    data: {
      orderNumber: `ORD-${timestamp}-${random}`,
      status: "DRAFT",
      subtotal,
      tax,
      deliveryFee,
      total,
      deliveryNotes: `Consolidated from orders: ${orders.map((o) => o.orderNumber).join(", ")}`,
      restaurantId: context.restaurantId,
      supplierId: supplier.id,
      createdById: context.userId,
      items: { create: orderItemsData },
    },
    include: {
      items: { include: { product: { select: { name: true, unit: true } } } },
      supplier: { select: { name: true } },
    },
  });

  // Delete old orders (cascade deletes items)
  await prisma.order.deleteMany({
    where: { id: { in: orderIds } },
  });

  const originalDeliveryFees = deliveryFee * orders.length;
  const deliveryFeeSavings = originalDeliveryFees - deliveryFee;

  return {
    success: true,
    consolidatedOrder: {
      id: consolidatedOrder.id,
      orderNumber: consolidatedOrder.orderNumber,
      status: consolidatedOrder.status,
      supplier: consolidatedOrder.supplier.name,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      deliveryFee: Math.round(deliveryFee * 100) / 100,
      total: Math.round(total * 100) / 100,
      items: consolidatedOrder.items.map((i) => ({
        product: i.product.name,
        quantity: Number(i.quantity),
        unit: i.product.unit,
        unitPrice: Number(i.unitPrice),
        subtotal: Number(i.subtotal),
      })),
    },
    mergedOrderNumbers: orders.map((o) => o.orderNumber),
    deliveryFeeSavings: Math.round(deliveryFeeSavings * 100) / 100,
    message: `Consolidated ${orders.length} orders into ${consolidatedOrder.orderNumber}. Saved $${deliveryFeeSavings.toFixed(2)} in delivery fees. Review and submit on the Orders page.`,
  };
}

async function getSupplierPerformance(
  input: Record<string, any>,
  context: ToolContext
) {
  let supplier;

  if (input.supplier_id) {
    supplier = await prisma.supplier.findUnique({
      where: { id: input.supplier_id },
    });
  } else if (input.supplier_name) {
    supplier = await prisma.supplier.findFirst({
      where: { name: { contains: input.supplier_name, mode: "insensitive" } },
    });
  } else {
    return { error: "Please provide a supplier_name or supplier_id." };
  }

  if (!supplier) return { error: "Supplier not found." };

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const deliveredOrders = await prisma.order.findMany({
    where: {
      restaurantId: context.restaurantId,
      supplierId: supplier.id,
      status: "DELIVERED",
      deliveredAt: { gte: ninetyDaysAgo },
    },
    include: {
      invoice: { select: { total: true } },
    },
  });

  if (deliveredOrders.length < 5) {
    return {
      supplier: supplier.name,
      message: `Only ${deliveredOrders.length} delivered orders in the last 90 days. Need at least 5 for scoring.`,
    };
  }

  // On-time %: deliveredAt <= deliveryDate + 1 day grace
  let onTimeCount = 0;
  let hasDeliveryDateCount = 0;
  for (const order of deliveredOrders) {
    if (!order.deliveryDate || !order.deliveredAt) continue;
    hasDeliveryDateCount++;
    const grace = new Date(order.deliveryDate);
    grace.setDate(grace.getDate() + 1);
    if (order.deliveredAt <= grace) {
      onTimeCount++;
    }
  }
  const onTimePercent = hasDeliveryDateCount > 0
    ? Math.round((onTimeCount / hasDeliveryDateCount) * 10000) / 100
    : 100;

  // Accuracy %: |invoice.total - order.total| <= 1% of order total
  let accurateCount = 0;
  let hasInvoiceCount = 0;
  for (const order of deliveredOrders) {
    if (!order.invoice) continue;
    hasInvoiceCount++;
    const orderTotal = Number(order.total);
    const invoiceTotal = Number(order.invoice.total);
    if (Math.abs(invoiceTotal - orderTotal) <= orderTotal * 0.01) {
      accurateCount++;
    }
  }
  const accuracyPercent = hasInvoiceCount > 0
    ? Math.round((accurateCount / hasInvoiceCount) * 10000) / 100
    : 100;

  // Price stability: coefficient of variation per product
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentItems = await prisma.orderItem.findMany({
    where: {
      order: {
        restaurantId: context.restaurantId,
        supplierId: supplier.id,
        status: "DELIVERED",
        deliveredAt: { gte: thirtyDaysAgo },
      },
    },
    select: { productId: true, unitPrice: true },
  });

  const productPrices: Record<string, number[]> = {};
  for (const item of recentItems) {
    if (!productPrices[item.productId]) productPrices[item.productId] = [];
    productPrices[item.productId].push(Number(item.unitPrice));
  }

  let totalCV = 0;
  let cvCount = 0;
  for (const prices of Object.values(productPrices)) {
    if (prices.length < 2) continue;
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    if (mean === 0) continue;
    const variance = prices.reduce((sum, p) => sum + (p - mean) ** 2, 0) / prices.length;
    const cv = Math.sqrt(variance) / mean;
    totalCV += cv;
    cvCount++;
  }

  const avgCV = cvCount > 0 ? totalCV / cvCount : 0;
  const priceStabilityPercent = Math.round(Math.max(0, 1 - avgCV * 10) * 10000) / 100;

  // Composite score
  const composite = Math.round(
    (onTimePercent * 0.4 + accuracyPercent * 0.3 + priceStabilityPercent * 0.3) * 100
  ) / 100;

  const rating = composite >= 90 ? "Excellent" : composite >= 75 ? "Good" : composite >= 60 ? "Fair" : "Poor";

  return {
    supplier: supplier.name,
    supplierId: supplier.id,
    ordersAnalyzed: deliveredOrders.length,
    scores: {
      onTimeDelivery: onTimePercent,
      invoiceAccuracy: accuracyPercent,
      priceStability: priceStabilityPercent,
      composite,
    },
    rating,
    details: {
      onTimeOrders: onTimeCount,
      totalWithDeliveryDate: hasDeliveryDateCount,
      accurateInvoices: accurateCount,
      totalWithInvoice: hasInvoiceCount,
      productsTracked: cvCount,
    },
  };
}

async function getBudgetForecast(
  _input: Record<string, any>,
  context: ToolContext
) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const daysElapsed = Math.floor((now.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24));

  if (daysElapsed < 3) {
    return { message: "Not enough data yet this month. Check back after a few days." };
  }

  // MTD spend
  const mtdOrders = await prisma.order.findMany({
    where: {
      restaurantId: context.restaurantId,
      status: { notIn: ["CANCELLED", "DRAFT"] },
      createdAt: { gte: monthStart },
    },
    include: {
      items: {
        include: { product: { select: { category: true } } },
      },
    },
  });

  const mtdSpend = mtdOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const dailyRunRate = mtdSpend / daysElapsed;
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const projectedMonthEnd = dailyRunRate * daysInMonth;

  // Category breakdown for MTD
  const categoryBreakdown: Record<string, number> = {};
  for (const order of mtdOrders) {
    for (const item of order.items) {
      const cat = item.product.category;
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + Number(item.subtotal);
    }
  }

  // Historical baseline: last 3 months
  const historicalMonths: Array<{ month: string; spend: number }> = [];
  let historicalTotal = 0;

  for (let i = 1; i <= 3; i++) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);

    const monthOrders = await prisma.order.findMany({
      where: {
        restaurantId: context.restaurantId,
        status: { notIn: ["CANCELLED", "DRAFT"] },
        createdAt: { gte: start, lt: end },
      },
      select: { total: true },
    });

    const spend = monthOrders.reduce((sum, o) => sum + Number(o.total), 0);
    historicalMonths.push({
      month: start.toLocaleString("default", { month: "long", year: "numeric" }),
      spend: Math.round(spend * 100) / 100,
    });
    historicalTotal += spend;
  }

  const validMonths = historicalMonths.filter((m) => m.spend > 0);
  const avgMonthlySpend = validMonths.length > 0
    ? historicalTotal / validMonths.length
    : 0;

  const projectionPercent = avgMonthlySpend > 0
    ? Math.round((projectedMonthEnd / avgMonthlySpend) * 10000) / 100
    : null;

  let status: string;
  if (projectionPercent === null) {
    status = "no_historical_data";
  } else if (projectionPercent > 130) {
    status = "critical";
  } else if (projectionPercent > 110) {
    status = "warning";
  } else {
    status = "on_track";
  }

  // Supplier breakdown for MTD
  const supplierBreakdown: Record<string, number> = {};
  for (const order of mtdOrders) {
    const sid = order.supplierId;
    supplierBreakdown[sid] = (supplierBreakdown[sid] || 0) + Number(order.total);
  }

  // Round breakdowns
  const roundedCategoryBreakdown: Record<string, number> = {};
  for (const [k, v] of Object.entries(categoryBreakdown)) {
    roundedCategoryBreakdown[k] = Math.round(v * 100) / 100;
  }

  return {
    currentMonth: now.toLocaleString("default", { month: "long", year: "numeric" }),
    daysElapsed,
    daysInMonth,
    mtdSpend: Math.round(mtdSpend * 100) / 100,
    dailyRunRate: Math.round(dailyRunRate * 100) / 100,
    projectedMonthEnd: Math.round(projectedMonthEnd * 100) / 100,
    avgMonthlySpend: Math.round(avgMonthlySpend * 100) / 100,
    projectionPercent,
    status,
    categoryBreakdown: roundedCategoryBreakdown,
    historicalMonths,
    message:
      status === "critical"
        ? `Projected spending ($${projectedMonthEnd.toFixed(2)}) is significantly above your average ($${avgMonthlySpend.toFixed(2)}) — ${projectionPercent}% of typical monthly spend.`
        : status === "warning"
          ? `Projected spending ($${projectedMonthEnd.toFixed(2)}) is above your average ($${avgMonthlySpend.toFixed(2)}) — ${projectionPercent}% of typical monthly spend.`
          : status === "no_historical_data"
            ? `Month-to-date spend: $${mtdSpend.toFixed(2)}. No historical data to compare against yet.`
            : `On track. Projected spending ($${projectedMonthEnd.toFixed(2)}) is within normal range of your average ($${avgMonthlySpend.toFixed(2)}).`,
  };
}

async function getDisputedInvoices(
  _input: Record<string, any>,
  context: ToolContext
) {
  const invoices = await prisma.invoice.findMany({
    where: {
      restaurantId: context.restaurantId,
      status: "DISPUTED",
    },
    include: {
      order: {
        include: {
          items: {
            include: { product: { select: { name: true, price: true, unit: true } } },
          },
        },
      },
      supplier: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (invoices.length === 0) {
    return { message: "No disputed invoices found. All invoices are in good standing." };
  }

  return {
    count: invoices.length,
    invoices: invoices.map((inv) => {
      const invoiceTotal = Number(inv.total);
      let expectedTotal = null;
      let discrepancyAmount = null;
      let discrepancyPercent = null;

      if (inv.order) {
        const expectedSubtotal = inv.order.items.reduce(
          (sum, item) => sum + Number(item.quantity) * Number(item.product.price),
          0
        );
        expectedTotal = Math.round(expectedSubtotal * 1.0825 * 100) / 100;
        discrepancyAmount = Math.round((invoiceTotal - expectedTotal) * 100) / 100;
        discrepancyPercent = Math.round(
          ((invoiceTotal - expectedTotal) / expectedTotal) * 10000
        ) / 100;
      }

      return {
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        supplier: inv.supplier.name,
        invoiceTotal,
        expectedTotal,
        discrepancyAmount,
        discrepancyPercent,
        orderNumber: inv.order?.orderNumber || null,
        itemCount: inv.order?.items.length || 0,
        dueDate: inv.dueDate.toISOString().split("T")[0],
      };
    }),
  };
}

async function getSeasonalForecast(
  input: Record<string, any>,
  context: ToolContext
) {
  const where: any = {
    restaurantId: context.restaurantId,
    metadata: { not: null },
  };

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
        select: { name: true, category: true, unit: true, parLevel: true },
      },
    },
    orderBy: { lastAnalyzedAt: "desc" },
    take: 20,
  });

  // Filter to only those with seasonal data
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const seasonal = insights.filter((i) => {
    const meta = i.metadata as any;
    return meta && meta.seasonalFactors;
  });

  if (seasonal.length === 0) {
    return {
      message: "No seasonal forecast data available yet. Seasonal patterns require at least 90 days of usage data with 10+ log entries.",
    };
  }

  return {
    count: seasonal.length,
    items: seasonal.map((i) => {
      const meta = i.metadata as any;
      const currentFactor = meta.currentSeasonalFactor;
      const status = currentFactor > 1.2 ? "HIGH" : currentFactor < 0.8 ? "LOW" : "NORMAL";

      const monthlyFactors: Record<string, number> = {};
      for (let m = 0; m < 12; m++) {
        if (meta.seasonalFactors[m] !== undefined) {
          monthlyFactors[monthNames[m]] = Math.round(meta.seasonalFactors[m] * 100) / 100;
        }
      }

      return {
        itemName: i.inventoryItem.name,
        category: i.inventoryItem.category,
        unit: i.inventoryItem.unit,
        seasonalStatus: status,
        currentSeasonalFactor: Math.round(currentFactor * 100) / 100,
        baseParLevel: meta.adjustedFromBase ? Math.round(meta.adjustedFromBase * 100) / 100 : null,
        adjustedParLevel: i.suggestedParLevel ? Number(i.suggestedParLevel) : null,
        monthlyFactors,
      };
    }),
  };
}

async function findSubstitutes(
  input: Record<string, any>,
  _context: ToolContext
) {
  const where: any = {
    name: { contains: input.product_name, mode: "insensitive" },
    inStock: true,
  };

  if (input.category) {
    where.category = input.category;
  }
  if (input.exclude_supplier_id) {
    where.supplierId = { not: input.exclude_supplier_id };
  }

  const alternatives = await prisma.supplierProduct.findMany({
    where,
    include: {
      supplier: { select: { id: true, name: true, rating: true, leadTimeDays: true } },
    },
    orderBy: { price: "asc" },
    take: 10,
  });

  if (alternatives.length === 0) {
    return {
      message: `No in-stock substitutes found for "${input.product_name}". Try broadening your search or checking different categories.`,
    };
  }

  const prices = alternatives.map((p) => Number(p.price));

  return {
    query: input.product_name,
    count: alternatives.length,
    alternatives: alternatives.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: Number(p.price),
      unit: p.unit,
      supplier: p.supplier.name,
      supplierId: p.supplier.id,
      rating: p.supplier.rating ? Number(p.supplier.rating) : null,
      leadTimeDays: p.supplier.leadTimeDays,
    })),
    priceSummary: {
      lowest: Math.min(...prices),
      highest: Math.max(...prices),
      average: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
    },
  };
}

async function getPriceTrends(
  input: Record<string, any>,
  _context: ToolContext
) {
  const days = input.days || 90;
  let product;

  if (input.product_id) {
    product = await prisma.supplierProduct.findUnique({
      where: { id: input.product_id },
      include: { supplier: { select: { name: true } } },
    });
  } else if (input.product_name) {
    product = await prisma.supplierProduct.findFirst({
      where: { name: { contains: input.product_name, mode: "insensitive" } },
      include: { supplier: { select: { name: true } } },
    });
  }

  if (!product) {
    return { error: "Product not found. Check the name or ID and try again." };
  }

  const since = new Date();
  since.setDate(since.getDate() - days);

  const history = await prisma.priceHistory.findMany({
    where: {
      productId: product.id,
      recordedAt: { gte: since },
    },
    orderBy: { recordedAt: "asc" },
  });

  const currentPrice = Number(product.price);

  if (history.length === 0) {
    return {
      product: product.name,
      supplier: product.supplier.name,
      currentPrice,
      message: `No price history available for the last ${days} days. Current price: $${currentPrice.toFixed(2)}.`,
    };
  }

  const prices = history.map((h) => Number(h.price));
  const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const belowCount = sortedPrices.filter((p) => p <= currentPrice).length;
  const percentile = Math.round((belowCount / sortedPrices.length) * 10000) / 100;

  // Determine trend: compare first third vs last third
  const third = Math.max(1, Math.floor(prices.length / 3));
  const earlyAvg = prices.slice(0, third).reduce((a, b) => a + b, 0) / third;
  const lateAvg = prices.slice(-third).reduce((a, b) => a + b, 0) / third;
  const trendChange = ((lateAvg - earlyAvg) / earlyAvg) * 100;
  const trend = trendChange > 5 ? "rising" : trendChange < -5 ? "falling" : "stable";

  // Last 10 price points
  const timeline = history.slice(-10).map((h) => ({
    price: Number(h.price),
    date: h.recordedAt.toISOString().split("T")[0],
  }));

  let recommendation = "";
  if (percentile <= 10) {
    recommendation = `Current price is at the ${percentile}th percentile — this is a historic low. Consider locking in a contract or buying in bulk.`;
  } else if (percentile <= 25) {
    recommendation = `Current price is at the ${percentile}th percentile — below average. Good time to stock up.`;
  } else if (percentile >= 75) {
    recommendation = `Current price is at the ${percentile}th percentile — above average. Consider waiting for a price drop or finding alternatives.`;
  } else {
    recommendation = `Current price is at the ${percentile}th percentile — within normal range.`;
  }

  return {
    product: product.name,
    supplier: product.supplier.name,
    currentPrice,
    analysis: {
      avgPrice: Math.round(avg * 100) / 100,
      minPrice: min,
      maxPrice: max,
      percentile,
      trend,
      dataPoints: history.length,
      periodDays: days,
    },
    timeline,
    recommendation,
  };
}
