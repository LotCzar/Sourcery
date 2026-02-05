import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const data = await request.json();

    // Check if user already has a supplier linked
    const existingUser = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { supplier: true },
    });

    if (existingUser?.supplier) {
      // User already has a supplier, return success
      return NextResponse.json({
        success: true,
        supplier: {
          id: existingUser.supplier.id,
          name: existingUser.supplier.name,
        },
      });
    }

    // Parse numeric fields
    const minimumOrder = data.minimumOrder ? parseFloat(data.minimumOrder) : null;
    const deliveryFee = data.deliveryFee ? parseFloat(data.deliveryFee) : null;
    const leadTimeDays = data.leadTimeDays ? parseInt(data.leadTimeDays) : 1;

    // Get user email - use supplier email from form, or fall back to user's Clerk email
    const supplierEmail = data.email || user.emailAddresses[0]?.emailAddress || "";

    // Create or update user in database with SUPPLIER_ADMIN role
    const dbUser = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {
        email: user.emailAddresses[0]?.emailAddress || "",
        firstName: user.firstName,
        lastName: user.lastName,
        role: "SUPPLIER_ADMIN",
      },
      create: {
        clerkId: userId,
        email: user.emailAddresses[0]?.emailAddress || "",
        firstName: user.firstName,
        lastName: user.lastName,
        role: "SUPPLIER_ADMIN",
      },
    });

    // Check if supplier with this email already exists
    let supplier = await prisma.supplier.findUnique({
      where: { email: supplierEmail },
    });

    if (supplier) {
      // Supplier exists, link user to it
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { supplierId: supplier.id },
      });
    } else {
      // Create new supplier with PENDING status
      supplier = await prisma.supplier.create({
        data: {
          name: data.companyName,
          email: supplierEmail,
          phone: data.phone || null,
          address: data.address || null,
          city: data.city || null,
          state: data.state || null,
          zipCode: data.zipCode || null,
          website: data.website || null,
          minimumOrder,
          deliveryFee,
          leadTimeDays,
          status: "PENDING",
        },
      });

      // Link user to supplier
      await prisma.user.update({
        where: { id: dbUser.id },
        data: { supplierId: supplier.id },
      });
    }

    return NextResponse.json({
      success: true,
      supplier: {
        id: supplier.id,
        name: supplier.name,
      },
    });
  } catch (error: any) {
    console.error("Supplier onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to complete supplier onboarding", details: error?.message },
      { status: 500 }
    );
  }
}
