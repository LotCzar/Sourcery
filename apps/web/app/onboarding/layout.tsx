export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { supplier: true, restaurant: true },
    });

    // Driver users — send to driver portal (created by supplier admins, not self-onboarded)
    // Redirect regardless of supplier link — unlinked drivers see waiting screen at /driver
    if (user?.role === "DRIVER") {
      redirect("/driver");
    }

    // Already-onboarded supplier — send to supplier dashboard
    if (user?.supplier) {
      redirect("/supplier");
    }

    // Already-onboarded restaurant — send to restaurant dashboard
    if (user?.restaurant) {
      redirect("/");
    }
  }

  return children;
}
