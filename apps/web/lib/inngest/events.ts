export type FreshSheetEvents = {
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
  "inventory/analysis.scheduled": {
    data: Record<string, never>;
  };
  "pos/sync.requested": {
    data: {
      integrationId: string;
      restaurantId: string;
      provider: string;
    };
  };
  "ordering/autopilot.scheduled": { data: Record<string, never> };
  "invoice/reminders.scheduled": { data: Record<string, never> };
  "digest/weekly.scheduled": { data: Record<string, never> };
};
