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

  // ─── Group 1: Order Workflow ─────────────────────────────────────────────────

  {
    name: "bulk_update_orders",
    description:
      "Confirm, process, or ship multiple orders at once.",
    input_schema: {
      type: "object" as const,
      properties: {
        order_ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of order IDs to update",
        },
        status: {
          type: "string",
          enum: ["CONFIRMED", "PROCESSING", "SHIPPED"],
          description: "The new status for all orders",
        },
        tracking_notes: {
          type: "string",
          description: "Optional tracking or delivery notes",
        },
        driver_id: {
          type: "string",
          description: "Driver ID to assign (for SHIPPED status)",
        },
      },
      required: ["order_ids", "status"],
    },
  },
  {
    name: "assign_driver",
    description:
      "Assign or reassign a driver to an order.",
    input_schema: {
      type: "object" as const,
      properties: {
        order_id: {
          type: "string",
          description: "The order ID to assign a driver to",
        },
        driver_id: {
          type: "string",
          description: "The driver's user ID",
        },
      },
      required: ["order_id", "driver_id"],
    },
  },
  {
    name: "generate_pick_list",
    description:
      "Generate a warehouse pick list for a date's orders, grouped by product.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description: "Date for pick list (ISO format, defaults to tomorrow)",
        },
      },
    },
  },

  // ─── Group 2: Product & Catalog ──────────────────────────────────────────────

  {
    name: "create_product",
    description:
      "Add a new product to your catalog.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Product name",
        },
        category: {
          type: "string",
          enum: [
            "PRODUCE", "MEAT", "SEAFOOD", "DAIRY", "BAKERY",
            "BEVERAGES", "DRY_GOODS", "FROZEN", "CLEANING", "EQUIPMENT", "OTHER",
          ],
          description: "Product category",
        },
        price: {
          type: "number",
          description: "Product price",
        },
        unit: {
          type: "string",
          enum: ["EACH", "POUND", "OUNCE", "GALLON", "QUART", "PINT", "LITER", "KILOGRAM", "GRAM", "CASE", "BOX", "BAG", "BUNCH", "DOZEN"],
          description: "Unit of measure",
        },
        description: {
          type: "string",
          description: "Product description",
        },
        sku: {
          type: "string",
          description: "Product SKU",
        },
        brand: {
          type: "string",
          description: "Brand name",
        },
        stock_quantity: {
          type: "number",
          description: "Initial stock quantity",
        },
        reorder_point: {
          type: "number",
          description: "Reorder point threshold",
        },
      },
      required: ["name", "category", "price", "unit"],
    },
  },
  {
    name: "bulk_update_prices",
    description:
      "Update prices for multiple products at once, optionally by percentage.",
    input_schema: {
      type: "object" as const,
      properties: {
        updates: {
          type: "array",
          items: {
            type: "object",
            properties: {
              product_id: { type: "string" },
              price: { type: "number" },
            },
            required: ["product_id", "price"],
          },
          description: "Array of {product_id, price} for explicit updates",
        },
        category: {
          type: "string",
          enum: [
            "PRODUCE", "MEAT", "SEAFOOD", "DAIRY", "BAKERY",
            "BEVERAGES", "DRY_GOODS", "FROZEN", "CLEANING", "EQUIPMENT", "OTHER",
          ],
          description: "Apply percentage change to all products in this category",
        },
        percentage: {
          type: "number",
          description: "Percentage change (e.g., 5 for +5%, -10 for -10%). Used with category.",
        },
      },
    },
  },
  {
    name: "get_low_stock",
    description:
      "Check which products are below their reorder point right now.",
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

  // ─── Group 3: Promotions ─────────────────────────────────────────────────────

  {
    name: "manage_promotion",
    description:
      "Activate, deactivate, or delete a promotion.",
    input_schema: {
      type: "object" as const,
      properties: {
        promotion_id: {
          type: "string",
          description: "The promotion ID",
        },
        action: {
          type: "string",
          enum: ["activate", "deactivate", "delete"],
          description: "Action to perform on the promotion",
        },
      },
      required: ["promotion_id", "action"],
    },
  },
  {
    name: "get_promotions",
    description:
      "List your promotions with optional filters.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: ["active", "inactive", "all"],
          description: "Filter by promotion status (default: all)",
        },
        limit: {
          type: "number",
          description: "Max number of promotions to return (default 20)",
        },
      },
    },
  },

  // ─── Group 4: Invoicing ──────────────────────────────────────────────────────

  {
    name: "generate_invoice",
    description:
      "Generate an invoice for a delivered order.",
    input_schema: {
      type: "object" as const,
      properties: {
        order_id: {
          type: "string",
          description: "The order ID to generate an invoice for",
        },
      },
      required: ["order_id"],
    },
  },
  {
    name: "record_payment",
    description:
      "Record a payment against an invoice.",
    input_schema: {
      type: "object" as const,
      properties: {
        invoice_id: {
          type: "string",
          description: "The invoice ID",
        },
        amount: {
          type: "number",
          description: "Payment amount",
        },
        payment_method: {
          type: "string",
          enum: ["BANK_TRANSFER", "CHECK", "CREDIT_CARD", "CASH", "OTHER"],
          description: "Payment method",
        },
        reference: {
          type: "string",
          description: "Payment reference or transaction ID",
        },
      },
      required: ["invoice_id", "amount"],
    },
  },
  {
    name: "handle_dispute",
    description:
      "Flag or resolve an invoice dispute.",
    input_schema: {
      type: "object" as const,
      properties: {
        invoice_id: {
          type: "string",
          description: "The invoice ID",
        },
        action: {
          type: "string",
          enum: ["dispute", "resolve"],
          description: "Action to perform",
        },
        notes: {
          type: "string",
          description: "Dispute or resolution notes",
        },
      },
      required: ["invoice_id", "action"],
    },
  },

  // ─── Group 5: Communication ──────────────────────────────────────────────────

  {
    name: "broadcast_message",
    description:
      "Send a message to multiple customers on their most recent orders.",
    input_schema: {
      type: "object" as const,
      properties: {
        message: {
          type: "string",
          description: "The message content to broadcast",
        },
        customer_ids: {
          type: "array",
          items: { type: "string" },
          description: "Restaurant IDs to message (defaults to all active customers)",
        },
        subject: {
          type: "string",
          description: "Optional message subject/prefix",
        },
      },
      required: ["message"],
    },
  },
  {
    name: "update_delivery_eta",
    description:
      "Update estimated delivery time for an order and notify the customer.",
    input_schema: {
      type: "object" as const,
      properties: {
        order_id: {
          type: "string",
          description: "The order ID",
        },
        estimated_delivery_at: {
          type: "string",
          description: "New estimated delivery time (ISO format)",
        },
        message: {
          type: "string",
          description: "Optional custom notification message",
        },
      },
      required: ["order_id", "estimated_delivery_at"],
    },
  },

  // ─── New Tools ─────────────────────────────────────────────────────────────

  {
    name: "get_drivers",
    description:
      "List all drivers for your supplier with delivery counts.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "create_driver",
    description:
      "Add a new driver to your supplier. Requires SUPPLIER_ADMIN or SUPPLIER_REP role.",
    input_schema: {
      type: "object" as const,
      properties: {
        first_name: {
          type: "string",
          description: "Driver's first name",
        },
        email: {
          type: "string",
          description: "Driver's email address",
        },
        last_name: {
          type: "string",
          description: "Driver's last name",
        },
        phone: {
          type: "string",
          description: "Driver's phone number",
        },
      },
      required: ["first_name", "email"],
    },
  },
  {
    name: "update_driver",
    description:
      "Update a driver's information.",
    input_schema: {
      type: "object" as const,
      properties: {
        driver_id: {
          type: "string",
          description: "The driver's user ID",
        },
        first_name: {
          type: "string",
          description: "New first name",
        },
        last_name: {
          type: "string",
          description: "New last name",
        },
        phone: {
          type: "string",
          description: "New phone number",
        },
      },
      required: ["driver_id"],
    },
  },
  {
    name: "get_delivery_zones",
    description:
      "List all delivery zones with zip codes, fees, and minimums.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "create_delivery_zone",
    description:
      "Create a new delivery zone. Requires SUPPLIER_ADMIN role.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: {
          type: "string",
          description: "Zone name",
        },
        zip_codes: {
          type: "array",
          items: { type: "string" },
          description: "Array of zip codes in this zone",
        },
        delivery_fee: {
          type: "number",
          description: "Delivery fee for this zone",
        },
        minimum_order: {
          type: "number",
          description: "Minimum order amount for this zone",
        },
      },
      required: ["name", "zip_codes", "delivery_fee"],
    },
  },
  {
    name: "update_delivery_zone",
    description:
      "Update an existing delivery zone. Requires SUPPLIER_ADMIN role.",
    input_schema: {
      type: "object" as const,
      properties: {
        zone_id: {
          type: "string",
          description: "The delivery zone ID",
        },
        name: {
          type: "string",
          description: "New zone name",
        },
        zip_codes: {
          type: "array",
          items: { type: "string" },
          description: "New zip codes array",
        },
        delivery_fee: {
          type: "number",
          description: "New delivery fee",
        },
        minimum_order: {
          type: "number",
          description: "New minimum order amount",
        },
      },
      required: ["zone_id"],
    },
  },
  {
    name: "get_order_messages",
    description:
      "Get message thread for a specific order.",
    input_schema: {
      type: "object" as const,
      properties: {
        order_id: {
          type: "string",
          description: "The order ID to get messages for",
        },
      },
      required: ["order_id"],
    },
  },
  {
    name: "get_supplier_team",
    description:
      "List team members (admins and reps) for your supplier. Requires SUPPLIER_ADMIN role.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "manage_supplier_team",
    description:
      "Invite, update, or remove a supplier team member. Requires SUPPLIER_ADMIN role.",
    input_schema: {
      type: "object" as const,
      properties: {
        action: {
          type: "string",
          enum: ["invite", "update", "remove"],
          description: "Action to perform",
        },
        email: {
          type: "string",
          description: "Email address (required for invite)",
        },
        member_id: {
          type: "string",
          description: "Member user ID (required for update/remove)",
        },
        first_name: {
          type: "string",
          description: "First name",
        },
        last_name: {
          type: "string",
          description: "Last name",
        },
        role: {
          type: "string",
          enum: ["SUPPLIER_ADMIN", "SUPPLIER_REP"],
          description: "Role to assign",
        },
        phone: {
          type: "string",
          description: "Phone number",
        },
      },
      required: ["action"],
    },
  },
  {
    name: "update_supplier_settings",
    description:
      "Update supplier business settings (name, contact info, delivery terms). Requires SUPPLIER_ADMIN role.",
    input_schema: {
      type: "object" as const,
      properties: {
        name: { type: "string", description: "Supplier name" },
        description: { type: "string", description: "Business description" },
        email: { type: "string", description: "Contact email" },
        phone: { type: "string", description: "Contact phone" },
        address: { type: "string", description: "Business address" },
        city: { type: "string", description: "City" },
        state: { type: "string", description: "State" },
        zip_code: { type: "string", description: "Zip code" },
        website: { type: "string", description: "Website URL" },
        minimum_order: { type: "number", description: "Minimum order amount" },
        delivery_fee: { type: "number", description: "Default delivery fee" },
        lead_time_days: { type: "number", description: "Lead time in days" },
      },
    },
  },
  {
    name: "get_return_details",
    description:
      "Get full details of a specific return request including order, items, and review info.",
    input_schema: {
      type: "object" as const,
      properties: {
        return_id: {
          type: "string",
          description: "The return request ID",
        },
      },
      required: ["return_id"],
    },
  },
  {
    name: "schedule_delivery",
    description:
      "Set or update a delivery date for an order and optionally add delivery notes.",
    input_schema: {
      type: "object" as const,
      properties: {
        order_id: {
          type: "string",
          description: "The order ID",
        },
        delivery_date: {
          type: "string",
          description: "Delivery date (ISO format)",
        },
        delivery_notes: {
          type: "string",
          description: "Optional delivery notes",
        },
      },
      required: ["order_id", "delivery_date"],
    },
  },
  {
    name: "export_supplier_data",
    description:
      "Export supplier data (customers, orders, revenue) as a summary. Professional plan required.",
    input_schema: {
      type: "object" as const,
      properties: {
        type: {
          type: "string",
          enum: ["customers", "orders", "revenue"],
          description: "Type of data to export",
        },
        time_range: {
          type: "number",
          enum: [7, 30, 90],
          description: "Number of days to include (default 30)",
        },
      },
      required: ["type"],
    },
  },
];
