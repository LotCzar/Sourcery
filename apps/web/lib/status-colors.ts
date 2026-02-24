export const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  DRAFT: { bg: "bg-zinc-100", text: "text-zinc-600", border: "border-zinc-200" },
  PENDING: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  AWAITING_APPROVAL: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  CONFIRMED: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  SHIPPED: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  IN_TRANSIT: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  DELIVERED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  CANCELLED: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  PAID: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  OVERDUE: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  SENT: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  ACTIVE: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  INACTIVE: { bg: "bg-zinc-100", text: "text-zinc-600", border: "border-zinc-200" },
};

export const chartColors = [
  "#2F7A5E", "#4B7BE5", "#D97706", "#7C3AED", "#DB2777",
  "#0D9488", "#EA580C", "#4F46E5",
];
