export type SourceryEvents = {
  "order/status.changed": {
    data: {
      orderId: string;
      previousStatus: string;
      newStatus: string;
      restaurantId: string;
      supplierId: string;
    };
  };
  "order/delivered": {
    data: {
      orderId: string;
      restaurantId: string;
      supplierId: string;
    };
  };
  "inventory/below.par": {
    data: {
      inventoryItemId: string;
      restaurantId: string;
      itemName: string;
      currentQuantity: number;
      parLevel: number;
    };
  };
  "price/check.scheduled": {
    data: Record<string, never>;
  };
};
