import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";
import { checkAiRateLimit } from "@/lib/ai/rate-limit";
import { trackAiUsage } from "@/lib/ai/usage";

export const maxDuration = 60;

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
      include: { restaurant: { select: { id: true, name: true, planTier: true } } },
    });

    if (!user?.restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    // Rate limit check (shares PARSE_RECEIPT bucket)
    const rateLimit = await checkAiRateLimit(user.restaurant.id, "PARSE_RECEIPT", user.restaurant.planTier);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Document parsing rate limit exceeded",
          details: `You have used ${rateLimit.used} of ${rateLimit.limit} parse requests this month. Resets ${rateLimit.resetAt.toISOString()}.`,
          usage: { used: rateLimit.used, limit: rateLimit.limit, resetAt: rateLimit.resetAt },
        },
        { status: 429 }
      );
    }

    const contentType = request.headers.get("content-type") || "";

    let imageBase64: string;
    let mediaType: string;

    const ALLOWED_MIME_TYPES = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];
    const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

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

      mediaType = file.type || "image/jpeg";
      if (!ALLOWED_MIME_TYPES.includes(mediaType)) {
        return NextResponse.json(
          { error: "Invalid file type. Accepted: JPEG, PNG, GIF, WebP, PDF." },
          { status: 400 }
        );
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      imageBase64 = buffer.toString("base64");
    } else {
      const body = await request.json();
      imageBase64 = body.image;
      mediaType = body.mediaType || "image/jpeg";

      if (!imageBase64) {
        return NextResponse.json(
          { error: "No image provided" },
          { status: 400 }
        );
      }

      if (!ALLOWED_MIME_TYPES.includes(mediaType)) {
        return NextResponse.json(
          { error: "Invalid media type. Accepted: JPEG, PNG, GIF, WebP, PDF." },
          { status: 400 }
        );
      }

      // Check base64 payload size (~4/3 ratio of original)
      const estimatedSize = Math.ceil(imageBase64.length * 0.75);
      if (estimatedSize > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: "Image too large. Maximum size is 5MB." },
          { status: 413 }
        );
      }
    }

    // Send to Claude vision for parsing
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: [
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
              text: `Extract inventory items from this document (delivery slip, packing list, inventory count sheet, or similar) and return ONLY valid JSON:
{
  "items": [
    {
      "name": "string",
      "category": "PRODUCE|MEAT|SEAFOOD|DAIRY|BAKERY|BEVERAGES|DRY_GOODS|FROZEN|CLEANING|EQUIPMENT|OTHER",
      "quantity": 0,
      "unit": "POUND|OUNCE|KILOGRAM|GRAM|GALLON|LITER|QUART|PINT|EACH|CASE|DOZEN|BOX|BAG|BUNCH",
      "costPerUnit": 0,
      "location": "string or null"
    }
  ],
  "documentType": "string (e.g. delivery slip, packing list, inventory count)",
  "date": "YYYY-MM-DD or null",
  "supplierName": "string or null"
}

Rules:
- Extract every visible item from the document.
- For category, pick the best match from the allowed values based on the item name.
- For unit, pick the best match from the allowed values. If the document uses abbreviations (lb, oz, ea, cs, dz, etc.), map them to the full enum value.
- If cost/price per unit is not visible, use 0.
- If quantity is not visible, use 1.
- Be precise with numbers.
- If a field cannot be determined, use null.`,
            },
          ],
        },
      ],
    });

    // Track usage
    void trackAiUsage({
      feature: "PARSE_RECEIPT",
      restaurantId: user.restaurant.id,
      userId: user.id,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      model: response.model,
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON (handle markdown code block wrapping)
    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (parseError) {
      console.error("Inventory JSON parse failed:", parseError, "Response text:", text.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to parse inventory data from AI response" },
        { status: 422 }
      );
    }

    if (!parsed) {
      return NextResponse.json(
        { error: "Could not extract data from the document" },
        { status: 422 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        parsed,
      },
    });
  } catch (error: any) {
    console.error("Inventory parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse inventory document" },
      { status: 500 }
    );
  }
}
