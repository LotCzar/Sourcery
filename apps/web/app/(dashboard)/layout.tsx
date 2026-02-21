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
import prisma from "@/lib/prisma";

async function checkOnboarding(userId: string) {
  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { restaurant: true },
  });

  // User must exist AND have a restaurant to be considered onboarded
  return user !== null && user.restaurant !== null;
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

  const hasCompletedOnboarding = await checkOnboarding(userId);

  if (!hasCompletedOnboarding) {
    redirect("/onboarding");
  }

  return (
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
  );
}
