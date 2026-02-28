import { inngest } from "../client";
import prisma from "@/lib/prisma";

export const supplierQualityTrends = inngest.createFunction(
  { id: "supplier-quality-trends", name: "Supplier Quality Trend Monitor" },
  { cron: "0 8 * * 3" }, // Wednesday 8 AM
  async () => {
    try {
      const suppliers = await prisma.supplier.findMany({
        where: { status: "VERIFIED" },
        select: { id: true, name: true },
      });

      let insightsCreated = 0;

      for (const supplier of suppliers) {
        const now = new Date();
        const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        // Get return requests for last 90 days
        const returns = await prisma.returnRequest.findMany({
          where: {
            order: { supplierId: supplier.id },
            createdAt: { gte: ninetyDaysAgo },
          },
          select: {
            id: true,
            type: true,
            status: true,
            items: true,
            creditAmount: true,
            createdAt: true,
          },
        });

        if (returns.length === 0) continue;

        // Get total units sold per product in last 90 days
        const orderItems = await prisma.orderItem.findMany({
          where: {
            order: {
              supplierId: supplier.id,
              status: { not: "CANCELLED" },
              createdAt: { gte: ninetyDaysAgo },
            },
          },
          select: {
            productId: true,
            quantity: true,
            product: { select: { name: true, category: true } },
            order: { select: { createdAt: true } },
          },
        });

        // Aggregate return data by product
        const productReturns: Record<
          string,
          {
            name: string;
            returnCount: number;
            recent30Returns: number;
            older60Returns: number;
            types: Record<string, number>;
            totalCredited: number;
          }
        > = {};

        for (const ret of returns) {
          const items = (ret.items as any[]) || [];
          const isRecent = ret.createdAt >= thirtyDaysAgo;

          for (const item of items) {
            const pid = item.productId || "unknown";
            if (!productReturns[pid]) {
              productReturns[pid] = {
                name: item.productName || "Unknown",
                returnCount: 0,
                recent30Returns: 0,
                older60Returns: 0,
                types: {},
                totalCredited: 0,
              };
            }
            productReturns[pid].returnCount++;
            if (isRecent) {
              productReturns[pid].recent30Returns++;
            } else {
              productReturns[pid].older60Returns++;
            }
            productReturns[pid].types[ret.type] =
              (productReturns[pid].types[ret.type] || 0) + 1;
            if (ret.creditAmount) {
              productReturns[pid].totalCredited += Number(ret.creditAmount);
            }
          }
        }

        // Calculate units sold per product
        const productSold: Record<string, { total: number; name: string; category: string }> = {};
        for (const item of orderItems) {
          if (!productSold[item.productId]) {
            productSold[item.productId] = {
              total: 0,
              name: item.product.name,
              category: item.product.category,
            };
          }
          productSold[item.productId].total += Number(item.quantity);
        }

        // Calculate return rates and flag rising quality issues
        const flaggedProducts: any[] = [];

        for (const [productId, retData] of Object.entries(productReturns)) {
          const sold = productSold[productId]?.total || 0;
          const returnRate = sold > 0 ? (retData.returnCount / sold) * 100 : 0;

          // Compare current 30-day rate vs previous 60-day rate
          const recent30Rate = sold > 0 ? (retData.recent30Returns / (sold / 3)) * 100 : 0;
          const older60Rate = sold > 0 ? (retData.older60Returns / ((sold * 2) / 3)) * 100 : 0;

          const rateIncrease = older60Rate > 0
            ? ((recent30Rate - older60Rate) / older60Rate) * 100
            : 0;

          // Flag if rising rate (>50% increase) or absolute rate > 5%
          if (rateIncrease > 50 || returnRate > 5) {
            flaggedProducts.push({
              productId,
              name: retData.name,
              category: productSold[productId]?.category || "Unknown",
              totalReturns: retData.returnCount,
              unitsSold: Math.round(sold),
              returnRate: Math.round(returnRate * 10) / 10,
              recent30Rate: Math.round(recent30Rate * 10) / 10,
              older60Rate: Math.round(older60Rate * 10) / 10,
              rateIncreasePercent: Math.round(rateIncrease),
              types: retData.types,
              totalCredited: Math.round(retData.totalCredited * 100) / 100,
            });
          }
        }

        // Overall stats
        const totalReturns = returns.length;
        const totalCredited = returns.reduce(
          (sum, r) => sum + (r.creditAmount ? Number(r.creditAmount) : 0),
          0
        );
        const returnsByType: Record<string, number> = {};
        for (const ret of returns) {
          returnsByType[ret.type] = (returnsByType[ret.type] || 0) + 1;
        }

        const summary = flaggedProducts.length > 0
          ? `Quality alert: ${flaggedProducts.length} product${flaggedProducts.length !== 1 ? "s" : ""} have rising return rates. Total returns (90 days): ${totalReturns}, credits issued: $${Math.round(totalCredited)}. Top issue: ${flaggedProducts[0].name} at ${flaggedProducts[0].returnRate}% return rate.`
          : `Quality stable: ${totalReturns} returns in 90 days, $${Math.round(totalCredited)} in credits. No rising quality trends detected.`;

        // Expire old insights
        await prisma.supplierInsight.updateMany({
          where: {
            supplierId: supplier.id,
            type: "QUALITY_TREND",
            status: "ACTIVE",
          },
          data: { status: "DISMISSED" },
        });

        await prisma.supplierInsight.create({
          data: {
            supplierId: supplier.id,
            type: "QUALITY_TREND",
            title: "Quality Trend Report",
            summary,
            data: {
              totalReturns,
              totalCredited: Math.round(totalCredited * 100) / 100,
              returnsByType,
              flaggedProducts,
            },
            expiresAt: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000), // 8 days
          },
        });

        // Only notify if rising quality issues found
        if (flaggedProducts.length > 0) {
          const users = await prisma.user.findMany({
            where: { supplierId: supplier.id },
            select: { id: true },
          });
          for (const user of users) {
            await prisma.notification.create({
              data: {
                type: "SYSTEM",
                title: "Quality Alert",
                message: `Quality alert: ${flaggedProducts.length} product${flaggedProducts.length !== 1 ? "s" : ""} have rising return rates`,
                userId: user.id,
                metadata: {
                  actionUrl: "/supplier/insights",
                  action: "view_insights",
                },
              },
            });
          }
        }

        insightsCreated++;
      }

      return { suppliersProcessed: suppliers.length, insightsCreated };
    } catch (err) {
      console.error("[supplier-quality-trends] failed:", err);
      throw err;
    }
  }
);
