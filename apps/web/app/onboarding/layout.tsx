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
