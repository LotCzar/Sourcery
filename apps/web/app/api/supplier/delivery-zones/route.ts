import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validations/validate";
import { CreateDeliveryZoneSchema } from "@/lib/validations";

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { supplier: true },
    });

    if (!user?.supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const zones = await prisma.deliveryZone.findMany({
      where: { supplierId: user.supplier.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: zones.map((z) => ({
        ...z,
        deliveryFee: Number(z.deliveryFee),
        minimumOrder: z.minimumOrder ? Number(z.minimumOrder) : null,
      })),
    });
  } catch (error: any) {
    console.error("Delivery zones GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch delivery zones" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { supplier: true },
    });

    if (!user?.supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    if (user.role !== "SUPPLIER_ADMIN") {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateBody(CreateDeliveryZoneSchema, body);
    if (!validation.success) return validation.response;

    const zone = await prisma.deliveryZone.create({
      data: {
        name: validation.data.name,
        zipCodes: validation.data.zipCodes,
        deliveryFee: validation.data.deliveryFee,
        minimumOrder: validation.data.minimumOrder ?? null,
        supplierId: user.supplier.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...zone,
        deliveryFee: Number(zone.deliveryFee),
        minimumOrder: zone.minimumOrder ? Number(zone.minimumOrder) : null,
      },
    });
  } catch (error: any) {
    console.error("Delivery zone POST error:", error);
    return NextResponse.json(
      { error: "Failed to create delivery zone" },
      { status: 500 }
    );
  }
}
