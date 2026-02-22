export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { DriverHeader } from "@/components/driver/header";
import { DriverMobileNav } from "@/components/driver/mobile-nav";
import { Toaster } from "@/components/ui/toaster";
import prisma from "@/lib/prisma";

async function checkDriverAccess(userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { supplier: true },
  });

  return user !== null && user.role === "DRIVER" && user.supplier !== null;
}

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const hasAccess = await checkDriverAccess(userId);

  if (!hasAccess) {
    redirect("/");
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <DriverHeader />
      <main className="flex-1 overflow-y-auto bg-background p-4 pb-20 lg:pb-4">
        {children}
      </main>
      <DriverMobileNav />
      <Toaster />
    </div>
  );
}
