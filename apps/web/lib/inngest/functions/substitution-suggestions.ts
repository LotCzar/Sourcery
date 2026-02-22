import { inngest } from "../client";
import prisma from "@/lib/prisma";

export const substitutionSuggestions = inngest.createFunction(
  { id: "substitution-suggestions", name: "Smart Substitution Suggestions" },
  { cron: "0 10 * * *" }, // Daily 10 AM
  async () => {
    const restaurants = await prisma.restaurant.findMany({
      select: { id: true, name: true },
    });

    let totalSubstitutions = 0;
    let totalNotifications = 0;

    for (const restaurant of restaurants) {
      const ownerUser = await prisma.user.findFirst({
        where: { restaurantId: restaurant.id, role: "OWNER" },
      });

      if (!ownerUser) continue;

      // Find inventory items linked to out-of-stock supplier products
      const outOfStockItems = await prisma.inventoryItem.findMany({
        where: {
          restaurantId: restaurant.id,
          supplierProduct: {
            inStock: false,
          },
        },
        include: {
          supplierProduct: {
            include: { supplier: { select: { id: true, name: true } } },
          },
        },
      });

      if (outOfStockItems.length === 0) continue;

      const substitutions: Array<{
        itemName: string;
        outOfStockSupplier: string;
        outOfStockPrice: number;
        alternatives: Array<{
          name: string;
          supplier: string;
          price: number;
          unit: string;
        }>;
      }> = [];

      for (const item of outOfStockItems) {
        if (!item.supplierProduct) continue;

        // Search for alternatives: same category, similar name (first word), in stock, different supplier
        const firstWord = item.name.split(" ")[0];

        const alternatives = await prisma.supplierProduct.findMany({
          where: {
            category: item.supplierProduct.category,
            name: { contains: firstWord, mode: "insensitive" },
            inStock: true,
            supplierId: { not: item.supplierProduct.supplierId },
          },
          include: {
            supplier: { select: { name: true } },
          },
          orderBy: { price: "asc" },
          take: 5,
        });

        if (alternatives.length > 0) {
          substitutions.push({
            itemName: item.name,
            outOfStockSupplier: item.supplierProduct.supplier.name,
            outOfStockPrice: Number(item.supplierProduct.price),
            alternatives: alternatives.map((alt) => ({
              name: alt.name,
              supplier: alt.supplier.name,
              price: Number(alt.price),
              unit: alt.unit,
            })),
          });
          totalSubstitutions++;
        }
      }

      if (substitutions.length > 0) {
        await prisma.notification.create({
          data: {
            type: "SYSTEM",
            title: "Substitution Suggestions Available",
            message: `${substitutions.length} out-of-stock item(s) have available alternatives from other suppliers. Ask the AI to 'find substitutes' for details.`,
            userId: ownerUser.id,
            metadata: {
              substitutions,
              actionUrl: "/inventory",
            },
          },
        });
        totalNotifications++;
      }
    }

    return {
      restaurantsProcessed: restaurants.length,
      substitutionsFound: totalSubstitutions,
      notificationsSent: totalNotifications,
    };
  }
);
