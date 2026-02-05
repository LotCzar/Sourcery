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

    // Create or update user in database
    const dbUser = await prisma.user.upsert({
      where: { clerkId: userId },
      update: {
        email: user.emailAddresses[0]?.emailAddress || "",
        firstName: user.firstName,
        lastName: user.lastName,
      },
      create: {
        clerkId: userId,
        email: user.emailAddresses[0]?.emailAddress || "",
        firstName: user.firstName,
        lastName: user.lastName,
        role: "OWNER",
      },
    });

    // Create restaurant
    const restaurant = await prisma.restaurant.create({
      data: {
        name: data.restaurantName,
        address: data.address || null,
        city: data.city || null,
        state: data.state || null,
        zipCode: data.zipCode || null,
        phone: data.phone || null,
        email: data.email || null,
        website: data.website || null,
        cuisineType: data.cuisineType || null,
        seatingCapacity,
      },
    });

    // Link user to restaurant
    await prisma.user.update({
      where: { id: dbUser.id },
      data: { restaurantId: restaurant.id },
    });

    return NextResponse.json({
      success: true,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
      },
    });
  } catch (error) {
    console.error("Onboarding error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}
