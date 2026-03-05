import { PrismaClient } from "@prisma/client";
import { mockDeep, mockReset, DeepMockProxy } from "vitest-mock-extended";
import { beforeEach, vi } from "vitest";

export const prismaMock = mockDeep<PrismaClient>();

vi.mock("@/lib/prisma", () => ({
  default: prismaMock,
  prisma: prismaMock,
}));

beforeEach(() => {
  mockReset(prismaMock);
  // Make $transaction execute the callback with the mock client so
  // transactional code paths work in tests.
  prismaMock.$transaction.mockImplementation((fn: any) =>
    typeof fn === "function" ? fn(prismaMock) : Promise.resolve(fn)
  );
});
