import { auth, currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { validateBody } from "@/lib/validations/validate";
import { OrgOnboardingSchema } from "@/lib/validations";

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

    const body = await request.json();
    const validation = validateBody(OrgOnboardingSchema, body);
    if (!validation.success) return validation.response;

    const data = validation.data;

    // Check slug uniqueness
    const existingOrg = await prisma.organization.findUnique({
      where: { slug: data.slug },
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: "This organization URL slug is already taken" },
        { status: 400 }
      );
    }

    // Parse seating capacity to number
    let seatingCapacity: number | null = null;
    if (data.seatingCapacity) {
      const capacityMap: Record<string, number> = {
        "1-25": 25,
        "26-50": 50,
        "51-100": 100,
        "100+": 150,
      };
      seatingCapacity = capacityMap[data.seatingCapacity] || null;
    }

    // Create organization
    const organization = await prisma.organization.create({
      data: {
        name: data.organizationName.trim(),
        slug: data.slug.trim(),
      },
    });

    // Create first restaurant
    const restaurant = await prisma.restaurant.create({
      data: {
        name: data.restaurantName.trim(),
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        cuisineTypes: data.cuisineTypes ?? [],
        seatingCapacity,
        organizationId: organization.id,
      },
    });

    // Upsert user as ORG_ADMIN
    await prisma.user.upsert({
      where: { clerkId: userId },
      update: {
        email: user.emailAddresses[0]?.emailAddress || "",
        firstName: user.firstName,
        lastName: user.lastName,
        role: "ORG_ADMIN",
        organizationId: organization.id,
        restaurantId: restaurant.id,
      },
      create: {
        clerkId: userId,
        email: user.emailAddresses[0]?.emailAddress || "",
        firstName: user.firstName,
        lastName: user.lastName,
        role: "ORG_ADMIN",
        organizationId: organization.id,
        restaurantId: restaurant.id,
      },
    });

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug,
      },
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
      },
    });
  } catch (error) {
    console.error("Org onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to complete organization onboarding" },
      { status: 500 }
    );
  }
}
