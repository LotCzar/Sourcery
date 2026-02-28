import prisma from "@/lib/prisma";
import type { PlanTier } from "@/lib/tier";

interface SupplierToolContext {
  userId: string;
  supplierId: string;
  userRole: string;
  planTier: PlanTier;
}

export async function executeSupplierTool(
  name: string,
  input: Record<string, any>,
  context: SupplierToolContext
): Promise<any> {
  try {
    switch (name) {
      case "get_supplier_orders":
        return await getSupplierOrders(input, context);
      case "get_order_details":
        return await getOrderDetails(input, context);
      case "update_order_status":
        return await updateOrderStatus(input, context);
      case "get_supplier_products":
        return await getSupplierProducts(input, context);
      case "update_product":
        return await updateProduct(input, context);
      case "get_customer_list":
        return await getCustomerList(input, context);
      case "get_customer_details":
        return await getCustomerDetails(input, context);
      case "get_supplier_invoices":
        return await getSupplierInvoices(input, context);
      case "get_revenue_summary":
        return await getRevenueSummary(input, context);
      case "get_top_products":
        return await getTopProducts(input, context);
      case "get_delivery_performance":
        return await getDeliveryPerformance(input, context);
      case "get_demand_forecast":
        return await getDemandForecast(input, context);
      case "get_pricing_suggestions":
        return await getPricingSuggestions(input, context);
      case "get_customer_health":
        return await getCustomerHealth(input, context);
      case "get_supplier_insights":
        return await getSupplierInsights(input, context);
      case "send_customer_message":
        return await sendCustomerMessage(input, context);
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (error: any) {
    console.error(`Supplier tool error [${name}]:`, error);
    return { error: `Tool execution failed: ${error.message}` };
  }
}

// ─── Helper: Date range from period string ──────────────────────────────────

function getDateRange(period?: string): { start: Date; end: Date; prevStart: Date } {
  const now = new Date();
  const end = new Date(now);
  let start: Date;
  let prevStart: Date;

  switch (period) {
    case "this_week": {
      const day = now.getDay();
      start = new Date(now);
      start.setDate(now.getDate() - day);
      start.setHours(0, 0, 0, 0);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      break;
    }
    case "last_week": {
      const day = now.getDay();
      end.setDate(now.getDate() - day);
      end.setHours(0, 0, 0, 0);
      start = new Date(end);
      start.setDate(start.getDate() - 7);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 7);
      break;
    }
    case "this_month": {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      break;
    }
    case "last_month": {
      end.setDate(0); // last day of prev month
      end.setHours(23, 59, 59, 999);
      start = new Date(end.getFullYear(), end.getMonth(), 1);
      prevStart = new Date(start.getFullYear(), start.getMonth() - 1, 1);
      break;
    }
    case "last_90_days": {
      start = new Date(now);
      start.setDate(now.getDate() - 90);
      start.setHours(0, 0, 0, 0);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 90);
      break;
    }
    case "last_30_days":
    default: {
      start = new Date(now);
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      prevStart = new Date(start);
      prevStart.setDate(prevStart.getDate() - 30);
      break;
    }
  }

  return { start, end, prevStart };
}

// ─── Tool Implementations ───────────────────────────────────────────────────

async function getSupplierOrders(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const where: any = { supplierId: context.supplierId };

  if (input.status) where.status = input.status;
  if (input.customer_name) {
    where.restaurant = { name: { contains: input.customer_name, mode: "insensitive" } };
  }
  if (input.date_from || input.date_to) {
    where.createdAt = {};
    if (input.date_from) where.createdAt.gte = new Date(input.date_from);
    if (input.date_to) where.createdAt.lte = new Date(input.date_to);
  }

  const orders = await prisma.order.findMany({
    where,
    take: input.limit || 20,
    orderBy: { createdAt: "desc" },
    include: {
      restaurant: { select: { id: true, name: true } },
      items: { include: { product: { select: { name: true } } } },
    },
  });

  return {
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      customer: o.restaurant.name,
      customerId: o.restaurant.id,
      itemCount: o.items.length,
      subtotal: Number(o.subtotal),
      total: Number(o.total),
      deliveryDate: o.deliveryDate,
      createdAt: o.createdAt,
    })),
    total: orders.length,
  };
}

async function getOrderDetails(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const where: any = { supplierId: context.supplierId };
  if (input.order_id) where.id = input.order_id;
  else if (input.order_number) where.orderNumber = input.order_number;
  else return { error: "Provide order_id or order_number" };

  const order = await prisma.order.findFirst({
    where,
    include: {
      restaurant: { select: { id: true, name: true, address: true, phone: true } },
      items: {
        include: { product: { select: { name: true, category: true, unit: true } } },
      },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { sender: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  if (!order) return { error: "Order not found" };

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    customer: {
      id: order.restaurant.id,
      name: order.restaurant.name,
      address: order.restaurant.address,
      phone: order.restaurant.phone,
    },
    items: order.items.map((i) => ({
      product: i.product.name,
      category: i.product.category,
      quantity: Number(i.quantity),
      unit: i.product.unit,
      unitPrice: Number(i.unitPrice),
      subtotal: Number(i.subtotal),
    })),
    subtotal: Number(order.subtotal),
    tax: Number(order.tax),
    deliveryFee: Number(order.deliveryFee),
    total: Number(order.total),
    deliveryDate: order.deliveryDate,
    deliveryNotes: order.deliveryNotes,
    deliveredAt: order.deliveredAt,
    shippedAt: order.shippedAt,
    recentMessages: order.messages.map((m) => ({
      sender: `${m.sender.firstName || ""} ${m.sender.lastName || ""}`.trim(),
      content: m.content,
      createdAt: m.createdAt,
    })),
    createdAt: order.createdAt,
  };
}

async function updateOrderStatus(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const order = await prisma.order.findFirst({
    where: { id: input.order_id, supplierId: context.supplierId },
  });

  if (!order) return { error: "Order not found" };

  const updateData: any = { status: input.status };

  if (input.status === "SHIPPED") updateData.shippedAt = new Date();
  if (input.status === "DELIVERED") updateData.deliveredAt = new Date();
  if (input.tracking_notes) updateData.trackingNotes = input.tracking_notes;

  const updated = await prisma.order.update({
    where: { id: input.order_id },
    data: updateData,
    select: { id: true, orderNumber: true, status: true },
  });

  return {
    success: true,
    order: updated,
    message: `Order ${updated.orderNumber} status updated to ${updated.status}`,
  };
}

async function getSupplierProducts(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const where: any = { supplierId: context.supplierId };

  if (input.category) where.category = input.category;
  if (input.in_stock_only) where.inStock = true;
  if (input.search) where.name = { contains: input.search, mode: "insensitive" };

  const products = await prisma.supplierProduct.findMany({
    where,
    take: input.limit || 50,
    orderBy: { name: "asc" },
  });

  return {
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      price: Number(p.price),
      unit: p.unit,
      inStock: p.inStock,
      stockQuantity: p.stockQuantity,
    })),
    total: products.length,
  };
}

async function updateProduct(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const product = await prisma.supplierProduct.findFirst({
    where: { id: input.product_id, supplierId: context.supplierId },
  });

  if (!product) return { error: "Product not found" };

  const updateData: any = {};
  if (input.price !== undefined) updateData.price = input.price;
  if (input.in_stock !== undefined) updateData.inStock = input.in_stock;
  if (input.description !== undefined) updateData.description = input.description;

  // Record price history if price changed
  if (input.price !== undefined && Number(product.price) !== input.price) {
    await prisma.priceHistory.create({
      data: { productId: product.id, price: input.price },
    });
  }

  const updated = await prisma.supplierProduct.update({
    where: { id: input.product_id },
    data: updateData,
    select: { id: true, name: true, price: true, inStock: true },
  });

  return {
    success: true,
    product: { ...updated, price: Number(updated.price) },
    message: `Product ${updated.name} updated successfully`,
  };
}

async function getCustomerList(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const relationships = await prisma.restaurantSupplier.findMany({
    where: { supplierId: context.supplierId },
    include: {
      restaurant: {
        select: {
          id: true,
          name: true,
          city: true,
          state: true,
          orders: {
            where: { supplierId: context.supplierId, status: { not: "CANCELLED" } },
            select: { total: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          },
        },
      },
    },
  });

  const customers = relationships.map((r) => {
    const orders = r.restaurant.orders;
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    return {
      id: r.restaurant.id,
      name: r.restaurant.name,
      city: r.restaurant.city,
      state: r.restaurant.state,
      isPreferred: r.isPreferred,
      totalOrders: orders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      lastOrderDate: orders[0]?.createdAt || null,
    };
  });

  // Sort
  const sortBy = input.sort_by || "revenue";
  if (sortBy === "revenue") customers.sort((a, b) => b.totalRevenue - a.totalRevenue);
  else if (sortBy === "orders") customers.sort((a, b) => b.totalOrders - a.totalOrders);
  else if (sortBy === "recent") customers.sort((a, b) => {
    if (!a.lastOrderDate) return 1;
    if (!b.lastOrderDate) return -1;
    return new Date(b.lastOrderDate).getTime() - new Date(a.lastOrderDate).getTime();
  });

  if (input.search) {
    const searchLower = input.search.toLowerCase();
    return {
      customers: customers.filter((c) => c.name.toLowerCase().includes(searchLower)),
    };
  }

  return { customers };
}

async function getCustomerDetails(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  let restaurantId = input.restaurant_id;

  if (!restaurantId && input.restaurant_name) {
    const rel = await prisma.restaurantSupplier.findFirst({
      where: {
        supplierId: context.supplierId,
        restaurant: { name: { contains: input.restaurant_name, mode: "insensitive" } },
      },
      include: { restaurant: { select: { id: true } } },
    });
    restaurantId = rel?.restaurant.id;
  }

  if (!restaurantId) return { error: "Customer not found" };

  const restaurant = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      state: true,
      phone: true,
      email: true,
    },
  });

  if (!restaurant) return { error: "Customer not found" };

  const orders = await prisma.order.findMany({
    where: {
      supplierId: context.supplierId,
      restaurantId,
      status: { not: "CANCELLED" },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      orderNumber: true,
      status: true,
      total: true,
      createdAt: true,
    },
  });

  const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  // Top ordered products
  const topProducts = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      order: {
        supplierId: context.supplierId,
        restaurantId,
        status: { not: "CANCELLED" },
      },
    },
    _sum: { subtotal: true, quantity: true },
    orderBy: { _sum: { subtotal: "desc" } },
    take: 5,
  });

  const productIds = topProducts.map((p) => p.productId);
  const products = await prisma.supplierProduct.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p.name]));

  return {
    customer: restaurant,
    stats: {
      totalOrders: orders.length,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
    },
    recentOrders: orders.slice(0, 10).map((o) => ({
      ...o,
      total: Number(o.total),
    })),
    topProducts: topProducts.map((p) => ({
      name: productMap.get(p.productId) || "Unknown",
      totalRevenue: Number(p._sum.subtotal) || 0,
      totalQuantity: Number(p._sum.quantity) || 0,
    })),
  };
}

async function getSupplierInvoices(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const where: any = { supplierId: context.supplierId };

  if (input.status) where.status = input.status;
  if (input.customer_name) {
    where.restaurant = { name: { contains: input.customer_name, mode: "insensitive" } };
  }
  if (input.date_from || input.date_to) {
    where.issueDate = {};
    if (input.date_from) where.issueDate.gte = new Date(input.date_from);
    if (input.date_to) where.issueDate.lte = new Date(input.date_to);
  }

  const invoices = await prisma.invoice.findMany({
    where,
    take: input.limit || 20,
    orderBy: { issueDate: "desc" },
    include: {
      restaurant: { select: { name: true } },
    },
  });

  return {
    invoices: invoices.map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      customer: inv.restaurant.name,
      status: inv.status,
      total: Number(inv.total),
      issueDate: inv.issueDate,
      dueDate: inv.dueDate,
      paidAt: inv.paidAt,
      paidAmount: inv.paidAmount ? Number(inv.paidAmount) : null,
    })),
    total: invoices.length,
  };
}

async function getRevenueSummary(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const { start, end, prevStart } = getDateRange(input.period);

  const [currentOrders, previousOrders] = await Promise.all([
    prisma.order.findMany({
      where: {
        supplierId: context.supplierId,
        createdAt: { gte: start, lte: end },
        status: { not: "CANCELLED" },
      },
      select: { total: true },
    }),
    prisma.order.findMany({
      where: {
        supplierId: context.supplierId,
        createdAt: { gte: prevStart, lt: start },
        status: { not: "CANCELLED" },
      },
      select: { total: true },
    }),
  ]);

  const currentRevenue = currentOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const previousRevenue = previousOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const changePercent = previousRevenue > 0
    ? ((currentRevenue - previousRevenue) / previousRevenue) * 100
    : null;

  // Revenue by customer
  const ordersByCustomer = await prisma.order.groupBy({
    by: ["restaurantId"],
    where: {
      supplierId: context.supplierId,
      createdAt: { gte: start, lte: end },
      status: { not: "CANCELLED" },
    },
    _sum: { total: true },
    _count: true,
    orderBy: { _sum: { total: "desc" } },
    take: 10,
  });

  const restaurantIds = ordersByCustomer.map((g) => g.restaurantId);
  const restaurants = await prisma.restaurant.findMany({
    where: { id: { in: restaurantIds } },
    select: { id: true, name: true },
  });
  const nameMap = new Map(restaurants.map((r) => [r.id, r.name]));

  return {
    period: input.period || "last_30_days",
    currentRevenue: Math.round(currentRevenue * 100) / 100,
    previousRevenue: Math.round(previousRevenue * 100) / 100,
    changePercent: changePercent !== null ? Math.round(changePercent * 10) / 10 : null,
    orderCount: currentOrders.length,
    previousOrderCount: previousOrders.length,
    topCustomers: ordersByCustomer.map((g) => ({
      name: nameMap.get(g.restaurantId) || "Unknown",
      revenue: Number(g._sum.total) || 0,
      orderCount: g._count,
    })),
  };
}

async function getTopProducts(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const { start, end } = getDateRange(input.period || "last_30_days");

  const grouped = await prisma.orderItem.groupBy({
    by: ["productId"],
    where: {
      order: {
        supplierId: context.supplierId,
        createdAt: { gte: start, lte: end },
        status: { not: "CANCELLED" },
      },
    },
    _sum: { subtotal: true, quantity: true },
    orderBy: input.sort_by === "quantity"
      ? { _sum: { quantity: "desc" } }
      : { _sum: { subtotal: "desc" } },
    take: input.limit || 10,
  });

  const productIds = grouped.map((g) => g.productId);
  const products = await prisma.supplierProduct.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, category: true, price: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  return {
    products: grouped.map((g) => {
      const product = productMap.get(g.productId);
      return {
        id: g.productId,
        name: product?.name || "Unknown",
        category: product?.category,
        currentPrice: product ? Number(product.price) : null,
        totalRevenue: Number(g._sum.subtotal) || 0,
        totalQuantity: Number(g._sum.quantity) || 0,
      };
    }),
  };
}

async function getDeliveryPerformance(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const { start, end } = getDateRange(input.period || "last_30_days");

  const deliveredOrders = await prisma.order.findMany({
    where: {
      supplierId: context.supplierId,
      status: "DELIVERED",
      deliveredAt: { gte: start, lte: end },
    },
    select: {
      deliveryDate: true,
      deliveredAt: true,
      shippedAt: true,
      createdAt: true,
    },
  });

  let onTimeCount = 0;
  let totalDeliveryTimeHours = 0;
  let deliveriesWithTime = 0;

  for (const order of deliveredOrders) {
    if (order.deliveryDate && order.deliveredAt) {
      const deadline = new Date(order.deliveryDate);
      deadline.setHours(23, 59, 59, 999);
      if (order.deliveredAt <= deadline) onTimeCount++;
    }
    if (order.shippedAt && order.deliveredAt) {
      const hours =
        (order.deliveredAt.getTime() - order.shippedAt.getTime()) / (1000 * 60 * 60);
      totalDeliveryTimeHours += hours;
      deliveriesWithTime++;
    }
  }

  const totalDelivered = deliveredOrders.length;
  const cancelledCount = await prisma.order.count({
    where: {
      supplierId: context.supplierId,
      status: "CANCELLED",
      createdAt: { gte: start, lte: end },
    },
  });

  return {
    totalDelivered,
    onTimeRate: totalDelivered > 0
      ? Math.round((onTimeCount / totalDelivered) * 100 * 10) / 10
      : null,
    avgDeliveryTimeHours: deliveriesWithTime > 0
      ? Math.round((totalDeliveryTimeHours / deliveriesWithTime) * 10) / 10
      : null,
    cancelledOrders: cancelledCount,
  };
}

async function getDemandForecast(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const insights = await prisma.supplierInsight.findMany({
    where: {
      supplierId: context.supplierId,
      type: "DEMAND_FORECAST",
      status: "ACTIVE",
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (insights.length === 0) {
    return {
      message: "No demand forecast insights available yet. Forecasts are generated weekly based on your order history.",
      insights: [],
    };
  }

  return {
    insights: insights.map((i) => ({
      id: i.id,
      title: i.title,
      summary: i.summary,
      data: i.data,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
    })),
  };
}

async function getPricingSuggestions(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const insights = await prisma.supplierInsight.findMany({
    where: {
      supplierId: context.supplierId,
      type: "PRICING_SUGGESTION",
      status: "ACTIVE",
    },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  if (insights.length === 0) {
    return {
      message: "No pricing suggestions available yet. Suggestions are generated weekly based on your sales data.",
      insights: [],
    };
  }

  return {
    insights: insights.map((i) => ({
      id: i.id,
      title: i.title,
      summary: i.summary,
      data: i.data,
      createdAt: i.createdAt,
    })),
  };
}

async function getCustomerHealth(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const insights = await prisma.supplierInsight.findMany({
    where: {
      supplierId: context.supplierId,
      type: "CUSTOMER_HEALTH",
      status: "ACTIVE",
    },
    orderBy: { createdAt: "desc" },
    take: 1,
  });

  if (insights.length === 0) {
    return {
      message: "No customer health scores available yet. Scores are calculated weekly based on order patterns.",
      customers: [],
    };
  }

  const data = insights[0].data as any;
  let customers = data?.customers || [];

  if (input.risk_level) {
    const thresholds: Record<string, [number, number]> = {
      high: [0, 40],
      medium: [40, 70],
      low: [70, 101],
    };
    const [min, max] = thresholds[input.risk_level] || [0, 101];
    customers = customers.filter((c: any) => c.score >= min && c.score < max);
  }

  return {
    summary: insights[0].summary,
    customers,
    generatedAt: insights[0].createdAt,
  };
}

async function getSupplierInsights(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const where: any = { supplierId: context.supplierId };
  if (input.type) where.type = input.type;
  where.status = input.status || "ACTIVE";

  const insights = await prisma.supplierInsight.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: input.limit || 10,
  });

  return {
    insights: insights.map((i) => ({
      id: i.id,
      type: i.type,
      title: i.title,
      summary: i.summary,
      status: i.status,
      createdAt: i.createdAt,
      expiresAt: i.expiresAt,
    })),
    total: insights.length,
  };
}

async function sendCustomerMessage(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const order = await prisma.order.findFirst({
    where: { id: input.order_id, supplierId: context.supplierId },
    select: { id: true, orderNumber: true, restaurantId: true },
  });

  if (!order) return { error: "Order not found" };

  const message = await prisma.orderMessage.create({
    data: {
      content: input.message,
      orderId: order.id,
      senderId: context.userId,
      isInternal: false,
    },
  });

  return {
    success: true,
    messageId: message.id,
    message: `Message sent on order ${order.orderNumber}`,
  };
}
