import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Get category mappings
export async function GET() {
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

    const integration = await prisma.accountingIntegration.findUnique({
      where: { restaurantId: user.restaurant.id },
      include: { categoryMappings: true },
    });

    if (!integration) {
      return NextResponse.json({ error: "No accounting integration found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: integration.categoryMappings,
    });
  } catch (error: any) {
    console.error("Get mappings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch mappings", details: error?.message },
      { status: 500 }
    );
  }
}

// PUT - Update category mappings
export async function PUT(request: Request) {
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
      return NextResponse.json({ error: "Only owners can manage accounting mappings" }, { status: 403 });
    }

    const integration = await prisma.accountingIntegration.findUnique({
      where: { restaurantId: user.restaurant.id },
    });

    if (!integration) {
      return NextResponse.json({ error: "No accounting integration found" }, { status: 404 });
    }

    const body = await request.json();
    const { mappings } = body;

    if (!Array.isArray(mappings)) {
      return NextResponse.json({ error: "mappings array is required" }, { status: 400 });
    }

    // Upsert each mapping
    const results = [];
    for (const mapping of mappings) {
      const result = await prisma.accountingCategoryMapping.upsert({
        where: {
          integrationId_productCategory: {
            integrationId: integration.id,
            productCategory: mapping.productCategory,
          },
        },
        create: {
          integrationId: integration.id,
          productCategory: mapping.productCategory,
          accountingCode: mapping.accountingCode,
          accountingName: mapping.accountingName || null,
        },
        update: {
          accountingCode: mapping.accountingCode,
          accountingName: mapping.accountingName || null,
        },
      });
      results.push(result);
    }

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error("Update mappings error:", error);
    return NextResponse.json(
      { error: "Failed to update mappings", details: error?.message },
      { status: 500 }
    );
  }
}
