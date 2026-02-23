/**
 * Token pricing for Claude Sonnet (per million tokens).
 */
export const TOKEN_PRICING = {
  inputPerMillion: 3.0,
  outputPerMillion: 15.0,
  cacheReadPerMillion: 0.3,
  cacheWritePerMillion: 3.75,
} as const;

interface TokenCounts {
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  cacheWriteTokens: number;
}

/**
 * Calculates the estimated dollar cost for a set of token counts.
 */
export function calculateCost(tokens: TokenCounts): number {
  const cost =
    (tokens.inputTokens / 1_000_000) * TOKEN_PRICING.inputPerMillion +
    (tokens.outputTokens / 1_000_000) * TOKEN_PRICING.outputPerMillion +
    (tokens.cacheReadTokens / 1_000_000) * TOKEN_PRICING.cacheReadPerMillion +
    (tokens.cacheWriteTokens / 1_000_000) * TOKEN_PRICING.cacheWritePerMillion;

  return Math.round(cost * 1_000_000) / 1_000_000; // avoid floating-point noise
}
