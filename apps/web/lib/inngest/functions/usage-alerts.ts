import { inngest } from "../client";
import prisma from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";
import {
  PLAN_LIMITS,
  FEATURE_GROUPS,
  getPeriodStart,
} from "@/lib/ai/plan-config";
import type { PlanTier } from "@prisma/client";

const ALERT_THRESHOLD = 0.8; // 80%

const BUCKET_LABELS: Record<string, string> = {
  chatOpsPerMonth: "AI Chat",
  parseOpsPerMonth: "Document Parsing",
  searchOpsPerMonth: "AI Search",
};

export const usageAlerts = inngest.createFunction(
  { id: "usage-alerts", name: "Daily AI Usage Alerts" },
  { cron: "0 7 * * *" },
  async () => {
    const periodStart = getPeriodStart();

    const restaurants = await prisma.restaurant.findMany({
      where: { planTier: { not: "ENTERPRISE" } },
      select: { id: true, name: true, planTier: true },
    });

    let restaurantsChecked = 0;
    let alertsSent = 0;

    for (const restaurant of restaurants) {
      restaurantsChecked++;

      const ownerUser = await prisma.user.findFirst({
        where: { restaurantId: restaurant.id, role: "OWNER" },
      });

      if (!ownerUser) continue;

      const limits = PLAN_LIMITS[restaurant.planTier as PlanTier];

      for (const [bucketKey, features] of Object.entries(FEATURE_GROUPS)) {
        const limit = limits[bucketKey as keyof typeof limits];
        if (!limit || limit === Infinity) continue;

        const usageCount = await prisma.aiUsageLog.count({
          where: {
            restaurantId: restaurant.id,
            feature: { in: features },
            periodStart,
          },
        });

        const usagePercent = Math.round((usageCount / limit) * 100);

        if (usagePercent < ALERT_THRESHOLD * 100) continue;

        // Deduplicate: check for existing alert this period
        const existing = await prisma.notification.findMany({
          where: {
            userId: ownerUser.id,
            type: "SYSTEM",
            createdAt: { gte: periodStart },
          },
        });

        const alreadyAlerted = existing.some((n) => {
          const meta = n.metadata as Record<string, unknown> | null;
          return (
            meta?.alertType === "usage_limit" &&
            meta?.featureBucket === bucketKey
          );
        });

        if (alreadyAlerted) continue;

        const featureLabel = BUCKET_LABELS[bucketKey] || bucketKey;

        await prisma.notification.create({
          data: {
            type: "SYSTEM",
            title: `${featureLabel} usage at ${usagePercent}%`,
            message: `Your restaurant has used ${usageCount} of ${limit} ${featureLabel.toLowerCase()} operations this month (${usagePercent}%).`,
            userId: ownerUser.id,
            metadata: {
              alertType: "usage_limit",
              featureBucket: bucketKey,
              usagePercent,
              used: usageCount,
              limit,
              restaurantId: restaurant.id,
              actionUrl: "/settings",
            },
          },
        });

        if (ownerUser.email) {
          const template = emailTemplates.usageAlert(
            restaurant.name,
            featureLabel,
            usageCount,
            limit,
            usagePercent
          );
          await sendEmail({
            to: ownerUser.email,
            subject: template.subject,
            html: template.html,
          });
        }

        alertsSent++;
      }
    }

    return { restaurantsChecked, alertsSent };
  }
);
