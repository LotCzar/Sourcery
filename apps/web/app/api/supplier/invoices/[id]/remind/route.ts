import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendEmail, emailTemplates } from "@/lib/email";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const invoice = await prisma.invoice.findFirst({
      where: { id, supplierId: user.supplier.id },
      include: {
        restaurant: true,
        supplier: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (!["PENDING", "OVERDUE"].includes(invoice.status)) {
      return NextResponse.json(
        { error: "Can only send reminders for pending or overdue invoices" },
        { status: 400 }
      );
    }

    // Find restaurant owner
    const owner = await prisma.user.findFirst({
      where: {
        restaurantId: invoice.restaurantId,
        role: "OWNER",
      },
    });

    const recipientEmail = owner?.email || invoice.restaurant.email;

    if (!recipientEmail) {
      return NextResponse.json(
        { error: "No email found for restaurant owner" },
        { status: 400 }
      );
    }

    const amount = Number(invoice.total);
    const dueDate = invoice.dueDate.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const isPastDue = new Date(invoice.dueDate) < new Date();

    let emailContent;
    if (isPastDue || invoice.status === "OVERDUE") {
      const daysPastDue = Math.ceil(
        (Date.now() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      emailContent = emailTemplates.invoiceOverdue(
        invoice.invoiceNumber,
        invoice.supplier.name,
        amount,
        daysPastDue
      );
    } else {
      emailContent = emailTemplates.invoiceReminder(
        invoice.invoiceNumber,
        invoice.supplier.name,
        amount,
        dueDate,
        "Payment Due Soon"
      );
    }

    await sendEmail({
      to: recipientEmail,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    return NextResponse.json({
      success: true,
      sentTo: recipientEmail,
    });
  } catch (error: any) {
    console.error("Invoice remind error:", error);
    return NextResponse.json(
      { error: "Failed to send reminder" },
      { status: 500 }
    );
  }
}
