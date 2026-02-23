import type { AiFeature } from "@prisma/client";
import prisma from "@/lib/prisma";
import { getPeriodStart } from "./plan-config";

interface TrackAiUsagePayload {
  feature: AiFeature;
  restaurantId: string;
  userId: string | null;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  model: string;
  durationMs?: number;
}

/**
 * Fire-and-forget usage tracking. Never throws — errors are logged and swallowed.
 * Callers should use `void trackAiUsage(...)` to avoid unhandled rejection warnings.
 */
export async function trackAiUsage(payload: TrackAiUsagePayload): Promise<void> {
  try {
    await prisma.aiUsageLog.create({
      data: {
        feature: payload.feature,
        restaurantId: payload.restaurantId,
        userId: payload.userId,
        inputTokens: payload.inputTokens,
        outputTokens: payload.outputTokens,
        cacheReadTokens: payload.cacheReadTokens ?? 0,
        cacheWriteTokens: payload.cacheWriteTokens ?? 0,
        model: payload.model,
        durationMs: payload.durationMs ?? null,
        periodStart: getPeriodStart(),
      },
    });
  } catch (error) {
    console.error("Failed to track AI usage:", error);
  }
}
