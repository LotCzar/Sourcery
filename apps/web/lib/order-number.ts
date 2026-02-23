import crypto from "crypto";

/**
 * Generate a collision-safe order number.
 * Format: ORD-{timestamp_base36}-{random_hex}
 * Uses crypto.randomBytes for stronger randomness than Math.random().
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `ORD-${timestamp}-${random}`;
}
