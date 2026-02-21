export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { SupplierSidebar } from "@/components/supplier/sidebar";
import { SupplierHeader } from "@/components/supplier/header";
import { SupplierMobileNav } from "@/components/supplier/mobile-nav";
import { Toaster } from "@/components/ui/toaster";
import prisma from "@/lib/prisma";

async function checkSupplierAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { supplier: true },
  });

  // User must exist AND have a supplier to be considered onboarded as supplier
  return user !== null && user.supplier !== null;
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

  const hasSupplierAccess = await checkSupplierAccess(userId);

  if (!hasSupplierAccess) {
    redirect("/supplier-onboarding");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile Navigation */}
      <SupplierMobileNav />

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <SupplierSidebar />
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="relative z-50" style={{ overflow: "visible" }}>
          <SupplierHeader />
        </div>
        <main className="flex-1 overflow-y-auto bg-background p-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
