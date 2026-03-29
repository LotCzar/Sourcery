import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { CreateStaffMemberSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";
import { sendEmail, emailTemplates } from "@/lib/email";

// GET - List team members for this restaurant
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
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    if (!["OWNER", "MANAGER", "ORG_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const members = await prisma.user.findMany({
      where: {
        restaurantId: user.restaurant.id,
        role: { in: ["OWNER", "MANAGER", "STAFF"] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        clerkId: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: members.map((member) => ({
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        role: member.role,
        isPending: member.clerkId.startsWith("staff_pending_"),
        createdAt: member.createdAt,
      })),
    });
  } catch (error: any) {
    console.error("Get team members error:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

// POST - Add a new staff member
export async function POST(request: Request) {
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
      return NextResponse.json(
        { error: "Restaurant not found" },
        { status: 404 }
      );
    }

    if (!["OWNER", "MANAGER", "ORG_ADMIN"].includes(user.role)) {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateBody(CreateStaffMemberSchema, body);
    if (!validation.success) return validation.response;
    const { firstName, lastName, email, phone, role } = validation.data;

    // Check if a user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.restaurantId && existingUser.restaurantId !== user.restaurant.id) {
        return NextResponse.json(
          { error: "This user is already assigned to another restaurant" },
          { status: 400 }
        );
      }

      // If already on this restaurant, just return error
      if (existingUser.restaurantId === user.restaurant.id) {
        return NextResponse.json(
          { error: "This user is already a member of this restaurant" },
          { status: 400 }
        );
      }
    }

    // Create a new user record with a placeholder clerkId
    const member = await prisma.user.create({
      data: {
        clerkId: `staff_pending_${crypto.randomUUID()}`,
        email,
        firstName,
        lastName: lastName || null,
        phone: phone || null,
        role,
        restaurantId: user.restaurant.id,
      },
    });

    // Send invitation email
    const inviterName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "A team member";
    const template = emailTemplates.staffInvitation(
      firstName,
      user.restaurant.name,
      role,
      inviterName
    );
    await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        email: member.email,
        phone: member.phone,
        role: member.role,
        isPending: true,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error("Create staff member error:", error);
    return NextResponse.json(
      { error: "Failed to create staff member" },
      { status: 500 }
    );
  }
}
