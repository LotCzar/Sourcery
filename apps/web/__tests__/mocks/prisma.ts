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
});
