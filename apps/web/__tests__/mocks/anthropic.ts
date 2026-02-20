import { vi } from "vitest";

export const mockAnthropicCreate = vi.fn();

export const mockAnthropicClient = {
  messages: {
    create: mockAnthropicCreate,
  },
};

vi.mock("@/lib/anthropic", () => ({
  getAnthropicClient: vi.fn().mockReturnValue(mockAnthropicClient),
}));
