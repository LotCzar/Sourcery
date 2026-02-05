import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET - Get supplier settings/profile
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's supplier
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: {
        supplier: {
          include: {
            deliveryZones: true,
          },
        },
      },
    });

    if (!user?.supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const supplier = user.supplier;

    return NextResponse.json({
      success: true,
      data: {
        id: supplier.id,
        name: supplier.name,
        description: supplier.description,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        city: supplier.city,
        state: supplier.state,
        zipCode: supplier.zipCode,
        website: supplier.website,
        logoUrl: supplier.logoUrl,
        taxId: supplier.taxId,
        minimumOrder: supplier.minimumOrder ? Number(supplier.minimumOrder) : null,
        deliveryFee: supplier.deliveryFee ? Number(supplier.deliveryFee) : null,
        leadTimeDays: supplier.leadTimeDays,
        status: supplier.status,
        rating: supplier.rating ? Number(supplier.rating) : null,
        reviewCount: supplier.reviewCount,
        deliveryZones: supplier.deliveryZones.map((zone) => ({
          ...zone,
          deliveryFee: Number(zone.deliveryFee),
          minimumOrder: zone.minimumOrder ? Number(zone.minimumOrder) : null,
        })),
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Get settings error:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings", details: error?.message },
      { status: 500 }
    );
  }
}

// PATCH - Update supplier settings/profile
export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's supplier
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { supplier: true },
    });

    if (!user?.supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const data = await request.json();

    // Build update data - only include fields that are provided
    const updateData: any = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.address !== undefined) updateData.address = data.address;
    if (data.city !== undefined) updateData.city = data.city;
    if (data.state !== undefined) updateData.state = data.state;
    if (data.zipCode !== undefined) updateData.zipCode = data.zipCode;
    if (data.website !== undefined) updateData.website = data.website;
    if (data.logoUrl !== undefined) updateData.logoUrl = data.logoUrl;
    if (data.taxId !== undefined) updateData.taxId = data.taxId;

    if (data.minimumOrder !== undefined) {
      updateData.minimumOrder = data.minimumOrder
        ? parseFloat(data.minimumOrder)
        : null;
    }

    if (data.deliveryFee !== undefined) {
      updateData.deliveryFee = data.deliveryFee
        ? parseFloat(data.deliveryFee)
        : null;
    }

    if (data.leadTimeDays !== undefined) {
      updateData.leadTimeDays = parseInt(data.leadTimeDays) || 1;
    }

    const supplier = await prisma.supplier.update({
      where: { id: user.supplier.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: supplier.id,
        name: supplier.name,
        description: supplier.description,
        email: supplier.email,
        phone: supplier.phone,
        address: supplier.address,
        city: supplier.city,
        state: supplier.state,
        zipCode: supplier.zipCode,
        website: supplier.website,
        logoUrl: supplier.logoUrl,
        taxId: supplier.taxId,
        minimumOrder: supplier.minimumOrder ? Number(supplier.minimumOrder) : null,
        deliveryFee: supplier.deliveryFee ? Number(supplier.deliveryFee) : null,
        leadTimeDays: supplier.leadTimeDays,
        status: supplier.status,
        rating: supplier.rating ? Number(supplier.rating) : null,
        reviewCount: supplier.reviewCount,
        updatedAt: supplier.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Update settings error:", error);
    return NextResponse.json(
      { error: "Failed to update settings", details: error?.message },
      { status: 500 }
    );
  }
}
