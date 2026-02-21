import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { getAnthropicClient } from "@/lib/anthropic";

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
      include: { restaurant: true },
    });

    if (!user?.restaurant) {
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    const { query } = await request.json();
    if (!query || typeof query !== "string" || query.trim().length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const restaurantId = user.restaurant.id;

    // Ask Claude to parse the search intent
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: `You are a search intent parser for a restaurant procurement platform. Parse the user's natural language query into structured search parameters. Return ONLY valid JSON with this schema:
{
  "entity": "products" | "suppliers" | "orders" | "inventory" | "invoices",
  "filters": { key-value pairs for Prisma where clause },
  "sort": "name" | "price_asc" | "price_desc" | "date_desc" | null,
  "searchTerms": "extracted search keywords",
  "redirectUrl": "/products" | "/suppliers" | "/orders" | "/inventory" | "/invoices"
}

Examples:
- "cheapest tomatoes" -> { "entity": "products", "filters": { "name": "tomatoes" }, "sort": "price_asc", "searchTerms": "tomatoes", "redirectUrl": "/products" }
- "orders from last week" -> { "entity": "orders", "filters": {}, "sort": "date_desc", "searchTerms": "", "redirectUrl": "/orders" }
- "show me dairy suppliers" -> { "entity": "suppliers", "filters": { "category": "DAIRY" }, "sort": null, "searchTerms": "dairy", "redirectUrl": "/suppliers" }`,
      messages: [{ role: "user", content: query }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse the JSON response (handle markdown wrapping)
    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      parsed = null;
    }

    if (!parsed) {
      return NextResponse.json({
        success: true,
        data: { results: [], redirectUrl: null, query },
      });
    }

    // Execute search based on parsed intent
    let results: any[] = [];
    const searchTerms = parsed.searchTerms || query;

    switch (parsed.entity) {
      case "products": {
        const products = await prisma.supplierProduct.findMany({
          where: {
            name: { contains: searchTerms, mode: "insensitive" },
            ...(parsed.filters?.category
              ? { category: parsed.filters.category }
              : {}),
          },
          include: { supplier: { select: { name: true } } },
          orderBy:
            parsed.sort === "price_asc"
              ? { price: "asc" }
              : parsed.sort === "price_desc"
                ? { price: "desc" }
                : { name: "asc" },
          take: 10,
        });
        results = products.map((p) => ({
          id: p.id,
          type: "product",
          title: p.name,
          subtitle: `${p.supplier.name} - $${Number(p.price).toFixed(2)}/${p.unit}`,
          category: p.category,
        }));
        break;
      }
      case "suppliers": {
        const suppliers = await prisma.supplier.findMany({
          where: {
            OR: [
              { name: { contains: searchTerms, mode: "insensitive" } },
              {
                products: {
                  some: {
                    ...(parsed.filters?.category
                      ? { category: parsed.filters.category }
                      : { name: { contains: searchTerms, mode: "insensitive" } }),
                  },
                },
              },
            ],
          },
          include: { _count: { select: { products: true } } },
          take: 10,
        });
        results = suppliers.map((s) => ({
          id: s.id,
          type: "supplier",
          title: s.name,
          subtitle: `${s._count.products} products - ${s.city || ""}${s.state ? `, ${s.state}` : ""}`,
        }));
        break;
      }
      case "orders": {
        const orders = await prisma.order.findMany({
          where: {
            restaurantId,
            ...(parsed.filters?.status ? { status: parsed.filters.status } : {}),
          },
          include: { supplier: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        });
        results = orders.map((o) => ({
          id: o.id,
          type: "order",
          title: o.orderNumber,
          subtitle: `${o.supplier.name} - $${Number(o.total).toFixed(2)} - ${o.status}`,
        }));
        break;
      }
      case "inventory": {
        const items = await prisma.inventoryItem.findMany({
          where: {
            restaurantId,
            name: { contains: searchTerms, mode: "insensitive" },
          },
          take: 10,
        });
        results = items.map((i) => ({
          id: i.id,
          type: "inventory",
          title: i.name,
          subtitle: `${Number(i.currentQuantity)} ${i.unit} in stock`,
          category: i.category,
        }));
        break;
      }
      case "invoices": {
        const invoices = await prisma.invoice.findMany({
          where: {
            restaurantId,
            OR: [
              { invoiceNumber: { contains: searchTerms, mode: "insensitive" } },
              {
                supplier: {
                  name: { contains: searchTerms, mode: "insensitive" },
                },
              },
            ],
          },
          include: { supplier: { select: { name: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        });
        results = invoices.map((inv) => ({
          id: inv.id,
          type: "invoice",
          title: inv.invoiceNumber,
          subtitle: `${inv.supplier.name} - $${Number(inv.total).toFixed(2)} - ${inv.status}`,
        }));
        break;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        results,
        redirectUrl: parsed.redirectUrl || null,
        query,
        parsedIntent: parsed.entity,
      },
    });
  } catch (error: any) {
    console.error("AI search error:", error);
    return NextResponse.json(
      { error: "Search failed", details: error?.message },
      { status: 500 }
    );
  }
}
