import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { CreateDriverSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";

// GET - List drivers for this supplier
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
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    const drivers = await prisma.user.findMany({
      where: {
        supplierId: user.supplier.id,
        role: "DRIVER",
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: {
          select: {
            driverDeliveries: {
              where: { status: "DELIVERED" },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: drivers.map((driver) => ({
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: driver.email,
        phone: driver.phone,
        deliveryCount: driver._count.driverDeliveries,
        createdAt: driver.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Get drivers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch drivers" },
      { status: 500 }
    );
  }
}

// POST - Add a new driver
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
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    if (!["SUPPLIER_ADMIN", "SUPPLIER_REP"].includes(user.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
    }

    const body = await request.json();
    const validation = validateBody(CreateDriverSchema, body);
    if (!validation.success) return validation.response;
    const { firstName, lastName, email, phone } = validation.data;

    // Check if a user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      // If existing user, update their role and supplier
      if (existingUser.supplierId && existingUser.supplierId !== user.supplier.id) {
        return NextResponse.json(
          { error: "This user is already assigned to another supplier" },
          { status: 400 }
        );
      }

      const updatedDriver = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          role: "DRIVER",
          supplierId: user.supplier.id,
          firstName: firstName || existingUser.firstName,
          lastName: lastName || existingUser.lastName,
          phone: phone || existingUser.phone,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          id: updatedDriver.id,
          firstName: updatedDriver.firstName,
          lastName: updatedDriver.lastName,
          email: updatedDriver.email,
          phone: updatedDriver.phone,
        },
      });
    }

    // Create a new user record with a placeholder clerkId
    // The driver will need to sign up through Clerk to get a real clerkId
    const driver = await prisma.user.create({
      data: {
        clerkId: `driver_pending_${crypto.randomUUID()}`,
        email,
        firstName,
        lastName: lastName || null,
        phone: phone || null,
        role: "DRIVER",
        supplierId: user.supplier.id,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: driver.id,
        firstName: driver.firstName,
        lastName: driver.lastName,
        email: driver.email,
        phone: driver.phone,
      },
    });
  } catch (error: any) {
    console.error("Create driver error:", error);
    return NextResponse.json(
      { error: "Failed to create driver" },
      { status: 500 }
    );
  }
}
