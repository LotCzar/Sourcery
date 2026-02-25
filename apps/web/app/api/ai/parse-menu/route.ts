import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import { ParseMenuSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";
import { checkAiRateLimit } from "@/lib/ai/rate-limit";
import { trackAiUsage } from "@/lib/ai/usage";

export async function POST(request: Request) {
  try {
    const anthropic = getAnthropicClient();

    if (!anthropic) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }
    const { userId: clerkId } = await auth();

    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { restaurant: { select: { id: true, planTier: true } } },
    });

    if (!user?.restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    if (!["OWNER", "MANAGER"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    // Rate limit check
    const rateLimit = await checkAiRateLimit(user.restaurant.id, "PARSE_MENU", user.restaurant.planTier);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Menu parsing rate limit exceeded",
          details: `You have used ${rateLimit.used} of ${rateLimit.limit} parse requests this month. Resets ${rateLimit.resetAt.toISOString()}.`,
          usage: { used: rateLimit.used, limit: rateLimit.limit, resetAt: rateLimit.resetAt },
        },
        { status: 429 }
      );
    }

    const body = await request.json();
    const validation = validateBody(ParseMenuSchema, body);
    if (!validation.success) return validation.response;
    const { menuText, menuType } = validation.data;

    const systemPrompt = `You are an expert culinary analyst. Your task is to analyze restaurant menus and extract all ingredients that would need to be sourced from suppliers.

For each menu item, identify:
1. The dish name
2. All ingredients (both explicitly mentioned and commonly implied)
3. Estimated quantity needed per serving
4. The category (produce, meat, seafood, dairy, dry goods, etc.)

Return your analysis as a JSON object with this structure:
{
  "menuItems": [
    {
      "name": "Dish Name",
      "description": "Brief description",
      "ingredients": [
        {
          "name": "Ingredient Name",
          "category": "PRODUCE|MEAT|SEAFOOD|DAIRY|BAKERY|BEVERAGES|DRY_GOODS|FROZEN|OTHER",
          "estimatedQuantity": "amount per serving",
          "unit": "POUND|OUNCE|EACH|BUNCH|etc",
          "notes": "any special notes"
        }
      ]
    }
  ],
  "summary": {
    "totalDishes": number,
    "totalIngredients": number,
    "categories": {
      "PRODUCE": number,
      "MEAT": number,
      // etc
    }
  }
}

Be thorough - include cooking oils, seasonings, garnishes, and all components.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16384,
      messages: [
        {
          role: "user",
          content: `Please analyze this ${menuType || "restaurant"} menu and extract all ingredients. Return ONLY the JSON object, no markdown fences or extra text.\n\n<user_menu_text>\n${menuText}\n</user_menu_text>`,
        },
      ],
      system: systemPrompt,
    });

    // Track usage
    void trackAiUsage({
      feature: "PARSE_MENU",
      restaurantId: user.restaurant.id,
      userId: user.id,
      inputTokens: message.usage.input_tokens,
      outputTokens: message.usage.output_tokens,
      model: message.model,
    });

    // Extract the text content from the response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Try to parse the JSON from the response
    let parsedResult;
    try {
      // Strip markdown code fences if present
      let cleaned = responseText.trim();
      const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
      if (fenceMatch) {
        cleaned = fenceMatch[1].trim();
      }

      // Find the outermost JSON object
      const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Menu parse JSON extraction failed:", parseError, "Response:", responseText.slice(0, 500));
      // If parsing fails, return the raw text
      return NextResponse.json({
        success: true,
        rawResponse: responseText,
        parsed: false,
      });
    }

    // Validate AI output has expected shape
    if (!parsedResult || typeof parsedResult !== "object" || !Array.isArray(parsedResult.menuItems)) {
      console.error("Menu parse validation failed. Keys:", Object.keys(parsedResult || {}));
      return NextResponse.json({
        success: true,
        rawResponse: responseText,
        parsed: false,
      });
    }

    return NextResponse.json({
      success: true,
      data: parsedResult,
      parsed: true,
    });
  } catch (error: any) {
    console.error("Menu parsing error:", error);

    return NextResponse.json(
      {
        error: "Failed to parse menu",
      },
      { status: 500 }
    );
  }
}
