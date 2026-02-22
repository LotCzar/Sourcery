export type TourStepPlacement = "top" | "bottom" | "left" | "right";

export interface TourStep {
  id: string;
  target: string;
  title: string;
  description: string;
  placement: TourStepPlacement;
}

export const restaurantTourSteps: TourStep[] = [
  {
    id: "dashboard-stats",
    target: '[data-tour="dashboard-stats"]',
    title: "Your Key Metrics",
    description:
      "Track your monthly spending, total orders, active suppliers, and potential savings all at a glance.",
    placement: "bottom",
  },
  {
    id: "ai-briefing",
    target: '[data-tour="ai-briefing"]',
    title: "AI Daily Briefing",
    description:
      "Every day, FreshSheet's AI summarizes low stock items, overdue invoices, and critical alerts so you know exactly what needs attention.",
    placement: "bottom",
  },
  {
    id: "quick-actions",
    target: '[data-tour="quick-actions"]',
    title: "Quick Actions",
    description:
      "Jump straight into parsing menus, browsing products, managing suppliers, or viewing orders with one click.",
    placement: "bottom",
  },
  {
    id: "ai-chat-button",
    target: '[data-tour="ai-chat-button"]',
    title: "AI Assistant",
    description:
      'Your AI-powered assistant can answer questions, look up orders, check inventory, and more. Try asking "What\'s running low?"',
    placement: "bottom",
  },
  {
    id: "notifications-button",
    target: '[data-tour="notifications-button"]',
    title: "Notifications",
    description:
      "Stay on top of order updates, price alerts, delivery changes, and system notifications in real-time.",
    placement: "bottom",
  },
  {
    id: "cart-button",
    target: '[data-tour="cart-button"]',
    title: "Shopping Cart",
    description:
      "Add products from any supplier and check out when you're ready. Your cart persists across sessions.",
    placement: "bottom",
  },
  {
    id: "global-search",
    target: '[data-tour="global-search"]',
    title: "Global Search",
    description:
      "Quickly find products, suppliers, orders, or anything else across the entire platform.",
    placement: "bottom",
  },
  {
    id: "sidebar-nav",
    target: '[data-tour="sidebar-nav"]',
    title: "Navigation",
    description:
      "Access all sections of your dashboard from here — orders, invoices, inventory, reports, and more.",
    placement: "right",
  },
  {
    id: "sidebar-menu-parser",
    target: '[data-tour="sidebar-menu-parser"]',
    title: "Menu Parser",
    description:
      "Upload your menu and let AI extract ingredients, match them to supplier products, and create orders automatically.",
    placement: "right",
  },
  {
    id: "sidebar-price-alerts",
    target: '[data-tour="sidebar-price-alerts"]',
    title: "Price Alerts",
    description:
      "Set price alerts on products you buy regularly. Get notified when prices drop or spike so you never overpay.",
    placement: "right",
  },
  {
    id: "sidebar-settings",
    target: '[data-tour="sidebar-settings"]',
    title: "Settings",
    description:
      "Manage your profile, restaurant info, notification preferences, and integrations. You can restart this tour anytime from here!",
    placement: "right",
  },
];

export const supplierTourSteps: TourStep[] = [
  {
    id: "supplier-dashboard-stats",
    target: '[data-tour="supplier-dashboard-stats"]',
    title: "Your Performance",
    description:
      "See your revenue, delivery stats, and active product count at a glance.",
    placement: "bottom",
  },
  {
    id: "supplier-quick-actions",
    target: '[data-tour="supplier-quick-actions"]',
    title: "Quick Actions",
    description:
      "Quickly jump to pending orders, shipments in transit, and your product catalog.",
    placement: "bottom",
  },
  {
    id: "supplier-sidebar-orders",
    target: '[data-tour="supplier-sidebar-orders"]',
    title: "Order Management",
    description:
      "View and manage incoming orders from restaurants. Confirm, ship, and track deliveries all in one place.",
    placement: "right",
  },
  {
    id: "supplier-sidebar-products",
    target: '[data-tour="supplier-sidebar-products"]',
    title: "Product Catalog",
    description:
      "Add, edit, and manage your product listings. Update prices, stock levels, and product details.",
    placement: "right",
  },
  {
    id: "supplier-sidebar-settings",
    target: '[data-tour="supplier-sidebar-settings"]',
    title: "Settings",
    description:
      "Update your business info, delivery zones, and preferences. You can restart this tour anytime from here!",
    placement: "right",
  },
];
