import prisma from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";
import { getSupplierToolTier, hasTier, type PlanTier } from "@/lib/tier";

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
  const requiredTier = getSupplierToolTier(name);
  if (!hasTier(context.planTier, requiredTier)) {
    return {
      error: "upgrade_required",
      message: `The ${name} tool requires a ${requiredTier} plan. You are currently on the ${context.planTier} plan. Please upgrade at Settings to access this feature.`,
      requiredTier,
      currentTier: context.planTier,
    };
  }

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
      case "get_return_summary":
        return await getReturnSummary(input, context);
      case "adjust_supplier_inventory":
        return await adjustSupplierInventory(input, context);
      case "create_promotion":
        return await createPromotion(input, context);
      case "get_invoice_overview":
        return await getInvoiceOverview(input, context);
      case "get_driver_schedule":
        return await getDriverSchedule(input, context);
      case "manage_return":
        return await manageReturn(input, context);
      case "bulk_update_orders":
        return await bulkUpdateOrders(input, context);
      case "assign_driver":
        return await assignDriver(input, context);
      case "generate_pick_list":
        return await generatePickList(input, context);
      case "create_product":
        return await createProduct(input, context);
      case "bulk_update_prices":
        return await bulkUpdatePrices(input, context);
      case "get_low_stock":
        return await getLowStock(input, context);
      case "manage_promotion":
        return await managePromotion(input, context);
      case "get_promotions":
        return await getPromotions(input, context);
      case "generate_invoice":
        return await generateInvoice(input, context);
      case "record_payment":
        return await recordPayment(input, context);
      case "handle_dispute":
        return await handleDispute(input, context);
      case "broadcast_message":
        return await broadcastMessage(input, context);
      case "update_delivery_eta":
        return await updateDeliveryEta(input, context);
      case "get_drivers":
        return await getDrivers(input, context);
      case "create_driver":
        return await createDriver(input, context);
      case "update_driver":
        return await updateDriver(input, context);
      case "get_delivery_zones":
        return await getDeliveryZones(input, context);
      case "create_delivery_zone":
        return await createDeliveryZone(input, context);
      case "update_delivery_zone":
        return await updateDeliveryZone(input, context);
      case "get_order_messages":
        return await getOrderMessages(input, context);
      case "get_supplier_team":
        return await getSupplierTeam(input, context);
      case "manage_supplier_team":
        return await manageSupplierTeam(input, context);
      case "update_supplier_settings":
        return await updateSupplierSettings(input, context);
      case "get_return_details":
        return await getReturnDetails(input, context);
      case "schedule_delivery":
        return await scheduleDelivery(input, context);
      case "export_supplier_data":
        return await exportSupplierData(input, context);
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
  const where: any = { supplierId: context.supplierId, isActive: true };

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
    where: { id: input.product_id, supplierId: context.supplierId, isActive: true },
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
    where: { id: { in: productIds }, isActive: true },
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
    where: { id: { in: productIds }, isActive: true },
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

// ─── New Tool Implementations ────────────────────────────────────────────────

async function getReturnSummary(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const { start, end } = getDateRange(input.period || "last_30_days");

  const where: any = {
    order: { supplierId: context.supplierId },
    createdAt: { gte: start, lte: end },
  };

  const returns = await prisma.returnRequest.findMany({
    where,
    include: {
      order: {
        select: {
          orderNumber: true,
          restaurant: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Filter by product name if provided
  let filteredReturns = returns;
  if (input.product_name) {
    const searchLower = input.product_name.toLowerCase();
    filteredReturns = returns.filter((r) => {
      const items = (r.items as any[]) || [];
      return items.some((i: any) =>
        (i.productName || "").toLowerCase().includes(searchLower)
      );
    });
  }

  // Aggregate by product
  const productStats: Record<string, { name: string; count: number; credited: number }> = {};
  const typeBreakdown: Record<string, number> = {};

  let totalCredited = 0;

  for (const ret of filteredReturns) {
    typeBreakdown[ret.type] = (typeBreakdown[ret.type] || 0) + 1;
    if (ret.creditAmount) totalCredited += Number(ret.creditAmount);

    const items = (ret.items as any[]) || [];
    for (const item of items) {
      const pid = item.productId || item.productName || "unknown";
      if (!productStats[pid]) {
        productStats[pid] = { name: item.productName || "Unknown", count: 0, credited: 0 };
      }
      productStats[pid].count++;
      if (ret.creditAmount) {
        productStats[pid].credited += Number(ret.creditAmount) / items.length;
      }
    }
  }

  // Get total units sold for return rate calculation
  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        supplierId: context.supplierId,
        status: { not: "CANCELLED" },
        createdAt: { gte: start, lte: end },
      },
    },
    select: { productId: true, quantity: true },
  });

  const totalSold: Record<string, number> = {};
  for (const item of orderItems) {
    totalSold[item.productId] = (totalSold[item.productId] || 0) + Number(item.quantity);
  }

  const productBreakdown = Object.entries(productStats)
    .map(([pid, stats]) => ({
      productId: pid,
      name: stats.name,
      returnCount: stats.count,
      unitsSold: totalSold[pid] || 0,
      returnRate: totalSold[pid] ? Math.round((stats.count / totalSold[pid]) * 100 * 10) / 10 : null,
      totalCredited: Math.round(stats.credited * 100) / 100,
    }))
    .sort((a, b) => b.returnCount - a.returnCount);

  return {
    period: input.period || "last_30_days",
    totalReturns: filteredReturns.length,
    totalCredited: Math.round(totalCredited * 100) / 100,
    byStatus: {
      pending: filteredReturns.filter((r) => r.status === "PENDING").length,
      approved: filteredReturns.filter((r) => r.status === "APPROVED").length,
      rejected: filteredReturns.filter((r) => r.status === "REJECTED").length,
      creditIssued: filteredReturns.filter((r) => r.status === "CREDIT_ISSUED").length,
      resolved: filteredReturns.filter((r) => r.status === "RESOLVED").length,
    },
    byType: typeBreakdown,
    productBreakdown: productBreakdown.slice(0, 10),
    recentReturns: filteredReturns.slice(0, 5).map((r) => ({
      id: r.id,
      returnNumber: r.returnNumber,
      type: r.type,
      status: r.status,
      reason: r.reason,
      customer: r.order.restaurant.name,
      orderNumber: r.order.orderNumber,
      creditAmount: r.creditAmount ? Number(r.creditAmount) : null,
      hasPhotos: ((r.photoUrls as any[]) || []).length > 0,
      createdAt: r.createdAt,
    })),
  };
}

async function adjustSupplierInventory(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const product = await prisma.supplierProduct.findFirst({
    where: { id: input.product_id, supplierId: context.supplierId, isActive: true },
  });

  if (!product) return { error: "Product not found" };

  const updateData: any = {};
  if (input.stock_quantity !== undefined) updateData.stockQuantity = input.stock_quantity;
  if (input.reorder_point !== undefined) updateData.reorderPoint = input.reorder_point;
  if (input.expiration_date !== undefined) updateData.expirationDate = new Date(input.expiration_date);

  if (Object.keys(updateData).length === 0) {
    return { error: "No fields to update. Provide stock_quantity, reorder_point, or expiration_date." };
  }

  const updated = await prisma.supplierProduct.update({
    where: { id: input.product_id },
    data: updateData,
    select: {
      id: true,
      name: true,
      stockQuantity: true,
      reorderPoint: true,
      expirationDate: true,
      inStock: true,
    },
  });

  return {
    success: true,
    product: updated,
    message: `Inventory updated for ${updated.name}`,
  };
}

async function createPromotion(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const productConnect = input.product_ids?.length > 0
    ? { connect: input.product_ids.map((id: string) => ({ id })) }
    : undefined;

  // Verify products belong to this supplier
  if (input.product_ids?.length > 0) {
    const products = await prisma.supplierProduct.findMany({
      where: { id: { in: input.product_ids }, supplierId: context.supplierId, isActive: true },
      select: { id: true },
    });
    if (products.length !== input.product_ids.length) {
      return { error: "One or more product IDs not found or don't belong to your supplier" };
    }
  }

  const promotion = await prisma.promotion.create({
    data: {
      type: input.type,
      value: input.value,
      description: input.description || null,
      minOrderAmount: input.min_order_amount || null,
      startDate: new Date(input.start_date),
      endDate: new Date(input.end_date),
      isActive: false, // Draft
      supplierId: context.supplierId,
      products: productConnect,
    },
    include: {
      products: { select: { id: true, name: true } },
    },
  });

  return {
    success: true,
    promotion: {
      id: promotion.id,
      type: promotion.type,
      value: Number(promotion.value),
      description: promotion.description,
      minOrderAmount: promotion.minOrderAmount ? Number(promotion.minOrderAmount) : null,
      startDate: promotion.startDate,
      endDate: promotion.endDate,
      isActive: promotion.isActive,
      products: promotion.products,
    },
    message: `Draft promotion created: ${promotion.type} ${Number(promotion.value)}${promotion.type === "PERCENTAGE_OFF" ? "%" : ""} off`,
  };
}

async function getInvoiceOverview(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const { start, end } = getDateRange(input.period);

  // Get all invoices in period
  const invoices = await prisma.invoice.findMany({
    where: {
      supplierId: context.supplierId,
      ...(input.period ? { issueDate: { gte: start, lte: end } } : {}),
    },
    include: {
      restaurant: { select: { id: true, name: true } },
    },
  });

  const outstanding = invoices.filter((i) =>
    ["PENDING", "OVERDUE", "PARTIALLY_PAID"].includes(i.status)
  );
  const overdue = invoices.filter((i) => i.status === "OVERDUE");
  const paid = invoices.filter((i) => i.status === "PAID");

  const totalOutstanding = outstanding.reduce(
    (sum, i) => sum + Number(i.total) - (i.paidAmount ? Number(i.paidAmount) : 0),
    0
  );
  const totalOverdue = overdue.reduce(
    (sum, i) => sum + Number(i.total) - (i.paidAmount ? Number(i.paidAmount) : 0),
    0
  );

  // Top 5 debtors by overdue amount
  const debtorMap: Record<string, { name: string; amount: number; count: number }> = {};
  for (const inv of outstanding) {
    const rid = inv.restaurantId;
    if (!debtorMap[rid]) {
      debtorMap[rid] = { name: inv.restaurant.name, amount: 0, count: 0 };
    }
    debtorMap[rid].amount += Number(inv.total) - (inv.paidAmount ? Number(inv.paidAmount) : 0);
    debtorMap[rid].count++;
  }
  const topDebtors = Object.values(debtorMap)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5)
    .map((d) => ({
      name: d.name,
      outstandingAmount: Math.round(d.amount * 100) / 100,
      invoiceCount: d.count,
    }));

  // Average days-to-pay for paid invoices
  let totalDaysToPay = 0;
  let paidWithDates = 0;
  for (const inv of paid) {
    if (inv.paidAt) {
      const days = (inv.paidAt.getTime() - inv.issueDate.getTime()) / (24 * 60 * 60 * 1000);
      totalDaysToPay += days;
      paidWithDates++;
    }
  }

  return {
    summary: {
      totalInvoices: invoices.length,
      outstandingCount: outstanding.length,
      outstandingAmount: Math.round(totalOutstanding * 100) / 100,
      overdueCount: overdue.length,
      overdueAmount: Math.round(totalOverdue * 100) / 100,
      paidCount: paid.length,
      avgDaysToPay: paidWithDates > 0 ? Math.round(totalDaysToPay / paidWithDates) : null,
    },
    byStatus: {
      pending: invoices.filter((i) => i.status === "PENDING").length,
      paid: paid.length,
      overdue: overdue.length,
      partiallyPaid: invoices.filter((i) => i.status === "PARTIALLY_PAID").length,
      cancelled: invoices.filter((i) => i.status === "CANCELLED").length,
      disputed: invoices.filter((i) => i.status === "DISPUTED").length,
    },
    topDebtors,
  };
}

async function getDriverSchedule(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const targetDate = input.date ? new Date(input.date) : new Date();
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: {
      supplierId: context.supplierId,
      deliveryDate: { gte: dayStart, lte: dayEnd },
      status: { not: "CANCELLED" },
    },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      deliveryDate: true,
      driverId: true,
      restaurant: { select: { name: true, address: true, city: true } },
      items: { select: { id: true } },
    },
    orderBy: { deliveryDate: "asc" },
  });

  // Group by driver
  const driverGroups: Record<string, typeof orders> = {};
  for (const order of orders) {
    const driverId = order.driverId || "unassigned";
    if (!driverGroups[driverId]) driverGroups[driverId] = [];
    driverGroups[driverId].push(order);
  }

  // Resolve driver names
  const driverIds = Object.keys(driverGroups).filter((id) => id !== "unassigned");
  const drivers = driverIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: driverIds } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];
  const driverNameMap = new Map(
    drivers.map((d) => [d.id, `${d.firstName || ""} ${d.lastName || ""}`.trim()])
  );

  const schedule = Object.entries(driverGroups).map(([driverId, driverOrders]) => ({
    driverId,
    driverName: driverId === "unassigned" ? "Unassigned" : (driverNameMap.get(driverId) || "Unknown"),
    deliveryCount: driverOrders.length,
    orders: driverOrders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      customer: o.restaurant.name,
      address: o.restaurant.address,
      city: o.restaurant.city,
      itemCount: o.items.length,
    })),
  }));

  return {
    date: dayStart.toISOString().split("T")[0],
    totalDeliveries: orders.length,
    assignedDrivers: schedule.filter((s) => s.driverId !== "unassigned").length,
    unassignedOrders: driverGroups["unassigned"]?.length || 0,
    schedule,
  };
}

async function manageReturn(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  // Find return and verify it belongs to this supplier
  const returnRequest = await prisma.returnRequest.findFirst({
    where: {
      id: input.return_id,
      order: { supplierId: context.supplierId },
    },
    include: {
      order: { select: { id: true, orderNumber: true, supplierId: true, restaurantId: true } },
    },
  });

  if (!returnRequest) return { error: "Return request not found" };
  if (returnRequest.status !== "PENDING") {
    return { error: `Return is already ${returnRequest.status.toLowerCase()}, cannot update` };
  }

  const updateData: any = {
    status: input.action,
    resolution: input.resolution || null,
    reviewedById: context.userId,
    reviewedAt: new Date(),
    resolvedAt: new Date(),
  };

  if (input.action === "APPROVED" && input.credit_amount) {
    updateData.status = "CREDIT_ISSUED";
    updateData.creditAmount = input.credit_amount;
  }

  const updated = await prisma.returnRequest.update({
    where: { id: input.return_id },
    data: updateData,
    select: {
      id: true,
      returnNumber: true,
      status: true,
      creditAmount: true,
      resolution: true,
    },
  });

  // Emit return status changed event
  const { inngest } = await import("@/lib/inngest/client");
  await inngest.send({
    name: "return/status.changed",
    data: {
      returnId: returnRequest.id,
      orderId: returnRequest.order.id,
      previousStatus: returnRequest.status,
      newStatus: updated.status,
      restaurantId: returnRequest.order.restaurantId,
      supplierId: returnRequest.order.supplierId,
    },
  });

  return {
    success: true,
    return: {
      ...updated,
      creditAmount: updated.creditAmount ? Number(updated.creditAmount) : null,
    },
    message: `Return ${updated.returnNumber} ${input.action === "APPROVED" ? (input.credit_amount ? `approved with $${input.credit_amount} credit` : "approved") : "rejected"}`,
  };
}

// ─── Group 1: Order Workflow ─────────────────────────────────────────────────

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["IN_TRANSIT", "DELIVERED"],
  IN_TRANSIT: ["DELIVERED"],
};

async function bulkUpdateOrders(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const orders = await prisma.order.findMany({
    where: { id: { in: input.order_ids }, supplierId: context.supplierId },
    select: { id: true, orderNumber: true, status: true },
  });

  const foundIds = new Set(orders.map((o) => o.id));
  const updated: string[] = [];
  const failed: { id: string; reason: string }[] = [];

  // Flag missing orders
  for (const id of input.order_ids) {
    if (!foundIds.has(id)) {
      failed.push({ id, reason: "Order not found" });
    }
  }

  for (const order of orders) {
    const allowed = VALID_STATUS_TRANSITIONS[order.status] || [];
    if (!allowed.includes(input.status)) {
      failed.push({
        id: order.id,
        reason: `Cannot transition from ${order.status} to ${input.status}`,
      });
      continue;
    }

    try {
      const updateData: any = { status: input.status };
      if (input.status === "SHIPPED") {
        updateData.shippedAt = new Date();
        if (input.driver_id) updateData.driverId = input.driver_id;
      }
      if (input.tracking_notes) updateData.trackingNotes = input.tracking_notes;

      await prisma.order.update({
        where: { id: order.id },
        data: updateData,
      });

      updated.push(order.orderNumber);

      // Emit status change event
      try {
        const { inngest } = await import("@/lib/inngest/client");
        await inngest.send({
          name: "order/status.changed",
          data: {
            orderId: order.id,
            previousStatus: order.status,
            newStatus: input.status,
          },
        });
      } catch {
        // Non-critical — don't fail the update
      }
    } catch {
      failed.push({ id: order.id, reason: "Update failed" });
    }
  }

  return {
    success: true,
    updated: updated.length,
    updatedOrders: updated,
    failed,
    message: `${updated.length} order(s) updated to ${input.status}${failed.length > 0 ? `, ${failed.length} failed` : ""}`,
  };
}

async function assignDriver(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const order = await prisma.order.findFirst({
    where: { id: input.order_id, supplierId: context.supplierId },
    select: { id: true, orderNumber: true, status: true },
  });

  if (!order) return { error: "Order not found" };

  // Verify driver belongs to this supplier
  const driver = await prisma.user.findFirst({
    where: { id: input.driver_id, supplierId: context.supplierId },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!driver) return { error: "Driver not found or does not belong to your supplier" };

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { driverId: driver.id },
    select: { id: true, orderNumber: true, status: true, driverId: true },
  });

  return {
    success: true,
    order: updated,
    driverName: `${driver.firstName || ""} ${driver.lastName || ""}`.trim(),
    message: `Driver ${driver.firstName || ""} ${driver.lastName || ""} assigned to order ${order.orderNumber}`.trim(),
  };
}

async function generatePickList(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const targetDate = input.date ? new Date(input.date) : new Date();
  if (!input.date) targetDate.setDate(targetDate.getDate() + 1); // default to tomorrow
  const dayStart = new Date(targetDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(targetDate);
  dayEnd.setHours(23, 59, 59, 999);

  const orders = await prisma.order.findMany({
    where: {
      supplierId: context.supplierId,
      deliveryDate: { gte: dayStart, lte: dayEnd },
      status: { in: ["CONFIRMED", "PROCESSING"] },
    },
    include: {
      restaurant: { select: { name: true } },
      items: {
        include: {
          product: { select: { id: true, name: true, category: true, unit: true } },
        },
      },
    },
  });

  // Aggregate items by product
  const productAgg: Record<string, {
    product: string;
    category: string;
    unit: string;
    totalQuantity: number;
    orders: { orderNumber: string; customer: string; quantity: number }[];
  }> = {};

  for (const order of orders) {
    for (const item of order.items) {
      const pid = item.productId;
      if (!productAgg[pid]) {
        productAgg[pid] = {
          product: item.product.name,
          category: item.product.category,
          unit: item.product.unit,
          totalQuantity: 0,
          orders: [],
        };
      }
      const qty = Number(item.quantity);
      productAgg[pid].totalQuantity += qty;
      productAgg[pid].orders.push({
        orderNumber: order.orderNumber,
        customer: order.restaurant.name,
        quantity: qty,
      });
    }
  }

  const pickList = Object.values(productAgg)
    .sort((a, b) => a.category.localeCompare(b.category) || a.product.localeCompare(b.product))
    .map((item) => ({
      ...item,
      totalQuantity: Math.round(item.totalQuantity * 100) / 100,
      orderCount: item.orders.length,
    }));

  return {
    date: dayStart.toISOString().split("T")[0],
    totalOrders: orders.length,
    totalProducts: pickList.length,
    pickList,
  };
}

// ─── Group 2: Product & Catalog ──────────────────────────────────────────────

async function createProduct(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const product = await prisma.supplierProduct.create({
    data: {
      name: input.name,
      category: input.category,
      price: input.price,
      unit: input.unit,
      description: input.description || null,
      sku: input.sku || null,
      brand: input.brand || null,
      stockQuantity: input.stock_quantity ?? null,
      reorderPoint: input.reorder_point ?? null,
      supplierId: context.supplierId,
    },
  });

  return {
    success: true,
    product: {
      id: product.id,
      name: product.name,
      category: product.category,
      price: Number(product.price),
      unit: product.unit,
      sku: product.sku,
      brand: product.brand,
      inStock: product.inStock,
      stockQuantity: product.stockQuantity,
    },
    message: `Product "${product.name}" added to your catalog`,
  };
}

async function bulkUpdatePrices(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const results: { updated: number; failed: number; changes: { name: string; oldPrice: number; newPrice: number }[] } = {
    updated: 0,
    failed: 0,
    changes: [],
  };

  if (input.updates && Array.isArray(input.updates)) {
    // Mode A: explicit product_id + price pairs
    const productIds = input.updates.map((u: any) => u.product_id);
    const products = await prisma.supplierProduct.findMany({
      where: { id: { in: productIds }, supplierId: context.supplierId, isActive: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const update of input.updates) {
      const product = productMap.get(update.product_id);
      if (!product) {
        results.failed++;
        continue;
      }

      try {
        const oldPrice = Number(product.price);
        await prisma.supplierProduct.update({
          where: { id: product.id },
          data: { price: update.price },
        });
        await prisma.priceHistory.create({
          data: { productId: product.id, price: update.price },
        });
        results.updated++;
        results.changes.push({ name: product.name, oldPrice, newPrice: update.price });
      } catch {
        results.failed++;
      }
    }
  } else if (input.category && input.percentage !== undefined) {
    // Mode B: category + percentage
    const products = await prisma.supplierProduct.findMany({
      where: { supplierId: context.supplierId, category: input.category, isActive: true },
    });

    for (const product of products) {
      try {
        const oldPrice = Number(product.price);
        const newPrice = Math.round(oldPrice * (1 + input.percentage / 100) * 100) / 100;
        await prisma.supplierProduct.update({
          where: { id: product.id },
          data: { price: newPrice },
        });
        await prisma.priceHistory.create({
          data: { productId: product.id, price: newPrice },
        });
        results.updated++;
        results.changes.push({ name: product.name, oldPrice, newPrice });
      } catch {
        results.failed++;
      }
    }
  } else {
    return { error: "Provide either an updates array or category+percentage" };
  }

  return {
    success: true,
    ...results,
    message: `${results.updated} product price(s) updated${results.failed > 0 ? `, ${results.failed} failed` : ""}`,
  };
}

async function getLowStock(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const where: any = {
    supplierId: context.supplierId,
    isActive: true,
    stockQuantity: { not: null },
    reorderPoint: { not: null },
  };
  if (input.category) where.category = input.category;

  const products = await prisma.supplierProduct.findMany({
    where,
    orderBy: { name: "asc" },
  });

  const lowStock = products
    .filter((p) => p.stockQuantity !== null && p.reorderPoint !== null && p.stockQuantity <= p.reorderPoint)
    .map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      currentStock: p.stockQuantity!,
      reorderPoint: p.reorderPoint!,
      deficit: p.reorderPoint! - p.stockQuantity!,
      price: Number(p.price),
      unit: p.unit,
    }));

  return {
    totalLowStock: lowStock.length,
    products: lowStock,
    message: lowStock.length > 0
      ? `${lowStock.length} product(s) below reorder point`
      : "All products are above reorder point",
  };
}

// ─── Group 3: Promotions ─────────────────────────────────────────────────────

async function managePromotion(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const promotion = await prisma.promotion.findFirst({
    where: { id: input.promotion_id, supplierId: context.supplierId },
    include: { products: { select: { id: true, name: true } } },
  });

  if (!promotion) return { error: "Promotion not found" };

  if (input.action === "delete") {
    await prisma.promotion.delete({ where: { id: promotion.id } });
    return {
      success: true,
      message: `Promotion deleted`,
    };
  }

  if (input.action === "activate") {
    const now = new Date();
    if (promotion.endDate < now) {
      return { error: "Cannot activate a promotion with an expired end date" };
    }
    const updated = await prisma.promotion.update({
      where: { id: promotion.id },
      data: { isActive: true },
    });
    return {
      success: true,
      promotion: {
        id: updated.id,
        type: updated.type,
        value: Number(updated.value),
        isActive: updated.isActive,
        startDate: updated.startDate,
        endDate: updated.endDate,
      },
      message: `Promotion activated`,
    };
  }

  if (input.action === "deactivate") {
    const updated = await prisma.promotion.update({
      where: { id: promotion.id },
      data: { isActive: false },
    });
    return {
      success: true,
      promotion: {
        id: updated.id,
        type: updated.type,
        value: Number(updated.value),
        isActive: updated.isActive,
      },
      message: `Promotion deactivated`,
    };
  }

  return { error: "Invalid action. Use activate, deactivate, or delete." };
}

async function getPromotions(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const where: any = { supplierId: context.supplierId };
  if (input.status === "active") where.isActive = true;
  else if (input.status === "inactive") where.isActive = false;

  const promotions = await prisma.promotion.findMany({
    where,
    take: input.limit || 20,
    orderBy: { createdAt: "desc" },
    include: { products: { select: { id: true, name: true } } },
  });

  return {
    promotions: promotions.map((p) => ({
      id: p.id,
      type: p.type,
      value: Number(p.value),
      description: p.description,
      minOrderAmount: p.minOrderAmount ? Number(p.minOrderAmount) : null,
      startDate: p.startDate,
      endDate: p.endDate,
      isActive: p.isActive,
      products: p.products,
    })),
    total: promotions.length,
  };
}

// ─── Group 4: Invoicing ──────────────────────────────────────────────────────

async function generateInvoice(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const order = await prisma.order.findFirst({
    where: { id: input.order_id, supplierId: context.supplierId },
    include: {
      restaurant: { select: { id: true, name: true } },
      invoice: { select: { id: true } },
    },
  });

  if (!order) return { error: "Order not found" };
  if (order.status !== "DELIVERED") {
    return { error: `Order status is ${order.status}. Only DELIVERED orders can be invoiced.` };
  }
  if (order.invoice) {
    return { error: "An invoice already exists for this order" };
  }

  const invoiceCount = await prisma.invoice.count({
    where: { supplierId: context.supplierId },
  });
  const invoiceNumber = `INV-${context.supplierId.slice(-4).toUpperCase()}-${String(invoiceCount + 1).padStart(5, "0")}`;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const invoice = await prisma.invoice.create({
    data: {
      invoiceNumber,
      subtotal: order.subtotal,
      tax: order.tax,
      total: order.total,
      dueDate,
      restaurantId: order.restaurantId,
      supplierId: context.supplierId,
      orderId: order.id,
    },
  });

  return {
    success: true,
    invoice: {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customer: order.restaurant.name,
      subtotal: Number(invoice.subtotal),
      tax: Number(invoice.tax),
      total: Number(invoice.total),
      issueDate: invoice.issueDate,
      dueDate: invoice.dueDate,
      status: invoice.status,
    },
    message: `Invoice ${invoiceNumber} generated for order ${order.orderNumber}`,
  };
}

async function recordPayment(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: input.invoice_id, supplierId: context.supplierId },
    include: { restaurant: { select: { name: true } } },
  });

  if (!invoice) return { error: "Invoice not found" };
  if (invoice.status === "PAID") return { error: "Invoice is already fully paid" };
  if (invoice.status === "CANCELLED") return { error: "Cannot record payment on a cancelled invoice" };

  const existingPaid = invoice.paidAmount ? Number(invoice.paidAmount) : 0;
  const newPaidTotal = Math.round((existingPaid + input.amount) * 100) / 100;
  const invoiceTotal = Number(invoice.total);

  const isFullyPaid = newPaidTotal >= invoiceTotal;
  const newStatus = isFullyPaid ? "PAID" : "PARTIALLY_PAID";

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      paidAmount: newPaidTotal,
      paidAt: isFullyPaid ? new Date() : null,
      paymentMethod: input.payment_method || null,
      paymentReference: input.reference || null,
      status: newStatus,
    },
  });

  return {
    success: true,
    invoice: {
      id: updated.id,
      invoiceNumber: updated.invoiceNumber,
      customer: invoice.restaurant.name,
      total: Number(updated.total),
      paidAmount: Number(updated.paidAmount),
      remaining: Math.round((invoiceTotal - newPaidTotal) * 100) / 100,
      status: updated.status,
      paidAt: updated.paidAt,
    },
    message: isFullyPaid
      ? `Invoice ${updated.invoiceNumber} fully paid ($${input.amount})`
      : `$${input.amount} recorded on invoice ${updated.invoiceNumber} ($${Math.round((invoiceTotal - newPaidTotal) * 100) / 100} remaining)`,
  };
}

async function handleDispute(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: input.invoice_id, supplierId: context.supplierId },
  });

  if (!invoice) return { error: "Invoice not found" };

  if (input.action === "dispute") {
    if (invoice.status === "DISPUTED") return { error: "Invoice is already disputed" };
    const previousStatus = invoice.status;
    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: "DISPUTED",
        notes: input.notes ? `[DISPUTE] ${input.notes}` : invoice.notes,
      },
    });
    return {
      success: true,
      invoice: {
        id: updated.id,
        invoiceNumber: updated.invoiceNumber,
        status: updated.status,
        previousStatus,
        notes: updated.notes,
      },
      message: `Invoice ${updated.invoiceNumber} flagged as disputed`,
    };
  }

  if (input.action === "resolve") {
    if (invoice.status !== "DISPUTED") return { error: "Invoice is not currently disputed" };
    const resolvedStatus = invoice.paidAmount && Number(invoice.paidAmount) >= Number(invoice.total)
      ? "PAID"
      : "PENDING";
    const updated = await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: resolvedStatus,
        notes: input.notes ? `[RESOLVED] ${input.notes}` : invoice.notes,
      },
    });
    return {
      success: true,
      invoice: {
        id: updated.id,
        invoiceNumber: updated.invoiceNumber,
        status: updated.status,
        notes: updated.notes,
      },
      message: `Invoice ${updated.invoiceNumber} dispute resolved, status set to ${resolvedStatus}`,
    };
  }

  return { error: "Invalid action. Use dispute or resolve." };
}

// ─── Group 5: Communication ──────────────────────────────────────────────────

async function broadcastMessage(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  let restaurantIds: string[] = input.customer_ids || [];

  if (restaurantIds.length === 0) {
    // Get all active customers (have at least one non-cancelled order)
    const relationships = await prisma.restaurantSupplier.findMany({
      where: { supplierId: context.supplierId },
      select: { restaurantId: true },
    });
    restaurantIds = relationships.map((r) => r.restaurantId);
  }

  const sent: string[] = [];
  const failed: { customerId: string; reason: string }[] = [];

  for (const restaurantId of restaurantIds) {
    // Find most recent non-cancelled order for this customer
    const recentOrder = await prisma.order.findFirst({
      where: {
        supplierId: context.supplierId,
        restaurantId,
        status: { not: "CANCELLED" },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, orderNumber: true },
    });

    if (!recentOrder) {
      failed.push({ customerId: restaurantId, reason: "No recent orders found" });
      continue;
    }

    try {
      const content = input.subject
        ? `**${input.subject}**\n\n${input.message}`
        : input.message;

      await prisma.orderMessage.create({
        data: {
          content,
          orderId: recentOrder.id,
          senderId: context.userId,
          isInternal: false,
        },
      });
      sent.push(restaurantId);
    } catch {
      failed.push({ customerId: restaurantId, reason: "Failed to send message" });
    }
  }

  return {
    success: true,
    sent: sent.length,
    failed: failed.length,
    failures: failed.length > 0 ? failed : undefined,
    message: `Message sent to ${sent.length} customer(s)${failed.length > 0 ? `, ${failed.length} failed` : ""}`,
  };
}

async function updateDeliveryEta(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const order = await prisma.order.findFirst({
    where: { id: input.order_id, supplierId: context.supplierId },
    include: {
      restaurant: { select: { id: true, name: true } },
    },
  });

  if (!order) return { error: "Order not found" };

  const estimatedDeliveryAt = new Date(input.estimated_delivery_at);

  await prisma.order.update({
    where: { id: order.id },
    data: { estimatedDeliveryAt },
  });

  // Send message on order if custom message provided
  if (input.message) {
    await prisma.orderMessage.create({
      data: {
        content: input.message,
        orderId: order.id,
        senderId: context.userId,
        isInternal: false,
      },
    });
  }

  // Create notification for restaurant users
  const restaurantUsers = await prisma.user.findMany({
    where: { restaurantId: order.restaurantId },
    select: { id: true },
  });

  for (const user of restaurantUsers) {
    await prisma.notification.create({
      data: {
        type: "DELIVERY_UPDATE",
        title: "Delivery ETA Updated",
        message: input.message || `Estimated delivery for order ${order.orderNumber} updated to ${estimatedDeliveryAt.toLocaleString()}`,
        userId: user.id,
        metadata: { orderId: order.id, orderNumber: order.orderNumber },
      },
    });
  }

  return {
    success: true,
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      estimatedDeliveryAt,
    },
    notifiedUsers: restaurantUsers.length,
    message: `Delivery ETA for ${order.orderNumber} updated to ${estimatedDeliveryAt.toLocaleString()}`,
  };
}

// ─── New Supplier Tools ────────────────────────────────────────────────────

async function getDrivers(
  _input: Record<string, any>,
  context: SupplierToolContext
) {
  const drivers = await prisma.user.findMany({
    where: { supplierId: context.supplierId, role: "DRIVER" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      clerkId: true,
      createdAt: true,
      _count: { select: { driverDeliveries: { where: { status: "DELIVERED" } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return {
    count: drivers.length,
    drivers: drivers.map((d) => ({
      id: d.id,
      name: `${d.firstName || ""} ${d.lastName || ""}`.trim(),
      email: d.email,
      phone: d.phone,
      isPending: d.clerkId.startsWith("driver_pending_"),
      deliveryCount: d._count.driverDeliveries,
      joinedAt: d.createdAt.toISOString(),
    })),
  };
}

async function createDriver(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  if (!["SUPPLIER_ADMIN", "SUPPLIER_REP"].includes(context.userRole)) {
    return { error: "Only supplier admins and reps can add drivers." };
  }

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing?.supplierId === context.supplierId && existing?.role === "DRIVER") {
    return { error: "This user is already a driver for your supplier." };
  }

  if (existing) {
    // Re-assign existing user as driver
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { role: "DRIVER", supplierId: context.supplierId, firstName: input.first_name, lastName: input.last_name || null, phone: input.phone || null },
    });
    return {
      success: true,
      driver: { id: updated.id, email: updated.email, name: `${updated.firstName || ""} ${updated.lastName || ""}`.trim() },
      message: `${updated.firstName || updated.email} added as driver.`,
    };
  }

  const driver = await prisma.user.create({
    data: {
      clerkId: `driver_pending_${crypto.randomUUID()}`,
      email: input.email,
      firstName: input.first_name,
      lastName: input.last_name || null,
      phone: input.phone || null,
      role: "DRIVER",
      supplierId: context.supplierId,
    },
  });

  return {
    success: true,
    driver: { id: driver.id, email: driver.email, name: `${driver.firstName || ""} ${driver.lastName || ""}`.trim() },
    message: `Driver ${driver.firstName || driver.email} created.`,
  };
}

async function updateDriver(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const driver = await prisma.user.findFirst({
    where: { id: input.driver_id, supplierId: context.supplierId, role: "DRIVER" },
  });
  if (!driver) return { error: "Driver not found or does not belong to your supplier." };

  const updateData: any = {};
  if (input.first_name !== undefined) updateData.firstName = input.first_name;
  if (input.last_name !== undefined) updateData.lastName = input.last_name;
  if (input.phone !== undefined) updateData.phone = input.phone;

  const updated = await prisma.user.update({ where: { id: driver.id }, data: updateData });

  return {
    success: true,
    driver: { id: updated.id, name: `${updated.firstName || ""} ${updated.lastName || ""}`.trim(), phone: updated.phone },
    message: `Driver ${updated.firstName || updated.email} updated.`,
  };
}

async function getDeliveryZones(
  _input: Record<string, any>,
  context: SupplierToolContext
) {
  const zones = await prisma.deliveryZone.findMany({
    where: { supplierId: context.supplierId },
    orderBy: { createdAt: "desc" },
  });

  return {
    count: zones.length,
    zones: zones.map((z) => ({
      id: z.id,
      name: z.name,
      zipCodes: z.zipCodes,
      deliveryFee: Number(z.deliveryFee),
      minimumOrder: z.minimumOrder ? Number(z.minimumOrder) : null,
      createdAt: z.createdAt.toISOString(),
    })),
  };
}

async function createDeliveryZone(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  if (context.userRole !== "SUPPLIER_ADMIN") {
    return { error: "Only supplier admins can create delivery zones." };
  }

  const zone = await prisma.deliveryZone.create({
    data: {
      name: input.name,
      zipCodes: input.zip_codes,
      deliveryFee: input.delivery_fee,
      minimumOrder: input.minimum_order ?? null,
      supplierId: context.supplierId,
    },
  });

  return {
    success: true,
    zone: {
      id: zone.id,
      name: zone.name,
      zipCodes: zone.zipCodes,
      deliveryFee: Number(zone.deliveryFee),
      minimumOrder: zone.minimumOrder ? Number(zone.minimumOrder) : null,
    },
    message: `Delivery zone "${zone.name}" created with ${zone.zipCodes.length} zip codes.`,
  };
}

async function updateDeliveryZone(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  if (context.userRole !== "SUPPLIER_ADMIN") {
    return { error: "Only supplier admins can update delivery zones." };
  }

  const zone = await prisma.deliveryZone.findFirst({
    where: { id: input.zone_id, supplierId: context.supplierId },
  });
  if (!zone) return { error: "Delivery zone not found or does not belong to your supplier." };

  const updateData: any = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.zip_codes !== undefined) updateData.zipCodes = input.zip_codes;
  if (input.delivery_fee !== undefined) updateData.deliveryFee = input.delivery_fee;
  if (input.minimum_order !== undefined) updateData.minimumOrder = input.minimum_order;

  const updated = await prisma.deliveryZone.update({ where: { id: zone.id }, data: updateData });

  return {
    success: true,
    zone: {
      id: updated.id,
      name: updated.name,
      deliveryFee: Number(updated.deliveryFee),
      minimumOrder: updated.minimumOrder ? Number(updated.minimumOrder) : null,
    },
    message: `Delivery zone "${updated.name}" updated.`,
  };
}

async function getOrderMessages(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const order = await prisma.order.findFirst({
    where: { id: input.order_id, supplierId: context.supplierId },
    select: { id: true, orderNumber: true },
  });
  if (!order) return { error: "Order not found or does not belong to your supplier." };

  const messages = await prisma.orderMessage.findMany({
    where: { orderId: order.id, isInternal: false },
    include: { sender: { select: { id: true, firstName: true, lastName: true, role: true } } },
    orderBy: { createdAt: "asc" },
  });

  return {
    orderNumber: order.orderNumber,
    count: messages.length,
    messages: messages.map((m) => ({
      id: m.id,
      content: m.content,
      sender: `${m.sender.firstName || ""} ${m.sender.lastName || ""}`.trim(),
      senderRole: m.sender.role,
      createdAt: m.createdAt.toISOString(),
    })),
  };
}

async function getSupplierTeam(
  _input: Record<string, any>,
  context: SupplierToolContext
) {
  if (context.userRole !== "SUPPLIER_ADMIN") {
    return { error: "Only supplier admins can view team members." };
  }

  const members = await prisma.user.findMany({
    where: { supplierId: context.supplierId, role: { in: ["SUPPLIER_ADMIN", "SUPPLIER_REP"] } },
    select: { id: true, firstName: true, lastName: true, email: true, phone: true, role: true, clerkId: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  return {
    count: members.length,
    members: members.map((m) => ({
      id: m.id,
      name: `${m.firstName || ""} ${m.lastName || ""}`.trim(),
      email: m.email,
      phone: m.phone,
      role: m.role,
      isPending: m.clerkId.startsWith("staff_pending_"),
      joinedAt: m.createdAt.toISOString(),
    })),
  };
}

async function manageSupplierTeam(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  if (context.userRole !== "SUPPLIER_ADMIN") {
    return { error: "Only supplier admins can manage team members." };
  }

  if (input.action === "invite") {
    if (!input.email) return { error: "Email is required to invite a team member." };

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing?.supplierId === context.supplierId) {
      return { error: "This user is already a member of your supplier." };
    }

    const role = input.role || "SUPPLIER_REP";
    const newMember = await prisma.user.create({
      data: {
        clerkId: `staff_pending_${crypto.randomUUID()}`,
        email: input.email,
        firstName: input.first_name || null,
        lastName: input.last_name || null,
        phone: input.phone || null,
        role,
        supplierId: context.supplierId,
      },
    });

    // Send invitation email
    const inviter = await prisma.user.findUnique({ where: { id: context.userId }, select: { firstName: true, lastName: true } });
    const supplier = await prisma.supplier.findUnique({ where: { id: context.supplierId }, select: { name: true } });
    const inviterName = `${inviter?.firstName || ""} ${inviter?.lastName || ""}`.trim();
    const template = emailTemplates.supplierTeamInvitation(input.first_name || "Team Member", supplier?.name || "", role, inviterName);
    sendEmail({ to: input.email, subject: template.subject, html: template.html });

    return {
      success: true,
      member: { id: newMember.id, email: newMember.email, role: newMember.role },
      message: `Invitation sent to ${input.email} as ${role}.`,
    };
  }

  if (input.action === "update") {
    if (!input.member_id) return { error: "member_id is required to update a team member." };

    const member = await prisma.user.findFirst({
      where: { id: input.member_id, supplierId: context.supplierId },
    });
    if (!member) return { error: "Team member not found." };

    const updateData: any = {};
    if (input.first_name !== undefined) updateData.firstName = input.first_name;
    if (input.last_name !== undefined) updateData.lastName = input.last_name;
    if (input.role !== undefined) updateData.role = input.role;
    if (input.phone !== undefined) updateData.phone = input.phone;

    const updated = await prisma.user.update({ where: { id: member.id }, data: updateData });

    return {
      success: true,
      member: { id: updated.id, name: `${updated.firstName || ""} ${updated.lastName || ""}`.trim(), role: updated.role },
      message: `Team member updated.`,
    };
  }

  if (input.action === "remove") {
    if (!input.member_id) return { error: "member_id is required to remove a team member." };

    const member = await prisma.user.findFirst({
      where: { id: input.member_id, supplierId: context.supplierId },
    });
    if (!member) return { error: "Team member not found." };
    if (member.id === context.userId) return { error: "Cannot remove yourself." };

    await prisma.user.update({ where: { id: member.id }, data: { supplierId: null, role: "SUPPLIER_REP" } });

    return {
      success: true,
      message: `${member.firstName || member.email} has been removed from the team.`,
    };
  }

  return { error: "Invalid action. Use 'invite', 'update', or 'remove'." };
}

async function updateSupplierSettings(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  if (context.userRole !== "SUPPLIER_ADMIN") {
    return { error: "Only supplier admins can update settings." };
  }

  const updateData: any = {};
  if (input.name !== undefined) updateData.name = input.name;
  if (input.description !== undefined) updateData.description = input.description;
  if (input.email !== undefined) updateData.email = input.email;
  if (input.phone !== undefined) updateData.phone = input.phone;
  if (input.address !== undefined) updateData.address = input.address;
  if (input.city !== undefined) updateData.city = input.city;
  if (input.state !== undefined) updateData.state = input.state;
  if (input.zip_code !== undefined) updateData.zipCode = input.zip_code;
  if (input.website !== undefined) updateData.website = input.website;
  if (input.minimum_order !== undefined) updateData.minimumOrder = input.minimum_order;
  if (input.delivery_fee !== undefined) updateData.deliveryFee = input.delivery_fee;
  if (input.lead_time_days !== undefined) updateData.leadTimeDays = input.lead_time_days;

  const updated = await prisma.supplier.update({
    where: { id: context.supplierId },
    data: updateData,
  });

  return {
    success: true,
    supplier: {
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      minimumOrder: updated.minimumOrder ? Number(updated.minimumOrder) : null,
      deliveryFee: updated.deliveryFee ? Number(updated.deliveryFee) : null,
      leadTimeDays: updated.leadTimeDays,
    },
    message: `Supplier settings updated.`,
  };
}

async function getReturnDetails(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const returnRequest = await prisma.returnRequest.findFirst({
    where: { id: input.return_id, order: { supplierId: context.supplierId } },
    include: {
      order: {
        select: { id: true, orderNumber: true, restaurant: { select: { id: true, name: true } } },
      },
      createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
      reviewedBy: { select: { id: true, firstName: true, lastName: true } },
    },
  });

  if (!returnRequest) return { error: "Return request not found or does not belong to your supplier." };

  return {
    id: returnRequest.id,
    returnNumber: returnRequest.returnNumber,
    type: returnRequest.type,
    status: returnRequest.status,
    reason: returnRequest.reason,
    items: returnRequest.items,
    creditAmount: returnRequest.creditAmount ? Number(returnRequest.creditAmount) : null,
    creditNotes: returnRequest.creditNotes,
    resolution: returnRequest.resolution,
    order: { id: returnRequest.order.id, orderNumber: returnRequest.order.orderNumber, restaurant: returnRequest.order.restaurant.name },
    createdBy: `${returnRequest.createdBy.firstName || ""} ${returnRequest.createdBy.lastName || ""}`.trim(),
    reviewedBy: returnRequest.reviewedBy ? `${returnRequest.reviewedBy.firstName || ""} ${returnRequest.reviewedBy.lastName || ""}`.trim() : null,
    reviewedAt: returnRequest.reviewedAt?.toISOString() || null,
    createdAt: returnRequest.createdAt.toISOString(),
  };
}

async function scheduleDelivery(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const order = await prisma.order.findFirst({
    where: { id: input.order_id, supplierId: context.supplierId },
    include: { restaurant: { select: { id: true, name: true } } },
  });
  if (!order) return { error: "Order not found or does not belong to your supplier." };

  const deliveryDate = new Date(input.delivery_date);
  if (isNaN(deliveryDate.getTime())) return { error: "Invalid delivery date format. Use ISO format (e.g., 2025-01-15)." };
  if (deliveryDate < new Date()) return { error: "Delivery date cannot be in the past." };

  const updateData: any = { deliveryDate };
  if (input.delivery_notes !== undefined) updateData.deliveryNotes = input.delivery_notes;

  await prisma.order.update({ where: { id: order.id }, data: updateData });

  // Notify restaurant users
  const restaurantUsers = await prisma.user.findMany({
    where: { restaurantId: order.restaurant.id, role: { in: ["OWNER", "MANAGER"] } },
    select: { id: true },
  });

  for (const user of restaurantUsers) {
    await prisma.notification.create({
      data: {
        type: "DELIVERY_UPDATE",
        title: "Delivery Scheduled",
        message: `Delivery for order ${order.orderNumber} scheduled for ${deliveryDate.toISOString().split("T")[0]}.`,
        userId: user.id,
      },
    });
  }

  return {
    success: true,
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      deliveryDate: deliveryDate.toISOString(),
    },
    message: `Delivery for ${order.orderNumber} scheduled for ${deliveryDate.toISOString().split("T")[0]}.`,
  };
}

async function exportSupplierData(
  input: Record<string, any>,
  context: SupplierToolContext
) {
  const days = input.time_range || 30;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  if (input.type === "customers") {
    const restaurants = await prisma.restaurant.findMany({
      where: { orders: { some: { supplierId: context.supplierId } } },
      include: {
        _count: { select: { orders: { where: { supplierId: context.supplierId } } } },
        orders: {
          where: { supplierId: context.supplierId, createdAt: { gte: startDate } },
          select: { total: true },
        },
      },
      take: 200,
    });

    return {
      type: "customers",
      period: `Last ${days} days`,
      totalCustomers: restaurants.length,
      customers: restaurants.map((r) => ({
        name: r.name,
        totalOrders: r._count.orders,
        periodRevenue: r.orders.reduce((sum, o) => sum + Number(o.total), 0),
      })),
    };
  }

  if (input.type === "orders") {
    const orders = await prisma.order.findMany({
      where: { supplierId: context.supplierId, createdAt: { gte: startDate } },
      include: { restaurant: { select: { name: true } } },
      take: 500,
    });

    return {
      type: "orders",
      period: `Last ${days} days`,
      totalOrders: orders.length,
      orders: orders.map((o) => ({
        orderNumber: o.orderNumber,
        status: o.status,
        customer: o.restaurant.name,
        total: Number(o.total),
        createdAt: o.createdAt.toISOString(),
      })),
    };
  }

  if (input.type === "revenue") {
    const orders = await prisma.order.findMany({
      where: {
        supplierId: context.supplierId,
        status: { in: ["DELIVERED", "CONFIRMED", "PROCESSING", "SHIPPED", "IN_TRANSIT"] },
        createdAt: { gte: startDate },
      },
      select: { total: true, status: true, createdAt: true },
    });

    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total), 0);
    const delivered = orders.filter((o) => o.status === "DELIVERED");
    const deliveredRevenue = delivered.reduce((sum, o) => sum + Number(o.total), 0);

    return {
      type: "revenue",
      period: `Last ${days} days`,
      totalOrders: orders.length,
      totalRevenue,
      deliveredRevenue,
      pendingRevenue: totalRevenue - deliveredRevenue,
    };
  }

  return { error: "Invalid export type. Use 'customers', 'orders', or 'revenue'." };
}
