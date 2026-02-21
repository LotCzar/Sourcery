import { vi } from "vitest";

export const mockAuth = vi.fn().mockResolvedValue({
  userId: "clerk_test_user_123",
});

export const mockCurrentUser = vi.fn().mockResolvedValue({
  id: "clerk_test_user_123",
  firstName: "Test",
  lastName: "User",
  emailAddresses: [{ emailAddress: "test@restaurant.com" }],
});

vi.mock("@clerk/nextjs/server", () => ({
  auth: mockAuth,
  currentUser: mockCurrentUser,
}));
