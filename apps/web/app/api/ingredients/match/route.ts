import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validations/validate";
import { MatchIngredientsSchema } from "@/lib/validations";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const validation = validateBody(MatchIngredientsSchema, body);
    if (!validation.success) return validation.response;

    const { ingredients } = validation.data;

    // Get all supplier products with their suppliers
    const supplierProducts = await prisma.supplierProduct.findMany({
      where: {
        inStock: true,
      },
      include: {
        supplier: {
          select: {
            id: true,
            name: true,
            rating: true,
            minimumOrder: true,
            deliveryFee: true,
            leadTimeDays: true,
          },
        },
      },
    });

    // Match each ingredient to potential products
    const matchedIngredients = ingredients.map((ingredient) => {
      const ingredientName = ingredient.name.toLowerCase();
      const ingredientWords = ingredientName.split(/\s+/);

      // Score each product based on name similarity
      const scoredProducts = supplierProducts
        .map((product) => {
          const productName = product.name.toLowerCase();
          const productWords = productName.split(/\s+/);

          // Calculate match score
          let score = 0;

          // Exact match
          if (productName === ingredientName) {
            score = 100;
          }
          // Product contains ingredient name
          else if (productName.includes(ingredientName)) {
            score = 80;
          }
          // Ingredient contains product name
          else if (ingredientName.includes(productName)) {
            score = 70;
          }
          // Word matching
          else {
            const matchingWords = ingredientWords.filter((word) =>
              productWords.some(
                (pw) => pw.includes(word) || word.includes(pw)
              )
            );
            score = (matchingWords.length / ingredientWords.length) * 60;
          }

          // Boost score if categories match
          if (
            product.category === ingredient.category ||
            product.category === ingredient.category.toUpperCase()
          ) {
            score += 10;
          }

          return {
            product: {
              id: product.id,
              name: product.name,
              price: product.price,
              unit: product.unit,
              category: product.category,
            },
            supplier: product.supplier,
            score,
          };
        })
        .filter((p) => p.score > 20) // Only include reasonable matches
        .sort((a, b) => {
          // Sort by score first, then by price
          if (b.score !== a.score) return b.score - a.score;
          return Number(a.product.price) - Number(b.product.price);
        })
        .slice(0, 5); // Top 5 matches per ingredient

      return {
        ingredient: {
          name: ingredient.name,
          category: ingredient.category,
          estimatedQuantity: ingredient.estimatedQuantity,
          unit: ingredient.unit,
        },
        matches: scoredProducts,
        bestMatch: scoredProducts[0] || null,
      };
    });

    // Calculate summary
    const matchedCount = matchedIngredients.filter(
      (i) => i.matches.length > 0
    ).length;
    const unmatchedCount = matchedIngredients.filter(
      (i) => i.matches.length === 0
    ).length;

    // Get unique suppliers from matches
    const uniqueSuppliers = new Map();
    matchedIngredients.forEach((item) => {
      item.matches.forEach((match) => {
        if (!uniqueSuppliers.has(match.supplier.id)) {
          uniqueSuppliers.set(match.supplier.id, match.supplier);
        }
      });
    });

    return NextResponse.json({
      success: true,
      data: {
        ingredients: matchedIngredients,
        summary: {
          total: ingredients.length,
          matched: matchedCount,
          unmatched: unmatchedCount,
          suppliersFound: uniqueSuppliers.size,
        },
        suppliers: Array.from(uniqueSuppliers.values()),
      },
    });
  } catch (error: any) {
    console.error("Ingredient matching error:", error);
    return NextResponse.json(
      {
        error: "Failed to match ingredients",
      },
      { status: 500 }
    );
  }
}
