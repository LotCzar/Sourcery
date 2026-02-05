import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY) {
    return null;
  }
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

export async function POST(request: Request) {
  try {
    const anthropic = getAnthropicClient();

    if (!anthropic) {
      return NextResponse.json(
        { error: "AI service not configured" },
        { status: 503 }
      );
    }
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { menuText, menuType } = await request.json();

    if (!menuText) {
      return NextResponse.json(
        { error: "Menu text is required" },
        { status: 400 }
      );
    }

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
      model: "claude-sonnet-4-20250514",
      max_tokens: 16384,
      messages: [
        {
          role: "user",
          content: `Please analyze this ${menuType || "restaurant"} menu and extract all ingredients:\n\n${menuText}`,
        },
      ],
      system: systemPrompt,
    });

    // Extract the text content from the response
    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Try to parse the JSON from the response
    let parsedResult;
    try {
      // Find JSON in the response (it might be wrapped in markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResult = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      // If parsing fails, return the raw text
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
    console.error("Error details:", {
      message: error?.message,
      status: error?.status,
      type: error?.type,
    });

    // Return more detailed error for debugging
    const errorDetails = {
      message: error?.message || "Unknown error",
      type: error?.type || error?.name || "UnknownError",
      status: error?.status,
    };

    return NextResponse.json(
      {
        error: "Failed to parse menu",
        details: errorDetails,
      },
      { status: 500 }
    );
  }
}
