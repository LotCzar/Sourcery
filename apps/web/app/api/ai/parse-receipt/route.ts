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

    // Rate limit check
    const rateLimit = await checkAiRateLimit(user.restaurant.id, "PARSE_RECEIPT", user.restaurant.planTier);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Receipt parsing rate limit exceeded",
          details: `You have used ${rateLimit.used} of ${rateLimit.limit} parse requests this month. Resets ${rateLimit.resetAt.toISOString()}.`,
          usage: { used: rateLimit.used, limit: rateLimit.limit, resetAt: rateLimit.resetAt },
        },
        { status: 429 }
      );
    }

    const contentType = request.headers.get("content-type") || "";

    let imageBase64: string;
    let mediaType: string;
    let orderId: string | null = null;

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
      orderId = (formData.get("orderId") as string) || null;

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
      orderId = body.orderId || null;

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
              text: `Extract the following information from this receipt/invoice image and return ONLY valid JSON:
{
  "supplierName": "string or null",
  "invoiceNumber": "string or null",
  "date": "YYYY-MM-DD or null",
  "lineItems": [
    { "name": "string", "quantity": number, "unit": "string or null", "unitPrice": number, "total": number }
  ],
  "subtotal": number or null,
  "tax": number or null,
  "total": number or null
}

Be precise with numbers. If a field cannot be determined, use null. For line items, extract every visible item.`,
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
    } catch {
      return NextResponse.json(
        { error: "Failed to parse receipt data from AI response" },
        { status: 422 }
      );
    }

    if (!parsed) {
      return NextResponse.json(
        { error: "Could not extract data from the image" },
        { status: 422 }
      );
    }

    // If orderId provided, reconcile against order items
    let reconciliation = null;
    if (orderId) {
      const order = await prisma.order.findFirst({
        where: {
          id: orderId,
          restaurantId: user.restaurant.id,
        },
        include: {
          items: {
            include: { product: { select: { name: true, price: true } } },
          },
        },
      });

      if (order) {
        const orderItems = order.items.map((i) => ({
          name: i.product.name,
          quantity: Number(i.quantity),
          unitPrice: Number(i.unitPrice),
          subtotal: Number(i.subtotal),
        }));

        const matches: any[] = [];
        const unmatchedReceipt: any[] = [];

        for (const lineItem of parsed.lineItems || []) {
          const match = orderItems.find(
            (oi) =>
              oi.name.toLowerCase().includes(lineItem.name?.toLowerCase() || "") ||
              lineItem.name?.toLowerCase().includes(oi.name.toLowerCase())
          );

          if (match) {
            const priceDiff =
              Math.round(((lineItem.unitPrice || 0) - match.unitPrice) * 100) /
              100;
            const qtyDiff = (lineItem.quantity || 0) - match.quantity;

            matches.push({
              receiptItem: lineItem.name,
              orderItem: match.name,
              receiptPrice: lineItem.unitPrice,
              orderPrice: match.unitPrice,
              priceDifference: priceDiff,
              receiptQty: lineItem.quantity,
              orderQty: match.quantity,
              quantityDifference: qtyDiff,
              hasDiscrepancy: Math.abs(priceDiff) > 0.01 || qtyDiff !== 0,
            });
          } else {
            unmatchedReceipt.push(lineItem);
          }
        }

        const discrepancyCount = matches.filter(
          (m) => m.hasDiscrepancy
        ).length;

        reconciliation = {
          orderNumber: order.orderNumber,
          matches,
          unmatchedReceiptItems: unmatchedReceipt,
          discrepancyCount,
          orderTotal: Number(order.total),
          receiptTotal: parsed.total,
          totalDifference:
            parsed.total != null
              ? Math.round((parsed.total - Number(order.total)) * 100) / 100
              : null,
        };
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        parsed,
        reconciliation,
      },
    });
  } catch (error: any) {
    console.error("Receipt parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse receipt" },
      { status: 500 }
    );
  }
}
