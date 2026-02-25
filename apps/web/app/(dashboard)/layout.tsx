export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { MobileNav } from "@/components/dashboard/mobile-nav";
import { ErrorBoundary } from "@/components/error-boundary";
import { ChatSidebar } from "@/components/chat/chat-sidebar";
import { RealtimeProvider } from "@/components/realtime-provider";
import { Toaster } from "@/components/ui/toaster";
import { OrgProvider } from "@/lib/org-context";
import { TourWrapper } from "@/components/tour/tour-wrapper";
import prisma from "@/lib/prisma";

async function checkOnboarding(userId: string): Promise<"ok" | "supplier" | "driver" | "onboarding"> {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { restaurant: true, supplier: true },
  });

  if (!user) return "onboarding";

  // Driver users should always go to the driver portal (linked or waiting screen)
  if (user.role === "DRIVER") return "driver";

  // Supplier users should go to the supplier dashboard, not the restaurant dashboard
  if (user.supplier) return "supplier";

  // ORG_ADMIN users may not have a personal restaurant but should be allowed
  // if they have an organization with restaurants
  if (user.role === "ORG_ADMIN" && user.organizationId) {
    const orgRestaurantCount = await prisma.restaurant.count({
      where: { organizationId: user.organizationId },
    });
    if (orgRestaurantCount > 0) return "ok";
  }

  // Standard users must have a restaurant to be considered onboarded
  return user.restaurant !== null ? "ok" : "onboarding";
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const onboardingStatus = await checkOnboarding(userId);

  if (onboardingStatus === "supplier") {
    redirect("/supplier");
  }

  if (onboardingStatus === "driver") {
    redirect("/driver");
  }

  if (onboardingStatus === "onboarding") {
    redirect("/onboarding");
  }

  return (
    <OrgProvider>
      <TourWrapper audience="restaurant">
        <div className="flex h-screen overflow-hidden">
          {/* Mobile Navigation */}
          <MobileNav />

          {/* Desktop Sidebar */}
          <div className="hidden lg:flex">
            <Sidebar />
          </div>

          {/* Main Content */}
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="relative z-50" style={{ overflow: "visible" }}>
              <Header />
            </div>
            <main className="flex-1 overflow-y-auto bg-background p-6">
              <ErrorBoundary>{children}</ErrorBoundary>
            </main>
          </div>

          <ChatSidebar />
          <RealtimeProvider />
          <Toaster />
        </div>
      </TourWrapper>
    </OrgProvider>
  );
}
