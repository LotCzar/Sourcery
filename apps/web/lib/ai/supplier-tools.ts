import type Anthropic from "@anthropic-ai/sdk";

export const supplierAiTools: Anthropic.Tool[] = [
  {
    name: "get_supplier_orders",
    description:
      "List and search orders for your supplier. Filter by status, customer name, or date range.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: [
            "PENDING",
            "CONFIRMED",
            "PROCESSING",
            "SHIPPED",
            "IN_TRANSIT",
            "DELIVERED",
            "CANCELLED",
          ],
          description: "Filter by order status",
        },
        customer_name: {
          type: "string",
          description: "Search by restaurant/customer name",
        },
        date_from: {
          type: "string",
          description: "Start date filter (ISO format)",
        },
        date_to: {
          type: "string",
          description: "End date filter (ISO format)",
        },
        limit: {
          type: "number",
          description: "Max number of orders to return (default 20)",
        },
      },
    },
  },
  {
    name: "get_order_details",
    description:
      "Get full details of a specific order including items, customer info, and delivery details.",
    input_schema: {
      type: "object" as const,
      properties: {
        order_id: {
          type: "string",
          description: "The order ID",
        },
        order_number: {
          type: "string",
          description: "The order number (e.g., ORD-00042)",
        },
      },
    },
  },
  {
    name: "update_order_status",
    description:
      "Update the status of an order. Supports CONFIRMED, PROCESSING, SHIPPED, IN_TRANSIT, DELIVERED.",
    input_schema: {
      type: "object" as const,
      properties: {
        order_id: {
          type: "string",
          description: "The order ID to update",
        },
        status: {
          type: "string",
          enum: ["CONFIRMED", "PROCESSING", "SHIPPED", "IN_TRANSIT", "DELIVERED"],
          description: "The new status for the order",
        },
        tracking_notes: {
          type: "string",
          description: "Optional tracking or delivery notes",
        },
      },
      required: ["order_id", "status"],
    },
  },
  {
    name: "get_supplier_products",
    description:
      "List your products with optional filters for category, stock status, or search term.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: [
            "PRODUCE", "MEAT", "SEAFOOD", "DAIRY", "BAKERY",
            "BEVERAGES", "DRY_GOODS", "FROZEN", "CLEANING", "EQUIPMENT", "OTHER",
          ],
          description: "Filter by product category",
        },
        in_stock_only: {
          type: "boolean",
          description: "Only show in-stock products",
        },
        search: {
          type: "string",
          description: "Search by product name",
        },
        limit: {
          type: "number",
          description: "Max number of products to return (default 50)",
        },
      },
    },
  },
  {
    name: "update_product",
    description:
      "Update a product's price, stock status, or description.",
    input_schema: {
      type: "object" as const,
      properties: {
        product_id: {
          type: "string",
          description: "The product ID to update",
        },
        price: {
          type: "number",
          description: "New price",
        },
        in_stock: {
          type: "boolean",
          description: "Stock availability",
        },
        description: {
          type: "string",
          description: "New product description",
        },
      },
      required: ["product_id"],
    },
  },
  {
    name: "get_customer_list",
    description:
      "List all restaurant customers with their order stats (total orders, revenue, last order date).",
    input_schema: {
      type: "object" as const,
      properties: {
        search: {
          type: "string",
          description: "Search by restaurant name",
        },
        sort_by: {
          type: "string",
          enum: ["revenue", "orders", "recent"],
          description: "Sort customers by metric (default: revenue)",
        },
      },
    },
  },
  {
    name: "get_customer_details",
    description:
      "Get detailed information about a specific customer including order history, revenue, and preferences.",
    input_schema: {
      type: "object" as const,
      properties: {
        restaurant_id: {
          type: "string",
          description: "The restaurant/customer ID",
        },
        restaurant_name: {
          type: "string",
          description: "Restaurant name to search for",
        },
      },
    },
  },
  {
    name: "get_supplier_invoices",
    description:
      "List invoices with optional filters for status, customer, or date range.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["PENDING", "PAID", "OVERDUE", "PARTIALLY_PAID", "CANCELLED", "DISPUTED"],
          description: "Filter by invoice status",
        },
        customer_name: {
          type: "string",
          description: "Filter by customer/restaurant name",
        },
        date_from: {
          type: "string",
          description: "Start date filter (ISO format)",
        },
        date_to: {
          type: "string",
          description: "End date filter (ISO format)",
        },
        limit: {
          type: "number",
          description: "Max number of invoices to return (default 20)",
        },
      },
    },
  },
  {
    name: "get_revenue_summary",
    description:
      "Get revenue summary by period with comparison to the previous period.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          enum: ["this_week", "last_week", "this_month", "last_month", "last_30_days", "last_90_days"],
          description: "Time period for revenue analysis (default: this_month)",
        },
      },
    },
  },
  {
    name: "get_top_products",
    description:
      "Get top selling products ranked by revenue or quantity.",
    input_schema: {
      type: "object" as const,
      properties: {
        sort_by: {
          type: "string",
          enum: ["revenue", "quantity"],
          description: "Rank by revenue or quantity (default: revenue)",
        },
        limit: {
          type: "number",
          description: "Number of top products to return (default 10)",
        },
        period: {
          type: "string",
          enum: ["this_week", "last_week", "this_month", "last_month", "last_30_days", "last_90_days"],
          description: "Time period (default: last_30_days)",
        },
      },
    },
  },
  {
    name: "get_delivery_performance",
    description:
      "Get delivery performance metrics including on-time rate, average delivery time, and issues.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          enum: ["this_week", "last_week", "this_month", "last_month", "last_30_days", "last_90_days"],
          description: "Time period (default: last_30_days)",
        },
      },
    },
  },
  {
    name: "get_demand_forecast",
    description:
      "Get demand forecasting insights for your products based on order history trends.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: [
            "PRODUCE", "MEAT", "SEAFOOD", "DAIRY", "BAKERY",
            "BEVERAGES", "DRY_GOODS", "FROZEN", "CLEANING", "EQUIPMENT", "OTHER",
          ],
          description: "Filter by product category",
        },
      },
    },
  },
  {
    name: "get_pricing_suggestions",
    description:
      "Get AI-generated pricing optimization suggestions based on order volume and market trends.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: [
            "PRODUCE", "MEAT", "SEAFOOD", "DAIRY", "BAKERY",
            "BEVERAGES", "DRY_GOODS", "FROZEN", "CLEANING", "EQUIPMENT", "OTHER",
          ],
          description: "Filter by product category",
        },
      },
    },
  },
  {
    name: "get_customer_health",
    description:
      "Get customer health scores showing churn risk and engagement levels for your restaurant customers.",
    input_schema: {
      type: "object" as const,
      properties: {
        risk_level: {
          type: "string",
          enum: ["high", "medium", "low"],
          description: "Filter by risk level",
        },
      },
    },
  },
  {
    name: "get_supplier_insights",
    description:
      "Query your AI-generated business insights. Filter by type: DEMAND_FORECAST, PRICING_SUGGESTION, CUSTOMER_HEALTH, ANOMALY, ESCALATION.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["DEMAND_FORECAST", "PRICING_SUGGESTION", "CUSTOMER_HEALTH", "ANOMALY", "ESCALATION"],
          description: "Filter by insight type",
        },
        status: {
          type: "string",
          enum: ["ACTIVE", "DISMISSED", "ACTED_ON"],
          description: "Filter by insight status (default: ACTIVE)",
        },
        limit: {
          type: "number",
          description: "Max number of insights to return (default 10)",
        },
      },
    },
  },
  {
    name: "send_customer_message",
    description:
      "Send a message to a customer on an existing order.",
    input_schema: {
      type: "object" as const,
      properties: {
        order_id: {
          type: "string",
          description: "The order ID to send the message on",
        },
        message: {
          type: "string",
          description: "The message content to send",
        },
      },
      required: ["order_id", "message"],
    },
  },
  {
    name: "get_return_summary",
    description:
      "Get returns overview with quality metrics, return rates by product, and common reasons.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          enum: ["this_week", "last_week", "this_month", "last_month", "last_30_days", "last_90_days"],
          description: "Time period for returns analysis (default: last_30_days)",
        },
        product_name: {
          type: "string",
          description: "Filter by product name",
        },
      },
    },
  },
  {
    name: "adjust_supplier_inventory",
    description:
      "Update stock quantity, set reorder point, or record batch expiration date for a product.",
    input_schema: {
      type: "object" as const,
      properties: {
        product_id: {
          type: "string",
          description: "The product ID to adjust",
        },
        stock_quantity: {
          type: "number",
          description: "New stock quantity",
        },
        reorder_point: {
          type: "number",
          description: "Reorder point threshold",
        },
        expiration_date: {
          type: "string",
          description: "Batch expiration date (ISO format)",
        },
      },
      required: ["product_id"],
    },
  },
  {
    name: "create_promotion",
    description:
      "Create a draft promotion for your products.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["PERCENTAGE_OFF", "FLAT_DISCOUNT", "FREE_DELIVERY", "BUY_X_GET_Y"],
          description: "Promotion type",
        },
        value: {
          type: "number",
          description: "Discount value (percentage or flat amount)",
        },
        description: {
          type: "string",
          description: "Promotion description",
        },
        product_ids: {
          type: "array",
          items: { type: "string" },
          description: "Product IDs to apply promotion to",
        },
        min_order_amount: {
          type: "number",
          description: "Minimum order amount for promotion",
        },
        start_date: {
          type: "string",
          description: "Start date (ISO format)",
        },
        end_date: {
          type: "string",
          description: "End date (ISO format)",
        },
      },
      required: ["type", "value", "start_date", "end_date"],
    },
  },
  {
    name: "get_invoice_overview",
    description:
      "Get aggregated invoice statistics: total outstanding, overdue amounts, biggest debtors, payment trends.",
    input_schema: {
      type: "object" as const,
      properties: {
        period: {
          type: "string",
          enum: ["this_week", "last_week", "this_month", "last_month", "last_30_days", "last_90_days"],
          description: "Time period for invoice analysis",
        },
      },
    },
  },
  {
    name: "get_driver_schedule",
    description:
      "View driver assignments and delivery load for a specific date.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description: "Date to check (ISO format, defaults to today)",
        },
      },
    },
  },
  {
    name: "manage_return",
    description:
      "Approve or reject a return request and optionally issue a credit.",
    input_schema: {
      type: "object" as const,
      properties: {
        return_id: {
          type: "string",
          description: "The return request ID",
        },
        action: {
          type: "string",
          enum: ["APPROVED", "REJECTED"],
          description: "Action to take on the return",
        },
        credit_amount: {
          type: "number",
          description: "Credit amount to issue (for approved returns)",
        },
        resolution: {
          type: "string",
          description: "Resolution notes",
        },
      },
      required: ["return_id", "action"],
    },
  },
];
