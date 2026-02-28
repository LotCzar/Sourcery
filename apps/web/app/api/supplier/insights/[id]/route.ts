import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { supplier: { select: { id: true } } },
    });

    if (!user?.supplier) {
      return NextResponse.json({ error: "Supplier not found" }, { status: 404 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !["ACTIVE", "DISMISSED", "ACTED_ON"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be ACTIVE, DISMISSED, or ACTED_ON" },
        { status: 400 }
      );
    }

    // Verify the insight belongs to this supplier
    const insight = await prisma.supplierInsight.findFirst({
      where: { id, supplierId: user.supplier.id },
    });

    if (!insight) {
      return NextResponse.json({ error: "Insight not found" }, { status: 404 });
    }

    const updated = await prisma.supplierInsight.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error("Insight update error:", error);
    return NextResponse.json(
      { error: "Failed to update insight" },
      { status: 500 }
    );
  }
}
