import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { SupplierVerificationActionSchema } from "@/lib/validations";
import { validateBody } from "@/lib/validations/validate";
import { sendEmail, emailTemplates } from "@/lib/email";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user || (user.role !== "OWNER" && user.role !== "ORG_ADMIN")) {
      return NextResponse.json(
        { error: "Only owners and admins can access supplier verification" },
        { status: 403 }
      );
    }

    const status = request.nextUrl.searchParams.get("status");

    const where = status ? { status: status as any } : {};

    const suppliers = await prisma.supplier.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        city: true,
        state: true,
        status: true,
        verifiedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: suppliers });
  } catch (error: any) {
    console.error("Admin suppliers GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user || (user.role !== "OWNER" && user.role !== "ORG_ADMIN")) {
      return NextResponse.json(
        { error: "Only owners and admins can verify suppliers" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validation = validateBody(SupplierVerificationActionSchema, body);
    if (!validation.success) return validation.response;
    const { supplierId, action, notes } = validation.data;

    const supplier = await prisma.supplier.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Determine new status and verifiedAt based on action
    let newStatus: string;
    let verifiedAt: Date | null = null;

    switch (action) {
      case "approve":
        newStatus = "VERIFIED";
        verifiedAt = new Date();
        break;
      case "reject":
        newStatus = "INACTIVE";
        break;
      case "suspend":
        newStatus = "SUSPENDED";
        break;
      case "reactivate":
        newStatus = "VERIFIED";
        verifiedAt = new Date();
        break;
      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    // Update supplier status
    const updatedSupplier = await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        status: newStatus,
        ...(verifiedAt ? { verifiedAt } : {}),
      },
    });

    // Create in-app notifications for all users linked to this supplier
    const supplierUsers = await prisma.user.findMany({
      where: { supplierId },
    });

    for (const su of supplierUsers) {
      await prisma.notification.create({
        data: {
          type: "SYSTEM",
          title: `Supplier ${action === "approve" ? "Approved" : action === "reject" ? "Rejected" : action === "suspend" ? "Suspended" : "Reactivated"}`,
          message: `${supplier.name} has been ${action === "approve" ? "approved and verified" : action === "reject" ? "not approved" : action === "suspend" ? "suspended" : "reactivated"}.`,
          userId: su.id,
          metadata: { supplierId, action },
        },
      });
    }

    // Send email notifications for approve/reject
    if (action === "approve" && supplier.email) {
      const template = emailTemplates.supplierVerified(supplier.name);
      await sendEmail({
        to: supplier.email,
        subject: template.subject,
        html: template.html,
      });
    } else if (action === "reject" && supplier.email) {
      const template = emailTemplates.supplierRejected(supplier.name, notes);
      await sendEmail({
        to: supplier.email,
        subject: template.subject,
        html: template.html,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedSupplier.id,
        name: updatedSupplier.name,
        status: updatedSupplier.status,
        verifiedAt: updatedSupplier.verifiedAt,
      },
    });
  } catch (error: any) {
    console.error("Admin suppliers PATCH error:", error);
    return NextResponse.json(
      { error: "Failed to update supplier" },
      { status: 500 }
    );
  }
}
