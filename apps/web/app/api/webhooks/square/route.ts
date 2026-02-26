import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import prisma from "@/lib/prisma";
import { inngest } from "@/lib/inngest/client";

function verifySignature(
  body: string,
  signatureHeader: string | null,
  webhookUrl: string
): boolean {
  const signatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
  if (!signatureKey || !signatureHeader) return false;

  const payload = webhookUrl + body;
  const hmac = crypto
    .createHmac("sha256", signatureKey)
    .update(payload)
    .digest("base64");

  return hmac === signatureHeader;
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("x-square-hmacsha256-signature");
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/webhooks/square`;

  if (!verifySignature(body, signature, webhookUrl)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: any;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = event.type;
  const merchantId = event.merchant_id;

  if (eventType === "catalog.version.updated" && merchantId) {
    // Find the integration by merchantId
    const integration = await prisma.pOSIntegration.findFirst({
      where: {
        merchantId,
        provider: "SQUARE",
        isActive: true,
      },
    });

    if (integration) {
      await inngest.send({
        name: "pos/sync.requested",
        data: {
          integrationId: integration.id,
          restaurantId: integration.restaurantId,
          provider: "SQUARE",
        },
      });
    }
  }

  // Return 200 immediately — processing is async via Inngest
  return NextResponse.json({ received: true });
}
