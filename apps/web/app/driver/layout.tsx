export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { DriverHeader } from "@/components/driver/header";
import { DriverMobileNav } from "@/components/driver/mobile-nav";
import { Loader2 } from "lucide-react";
import { Toaster } from "@/components/ui/toaster";
import { TourWrapper } from "@/components/tour/tour-wrapper";
import prisma from "@/lib/prisma";

async function checkDriverAccess(userId: string): Promise<"ok" | "waiting" | "not_driver"> {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { supplier: true },
  });

  if (!user || user.role !== "DRIVER") return "not_driver";
  if (!user.supplier) return "waiting";
  return "ok";
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

  const access = await checkDriverAccess(userId);

  if (access === "not_driver") {
    redirect("/");
  }

  if (access === "waiting") {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="mx-auto max-w-md space-y-4 text-center p-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Waiting for Supplier</h1>
          <p className="text-muted-foreground">
            Your account has been created but hasn&apos;t been linked to a supplier yet. Please ask your supplier admin to add you to their team.
          </p>
        </div>
      </div>
    );
  }

  return (
    <TourWrapper audience="driver">
      <div className="flex h-screen flex-col overflow-hidden">
        <DriverHeader />
        <main className="flex-1 overflow-y-auto bg-background p-4 pb-20 lg:pb-4">
          {children}
        </main>
        <DriverMobileNav />
        <Toaster />
      </div>
    </TourWrapper>
  );
}
