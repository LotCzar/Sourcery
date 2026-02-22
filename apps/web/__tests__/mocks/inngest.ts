import { vi } from "vitest";

export const mockInngestSend = vi.fn().mockResolvedValue({ ids: [] });

const handlers: Record<string, Function> = {};

export const mockCreateFunction = vi.fn().mockImplementation(
  (config: { id: string }, _trigger: any, handler: Function) => {
    handlers[config.id] = handler;
    return handler;
  }
);

export function getInngestHandler(id: string): Function | undefined {
  return handlers[id];
}

vi.mock("@/lib/inngest/client", () => ({
  inngest: {
    send: mockInngestSend,
    createFunction: mockCreateFunction,
  },
}));
