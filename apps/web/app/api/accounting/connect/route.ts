import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { cookies } from "next/headers";

// GET - Initiate OAuth flow for accounting provider
export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { restaurant: true },
    });

    if (!user?.restaurant) {
      return NextResponse.json({ error: "Restaurant not found" }, { status: 404 });
    }

    if (user.role !== "OWNER") {
      return NextResponse.json({ error: "Only owners can connect accounting integrations" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider")?.toUpperCase();

    if (!provider || !["QUICKBOOKS", "XERO"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider. Use 'quickbooks' or 'xero'" }, { status: 400 });
    }

    // Generate state for CSRF protection
    const state = crypto.randomUUID();
    const cookieStore = await cookies();
    cookieStore.set("accounting_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes
    });
    cookieStore.set("accounting_provider", provider, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600,
    });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const redirectUri = `${baseUrl}/api/accounting/callback`;

    let authUrl: string;

    if (provider === "QUICKBOOKS") {
      const clientId = process.env.QUICKBOOKS_CLIENT_ID;
      if (!clientId) {
        return NextResponse.json({ error: "QuickBooks not configured" }, { status: 500 });
      }
      authUrl = `https://appcenter.intuit.com/connect/oauth2?client_id=${clientId}&response_type=code&scope=com.intuit.quickbooks.accounting&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    } else {
      const clientId = process.env.XERO_CLIENT_ID;
      if (!clientId) {
        return NextResponse.json({ error: "Xero not configured" }, { status: 500 });
      }
      authUrl = `https://login.xero.com/identity/connect/authorize?client_id=${clientId}&response_type=code&scope=openid profile email accounting.transactions accounting.settings&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    }

    return NextResponse.redirect(authUrl);
  } catch (error: any) {
    console.error("Accounting connect error:", error);
    return NextResponse.json(
      { error: "Failed to initiate connection", details: error?.message },
      { status: 500 }
    );
  }
}
