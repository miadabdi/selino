export const STOCK_REASONS = [
  "restock",
  "sale",
  "cancellation",
  "adjustment",
  "reservation_expired",
] as const;

export type StockReason = (typeof STOCK_REASONS)[number];
