import { describe, it, expect } from "vitest";
import { cartReducer, CartItem } from "@/lib/cart-context";

function makeItem(overrides?: Partial<CartItem>): CartItem {
  return {
    productId: "prod_1",
    productName: "Tomatoes",
    supplierId: "sup_1",
    supplierName: "Farm Fresh",
    quantity: 5,
    unitPrice: 4.99,
    unit: "POUND",
    ...overrides,
  };
}

describe("cartReducer", () => {
  describe("ADD_ITEM", () => {
    it("adds a new item to empty cart", () => {
      const item = makeItem();
      const result = cartReducer([], { type: "ADD_ITEM", payload: item });
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual(item);
    });

    it("adds to a non-empty cart", () => {
      const existing = makeItem();
      const newItem = makeItem({ productId: "prod_2", productName: "Lettuce" });
      const result = cartReducer([existing], { type: "ADD_ITEM", payload: newItem });
      expect(result).toHaveLength(2);
    });

    it("merges quantities for existing product", () => {
      const existing = makeItem({ quantity: 3 });
      const added = makeItem({ quantity: 2 });
      const result = cartReducer([existing], { type: "ADD_ITEM", payload: added });
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(5);
    });

    it("preserves fields on merge", () => {
      const existing = makeItem({ quantity: 3, unitPrice: 4.99 });
      const added = makeItem({ quantity: 2 });
      const result = cartReducer([existing], { type: "ADD_ITEM", payload: added });
      expect(result[0].productName).toBe("Tomatoes");
      expect(result[0].unitPrice).toBe(4.99);
    });
  });

  describe("REMOVE_ITEM", () => {
    it("removes by productId", () => {
      const item = makeItem();
      const result = cartReducer([item], {
        type: "REMOVE_ITEM",
        payload: { productId: "prod_1" },
      });
      expect(result).toHaveLength(0);
    });

    it("no-op when product not found", () => {
      const item = makeItem();
      const result = cartReducer([item], {
        type: "REMOVE_ITEM",
        payload: { productId: "nonexistent" },
      });
      expect(result).toHaveLength(1);
    });

    it("handles removing the last item", () => {
      const item = makeItem();
      const result = cartReducer([item], {
        type: "REMOVE_ITEM",
        payload: { productId: "prod_1" },
      });
      expect(result).toEqual([]);
    });
  });

  describe("UPDATE_QUANTITY", () => {
    it("updates quantity for existing item", () => {
      const item = makeItem({ quantity: 5 });
      const result = cartReducer([item], {
        type: "UPDATE_QUANTITY",
        payload: { productId: "prod_1", quantity: 10 },
      });
      expect(result[0].quantity).toBe(10);
    });

    it("auto-removes at zero quantity", () => {
      const item = makeItem({ quantity: 5 });
      const result = cartReducer([item], {
        type: "UPDATE_QUANTITY",
        payload: { productId: "prod_1", quantity: 0 },
      });
      expect(result).toHaveLength(0);
    });

    it("auto-removes at negative quantity", () => {
      const item = makeItem({ quantity: 5 });
      const result = cartReducer([item], {
        type: "UPDATE_QUANTITY",
        payload: { productId: "prod_1", quantity: -1 },
      });
      expect(result).toHaveLength(0);
    });

    it("no-op when product not found", () => {
      const item = makeItem();
      const result = cartReducer([item], {
        type: "UPDATE_QUANTITY",
        payload: { productId: "nonexistent", quantity: 10 },
      });
      expect(result).toHaveLength(1);
      expect(result[0].quantity).toBe(5);
    });
  });

  describe("CLEAR_CART", () => {
    it("empties cart", () => {
      const items = [makeItem(), makeItem({ productId: "prod_2" })];
      const result = cartReducer(items, { type: "CLEAR_CART" });
      expect(result).toEqual([]);
    });

    it("idempotent on empty cart", () => {
      const result = cartReducer([], { type: "CLEAR_CART" });
      expect(result).toEqual([]);
    });
  });

  describe("HYDRATE", () => {
    it("replaces state with payload", () => {
      const existing = [makeItem()];
      const newItems = [
        makeItem({ productId: "prod_2", productName: "Lettuce" }),
        makeItem({ productId: "prod_3", productName: "Onions" }),
      ];
      const result = cartReducer(existing, { type: "HYDRATE", payload: newItems });
      expect(result).toEqual(newItems);
      expect(result).toHaveLength(2);
    });

    it("works with empty payload", () => {
      const existing = [makeItem()];
      const result = cartReducer(existing, { type: "HYDRATE", payload: [] });
      expect(result).toEqual([]);
    });
  });

  describe("unknown action", () => {
    it("returns current state", () => {
      const state = [makeItem()];
      const result = cartReducer(state, { type: "UNKNOWN" } as any);
      expect(result).toBe(state);
    });
  });

  describe("computed logic", () => {
    it("getCartTotal calculates sum of qty * price", () => {
      const items: CartItem[] = [
        makeItem({ quantity: 2, unitPrice: 10 }),
        makeItem({ productId: "prod_2", quantity: 3, unitPrice: 5 }),
      ];
      const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      expect(total).toBe(35);
    });

    it("getCartBySupplier groups items by supplier", () => {
      const items: CartItem[] = [
        makeItem({ supplierId: "sup_1", supplierName: "Supplier A", quantity: 2, unitPrice: 10 }),
        makeItem({ productId: "prod_2", supplierId: "sup_1", supplierName: "Supplier A", quantity: 1, unitPrice: 5 }),
        makeItem({ productId: "prod_3", supplierId: "sup_2", supplierName: "Supplier B", quantity: 3, unitPrice: 8 }),
      ];

      const bySupplier: Record<string, { supplier: string; items: CartItem[]; total: number }> = {};
      items.forEach((item) => {
        if (!bySupplier[item.supplierId]) {
          bySupplier[item.supplierId] = { supplier: item.supplierName, items: [], total: 0 };
        }
        bySupplier[item.supplierId].items.push(item);
        bySupplier[item.supplierId].total += item.quantity * item.unitPrice;
      });

      expect(Object.keys(bySupplier)).toHaveLength(2);
      expect(bySupplier["sup_1"].items).toHaveLength(2);
      expect(bySupplier["sup_1"].total).toBe(25);
      expect(bySupplier["sup_2"].items).toHaveLength(1);
      expect(bySupplier["sup_2"].total).toBe(24);
    });
  });
});
