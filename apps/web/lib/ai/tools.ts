import type Anthropic from "@anthropic-ai/sdk";

export const aiTools: Anthropic.Tool[] = [
  {
    name: "search_products",
    description:
      "Search for products available from suppliers. Use this to find specific ingredients, compare options, or browse by category.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search term for product name",
        },
        category: {
          type: "string",
          enum: [
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
          ],
          description: "Filter by product category",
        },
        supplier_id: {
          type: "string",
          description: "Filter by specific supplier ID",
        },
        in_stock_only: {
          type: "boolean",
          description: "Only show in-stock products",
        },
        sort_by: {
          type: "string",
          enum: ["price_asc", "price_desc", "name"],
          description: "Sort results",
        },
      },
    },
  },
  {
    name: "get_inventory",
    description:
      "Get the restaurant's current inventory items, including stock levels and par levels.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          description: "Filter by category",
        },
        low_stock_only: {
          type: "boolean",
          description: "Only show items below par level",
        },
      },
    },
  },
  {
    name: "get_order_history",
    description:
      "Get recent orders for the restaurant. Use this to check order status, find past orders, or review purchasing patterns.",
    input_schema: {
      type: "object" as const,
      properties: {
        status: {
          type: "string",
          enum: [
            "DRAFT",
            "PENDING",
            "CONFIRMED",
            "PROCESSING",
            "SHIPPED",
            "IN_TRANSIT",
            "DELIVERED",
            "CANCELLED",
            "RETURNED",
          ],
          description: "Filter by order status",
        },
        supplier_id: {
          type: "string",
          description: "Filter by supplier",
        },
        limit: {
          type: "number",
          description: "Max number of orders to return (default 10)",
        },
      },
    },
  },
  {
    name: "create_draft_order",
    description:
      "Create a new draft order. The order will NOT be submitted automatically - the user must review and submit it.",
    input_schema: {
      type: "object" as const,
      properties: {
        supplier_id: {
          type: "string",
          description: "The supplier to order from",
        },
        items: {
          type: "array",
          items: {
            type: "object",
            properties: {
              product_id: { type: "string" },
              quantity: { type: "number" },
            },
            required: ["product_id", "quantity"],
          },
          description: "List of items with product ID and quantity",
        },
        delivery_notes: {
          type: "string",
          description: "Optional delivery instructions",
        },
      },
      required: ["supplier_id", "items"],
    },
  },
  {
    name: "compare_prices",
    description:
      "Compare prices for a product across different suppliers. Helps find the best deals.",
    input_schema: {
      type: "object" as const,
      properties: {
        product_name: {
          type: "string",
          description: "Name of the product to compare",
        },
        category: {
          type: "string",
          description: "Product category to narrow search",
        },
      },
      required: ["product_name"],
    },
  },
  {
    name: "get_supplier_info",
    description:
      "Get detailed information about a supplier including their products, ratings, and delivery terms.",
    input_schema: {
      type: "object" as const,
      properties: {
        supplier_id: {
          type: "string",
          description: "Supplier ID",
        },
        supplier_name: {
          type: "string",
          description: "Supplier name to search for",
        },
      },
    },
  },
  {
    name: "create_price_alert",
    description:
      "Set up a price alert to be notified when a product's price changes.",
    input_schema: {
      type: "object" as const,
      properties: {
        product_id: {
          type: "string",
          description: "Product to monitor",
        },
        alert_type: {
          type: "string",
          enum: ["PRICE_DROP", "PRICE_INCREASE", "PRICE_THRESHOLD"],
          description: "Type of price alert",
        },
        target_price: {
          type: "number",
          description: "Target price threshold",
        },
      },
      required: ["product_id", "alert_type", "target_price"],
    },
  },
  {
    name: "adjust_inventory",
    description:
      "Adjust inventory quantity for a specific item. Use this when a user reports using, receiving, wasting, or counting inventory.",
    input_schema: {
      type: "object" as const,
      properties: {
        item_name: {
          type: "string",
          description: "Name of the inventory item (fuzzy match)",
        },
        quantity: {
          type: "number",
          description:
            "Amount to adjust. For USED/WASTE this is the amount consumed. For RECEIVED this is the amount added. For COUNT this is the new absolute quantity.",
        },
        change_type: {
          type: "string",
          enum: ["USED", "WASTE", "RECEIVED", "COUNT"],
          description:
            "Type of adjustment: USED (consumed in production), WASTE (spoiled/discarded), RECEIVED (new delivery), COUNT (physical count override)",
        },
        notes: {
          type: "string",
          description: "Optional notes about the adjustment",
        },
      },
      required: ["item_name", "quantity", "change_type"],
    },
  },
  {
    name: "get_consumption_insights",
    description:
      "Get AI-powered consumption forecasting data for inventory items. Shows average usage rates, trend direction, days until stockout, and suggested par levels based on historical usage patterns.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: [
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
          ],
          description: "Filter insights by product category",
        },
        item_name: {
          type: "string",
          description: "Filter by item name (partial match)",
        },
      },
    },
  },
  {
    name: "reorder_item",
    description:
      "Quickly reorder an item based on past order history. Creates a DRAFT order using the most recent supplier and quantity for that item.",
    input_schema: {
      type: "object" as const,
      properties: {
        item_name: {
          type: "string",
          description: "Name of the item to reorder (fuzzy match against past orders)",
        },
        quantity: {
          type: "number",
          description: "Quantity to order. Defaults to the last ordered quantity if not specified.",
        },
        supplier_name: {
          type: "string",
          description: "Preferred supplier name. Defaults to the most recent supplier for this item.",
        },
      },
      required: ["item_name"],
    },
  },
  {
    name: "get_spending_summary",
    description:
      "Get spending analysis with date range, category, and supplier filters. Shows total spend, breakdowns by category and supplier, top items, and period-over-period comparison.",
    input_schema: {
      type: "object" as const,
      properties: {
        time_range: {
          type: "string",
          enum: [
            "this_week",
            "last_week",
            "this_month",
            "last_month",
            "last_30_days",
            "last_90_days",
            "this_year",
          ],
          description: "Time period for spending analysis",
        },
        category: {
          type: "string",
          enum: [
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
          ],
          description: "Filter by product category",
        },
        supplier_name: {
          type: "string",
          description: "Filter by supplier name (fuzzy match)",
        },
      },
      required: ["time_range"],
    },
  },
  {
    name: "generate_restock_list",
    description:
      "Generate a smart restock list showing items that need reordering, grouped by supplier. Can optionally auto-create draft orders.",
    input_schema: {
      type: "object" as const,
      properties: {
        category: {
          type: "string",
          enum: [
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
          ],
          description: "Filter by product category",
        },
        include_all: {
          type: "boolean",
          description:
            "Include all items, not just those below par level (default: false)",
        },
        auto_create_orders: {
          type: "boolean",
          description:
            "Automatically create draft orders grouped by supplier (default: false)",
        },
      },
    },
  },
  {
    name: "check_invoice",
    description:
      "Check an invoice for discrepancies by comparing it against its linked order. Flags price changes, total mismatches, and overcharges.",
    input_schema: {
      type: "object" as const,
      properties: {
        invoice_id: {
          type: "string",
          description: "Invoice ID to check",
        },
        invoice_number: {
          type: "string",
          description: "Invoice number to search for (fuzzy match)",
        },
      },
    },
  },
  {
    name: "calculate_menu_cost",
    description:
      "Calculate the cost of a dish based on its ingredients and suggest a menu price based on target food cost percentage.",
    input_schema: {
      type: "object" as const,
      properties: {
        dish_name: {
          type: "string",
          description: "Name of the dish",
        },
        ingredients: {
          type: "array",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Ingredient name" },
              quantity: { type: "number", description: "Amount needed" },
              unit: { type: "string", description: "Unit of measurement" },
            },
            required: ["name", "quantity"],
          },
          description: "List of ingredients with quantities",
        },
        target_food_cost_percent: {
          type: "number",
          description:
            "Target food cost percentage for pricing (default: 30)",
        },
      },
      required: ["dish_name", "ingredients"],
    },
  },
  {
    name: "recommend_supplier",
    description:
      "Get supplier recommendations ranked by a composite score based on price, rating, lead time, and order history.",
    input_schema: {
      type: "object" as const,
      properties: {
        product_name: {
          type: "string",
          description: "Product name to find suppliers for",
        },
        category: {
          type: "string",
          enum: [
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
          ],
          description: "Product category to search",
        },
      },
    },
  },
  {
    name: "optimize_par_levels",
    description:
      "Analyze and optimize par levels based on 30+ days of consumption data. Shows which items have par levels that are too high or too low relative to actual usage patterns, lead times, and trends. Can optionally apply the suggested changes.",
    input_schema: {
      type: "object" as const,
      properties: {
        apply: {
          type: "boolean",
          description:
            "If true, apply the suggested par level changes. Default: false (preview only).",
        },
        category: {
          type: "string",
          enum: [
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
          ],
          description: "Filter by product category",
        },
      },
    },
  },
  {
    name: "analyze_waste",
    description:
      "Analyze waste patterns over a time period. Shows which items have the most waste by dollar loss, waste percentages, and suggests par level reductions for high-waste items.",
    input_schema: {
      type: "object" as const,
      properties: {
        days: {
          type: "number",
          description: "Number of days to analyze (default: 30)",
        },
        category: {
          type: "string",
          enum: [
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
          ],
          description: "Filter by product category",
        },
      },
    },
  },
  {
    name: "consolidate_orders",
    description:
      "Merge multiple DRAFT orders from the same supplier into one consolidated order, saving delivery fees.",
    input_schema: {
      type: "object" as const,
      properties: {
        order_ids: {
          type: "array",
          items: { type: "string" },
          description: "Array of DRAFT order IDs to consolidate (minimum 2)",
        },
      },
      required: ["order_ids"],
    },
  },
  {
    name: "get_supplier_performance",
    description:
      "Get on-time delivery rate, invoice accuracy, and price stability scoring for a supplier.",
    input_schema: {
      type: "object" as const,
      properties: {
        supplier_name: {
          type: "string",
          description: "Supplier name to search for (fuzzy match)",
        },
        supplier_id: {
          type: "string",
          description: "Supplier ID",
        },
      },
    },
  },
  {
    name: "get_budget_forecast",
    description:
      "Get projected monthly spending with category breakdown vs. historical average.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_disputed_invoices",
    description:
      "List invoices with DISPUTED status and their discrepancy details. Shows invoice total vs expected total based on catalog prices.",
    input_schema: {
      type: "object" as const,
      properties: {},
    },
  },
  {
    name: "get_seasonal_forecast",
    description:
      "Show seasonal demand patterns and monthly usage multipliers for inventory items. Identifies items with significantly higher or lower seasonal demand.",
    input_schema: {
      type: "object" as const,
      properties: {
        item_name: {
          type: "string",
          description: "Filter by item name (partial match)",
        },
        category: {
          type: "string",
          enum: [
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
          ],
          description: "Filter by product category",
        },
      },
    },
  },
  {
    name: "find_substitutes",
    description:
      "Find substitute products from other suppliers when an item is out of stock. Returns in-stock alternatives sorted by price.",
    input_schema: {
      type: "object" as const,
      properties: {
        product_name: {
          type: "string",
          description: "Name of the product to find substitutes for",
        },
        category: {
          type: "string",
          enum: [
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
          ],
          description: "Filter by product category",
        },
        exclude_supplier_id: {
          type: "string",
          description: "Supplier ID to exclude from results",
        },
      },
      required: ["product_name"],
    },
  },
  {
    name: "get_price_trends",
    description:
      "Analyze price history and trends for a product. Shows average, min, max, percentile, and identifies bulk-buy opportunities when prices are at historic lows.",
    input_schema: {
      type: "object" as const,
      properties: {
        product_name: {
          type: "string",
          description: "Product name to search for",
        },
        product_id: {
          type: "string",
          description: "Product ID for exact lookup",
        },
        days: {
          type: "number",
          description: "Number of days of price history to analyze (default 90)",
        },
      },
    },
  },
  {
    name: "get_benchmarks",
    description:
      "Compare your restaurant's waste rate, spend per cover, and supplier pricing against anonymized platform-wide averages or organization-wide averages.",
    input_schema: {
      type: "object" as const,
      properties: {
        metric: {
          type: "string",
          enum: ["waste_rate", "spend_per_cover", "supplier_pricing", "all"],
          description:
            "Which benchmark metric to compute (default: all)",
        },
        category: {
          type: "string",
          enum: [
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
          ],
          description: "Filter by product category",
        },
        scope: {
          type: "string",
          enum: ["platform", "organization"],
          description:
            "Benchmark scope: 'platform' compares against all restaurants, 'organization' compares against restaurants in the same org. Default: platform.",
        },
      },
    },
  },
  {
    name: "get_negotiation_brief",
    description:
      "Generate a comprehensive vendor negotiation briefing with order history, price changes, delivery performance, market alternatives, and leverage points.",
    input_schema: {
      type: "object" as const,
      properties: {
        supplier_name: {
          type: "string",
          description: "Supplier name to search for (fuzzy match)",
        },
        supplier_id: {
          type: "string",
          description: "Supplier ID",
        },
      },
    },
  },
];

// Org-admin-only tools — conditionally included for ORG_ADMIN users
export const orgTools: Anthropic.Tool[] = [
  {
    name: "compare_restaurants",
    description:
      "Compare metrics across restaurants in your organization side-by-side. Shows spend, waste, orders, and inventory metrics per restaurant with rankings.",
    input_schema: {
      type: "object" as const,
      properties: {
        restaurant_ids: {
          type: "array",
          items: { type: "string" },
          description:
            "Restaurant IDs to compare. If omitted, compares all org restaurants.",
        },
        metrics: {
          type: "array",
          items: {
            type: "string",
            enum: ["spend", "waste", "orders", "inventory"],
          },
          description:
            "Which metrics to compare (default: all). Options: spend, waste, orders, inventory.",
        },
        time_range: {
          type: "string",
          enum: [
            "this_week",
            "last_week",
            "this_month",
            "last_month",
            "last_30_days",
            "last_90_days",
          ],
          description: "Time period for comparison (default: this_month)",
        },
      },
    },
  },
  {
    name: "org_summary",
    description:
      "Get an aggregate summary of all restaurants in your organization: total spend, total orders, low-stock alerts, top suppliers, and per-restaurant breakdown.",
    input_schema: {
      type: "object" as const,
      properties: {
        time_range: {
          type: "string",
          enum: [
            "this_week",
            "last_week",
            "this_month",
            "last_month",
            "last_30_days",
            "last_90_days",
          ],
          description: "Time period for summary (default: this_month)",
        },
      },
    },
  },
];
