import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import { checkAiRateLimit } from "@/lib/ai/rate-limit";
import { trackAiUsage } from "@/lib/ai/usage";

export const maxDuration = 60;

const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

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

    const contentType = request.headers.get("content-type") || "";

    let userContent: any[];

    if (contentType.includes("multipart/form-data")) {
      // File upload flow
      const formData = await request.formData();
      const file = formData.get("file") as File | null;
      const menuType = (formData.get("menuType") as string) || "restaurant";

      if (!file) {
        return NextResponse.json(
          { error: "No file provided" },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "File too large. Maximum size is 5MB." },
          { status: 413 }
        );
      }

      const mediaType = file.type || "image/jpeg";
      if (!ALLOWED_MIME_TYPES.includes(mediaType)) {
        return NextResponse.json(
          { error: "Invalid file type. Accepted: JPEG, PNG, GIF, WebP, PDF." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const imageBase64 = buffer.toString("base64");

      userContent = [
        mediaType === "application/pdf"
          ? {
              type: "document" as const,
              source: {
                type: "base64" as const,
                media_type: "application/pdf" as const,
                data: imageBase64,
              },
            }
          : {
              type: "image" as const,
              source: {
                type: "base64" as const,
                media_type: mediaType as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
                data: imageBase64,
              },
            },
        {
          type: "text",
          text: `Please analyze this ${menuType} menu image and extract all ingredients. Return ONLY the JSON object, no markdown fences or extra text.`,
        },
      ];
    } else {
      // Text-only flow (existing behavior)
      const body = await request.json();
      const menuText = body.menuText;
      const menuType = body.menuType || "restaurant";

      if (!menuText || typeof menuText !== "string" || !menuText.trim()) {
        return NextResponse.json(
          { error: "menuText is required" },
          { status: 400 }
        );
      }

      userContent = [
        {
          type: "text",
          text: `Please analyze this ${menuType} menu and extract all ingredients. Return ONLY the JSON object, no markdown fences or extra text.\n\n<user_menu_text>\n${menuText}\n</user_menu_text>`,
        },
      ];
    }

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 16384,
      messages: [
        {
          role: "user",
          content: userContent,
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
