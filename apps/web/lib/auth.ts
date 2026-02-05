import { auth, currentUser } from "@clerk/nextjs/server";

export async function getAuth() {
  return auth();
}

export async function getCurrentUser() {
  return currentUser();
}

export async function requireAuth() {
  const { userId } = await auth();

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}
