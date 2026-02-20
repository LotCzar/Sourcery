import { vi } from "vitest";

export const mockInngestSend = vi.fn().mockResolvedValue({ ids: [] });

vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    send: mockInngestSend,
  },
}));
