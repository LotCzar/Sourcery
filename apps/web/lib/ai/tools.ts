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
];
