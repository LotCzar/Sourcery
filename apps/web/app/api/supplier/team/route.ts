import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { CreateSupplierStaffSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";
import { sendEmail, emailTemplates } from "@/lib/email";

// GET - List team members for this supplier
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

    if (user.role !== "SUPPLIER_ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const members = await prisma.user.findMany({
      where: {
        supplierId: user.supplier.id,
        role: { in: ["SUPPLIER_ADMIN", "SUPPLIER_REP"] },
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
    console.error("Get supplier team error:", error);
    return NextResponse.json(
      { error: "Failed to fetch team members" },
      { status: 500 }
    );
  }
}

// POST - Add a new supplier staff member
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

    if (user.role !== "SUPPLIER_ADMIN") {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateBody(CreateSupplierStaffSchema, body);
    if (!validation.success) return validation.response;
    const { firstName, lastName, email, phone, role } = validation.data;

    // Check if a user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      if (existingUser.supplierId && existingUser.supplierId !== user.supplier.id) {
        return NextResponse.json(
          { error: "This user is already assigned to another supplier" },
          { status: 400 }
        );
      }

      if (existingUser.supplierId === user.supplier.id) {
        return NextResponse.json(
          { error: "This user is already a member of this supplier" },
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
        supplierId: user.supplier.id,
      },
    });

    // Send invitation email
    const inviterName = `${user.firstName || ""} ${user.lastName || ""}`.trim() || "A team member";
    const template = emailTemplates.supplierTeamInvitation(
      firstName,
      user.supplier.name,
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
    console.error("Create supplier staff error:", error);
    return NextResponse.json(
      { error: "Failed to create staff member" },
      { status: 500 }
    );
  }
}
