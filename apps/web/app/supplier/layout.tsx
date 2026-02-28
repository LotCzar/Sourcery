export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { TourWrapper } from "@/components/tour/tour-wrapper";
import { SupplierLayoutClient } from "@/components/supplier/layout-client";
import prisma from "@/lib/prisma";

async function checkSupplierAccess(userId: string): Promise<"ok" | "driver" | "no_supplier"> {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { supplier: true },
  });

  if (!user || !user.supplier) return "no_supplier";

  // Drivers are linked to a supplier but should not access the supplier portal
  if (user.role === "DRIVER") return "driver";

  return "ok";
}

export default async function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const access = await checkSupplierAccess(userId);

  if (access === "driver") {
    redirect("/driver");
  }

  if (access === "no_supplier") {
    redirect("/supplier-onboarding");
  }

  return (
    <TourWrapper audience="supplier">
      <SupplierLayoutClient>{children}</SupplierLayoutClient>
    </TourWrapper>
  );
}
