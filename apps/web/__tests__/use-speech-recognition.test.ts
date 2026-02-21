// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";

function createMockRecognition() {
  return {
    continuous: false,
    interimResults: false,
    lang: "",
    onresult: null as ((event: unknown) => void) | null,
    onend: null as (() => void) | null,
    onerror: null as ((event: unknown) => void) | null,
    start: vi.fn(),
    stop: vi.fn(),
    abort: vi.fn(),
  };
}

let mockRecognition: ReturnType<typeof createMockRecognition>;

beforeEach(() => {
  mockRecognition = createMockRecognition();
  // Must use a real function (not arrow) so it works as a constructor with `new`
  function MockSpeechRecognition() {
    return mockRecognition;
  }
  Object.defineProperty(window, "SpeechRecognition", {
    value: MockSpeechRecognition,
    writable: true,
    configurable: true,
  });
  Object.defineProperty(window, "webkitSpeechRecognition", {
    value: undefined,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(window, "SpeechRecognition", {
    value: undefined,
    writable: true,
    configurable: true,
  });
});

describe("useSpeechRecognition", () => {
  it("reports isSupported true when SpeechRecognition exists", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(true);
  });

  it("reports isSupported false when SpeechRecognition is missing", () => {
    Object.defineProperty(window, "SpeechRecognition", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(false);
  });

  it("detects webkitSpeechRecognition as fallback", () => {
    Object.defineProperty(window, "SpeechRecognition", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    function MockWebkit() {
      return mockRecognition;
    }
    Object.defineProperty(window, "webkitSpeechRecognition", {
      value: MockWebkit,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isSupported).toBe(true);
  });

  it("configures recognition with correct defaults", () => {
    renderHook(() => useSpeechRecognition());
    expect(mockRecognition.continuous).toBe(false);
    expect(mockRecognition.interimResults).toBe(true);
    expect(mockRecognition.lang).toBe("en-US");
  });

  it("starts in idle state", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    expect(result.current.isListening).toBe(false);
    expect(result.current.transcript).toBe("");
  });

  it("sets isListening to true on startListening", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.startListening();
    });
    expect(result.current.isListening).toBe(true);
    expect(mockRecognition.start).toHaveBeenCalled();
  });

  it("calls recognition.stop on stopListening", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.startListening();
    });
    act(() => {
      result.current.stopListening();
    });
    expect(mockRecognition.stop).toHaveBeenCalled();
  });

  it("updates transcript on result event", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.startListening();
    });
    act(() => {
      mockRecognition.onresult?.({
        results: [{ 0: { transcript: "hello world" }, length: 1 }],
        length: 1,
      });
    });
    expect(result.current.transcript).toBe("hello world");
  });

  it("concatenates multiple result entries", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.startListening();
    });
    act(() => {
      mockRecognition.onresult?.({
        results: [
          { 0: { transcript: "hello " }, length: 1 },
          { 0: { transcript: "world" }, length: 1 },
        ],
        length: 2,
      });
    });
    expect(result.current.transcript).toBe("hello world");
  });

  it("sets isListening to false on end event", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.startListening();
    });
    expect(result.current.isListening).toBe(true);
    act(() => {
      mockRecognition.onend?.();
    });
    expect(result.current.isListening).toBe(false);
  });

  it("sets isListening to false on error event", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.startListening();
    });
    act(() => {
      mockRecognition.onerror?.({ error: "not-allowed" });
    });
    expect(result.current.isListening).toBe(false);
  });

  it("resets transcript on resetTranscript", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.startListening();
    });
    act(() => {
      mockRecognition.onresult?.({
        results: [{ 0: { transcript: "some text" }, length: 1 }],
        length: 1,
      });
    });
    expect(result.current.transcript).toBe("some text");
    act(() => {
      result.current.resetTranscript();
    });
    expect(result.current.transcript).toBe("");
  });

  it("clears transcript when startListening is called", () => {
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.startListening();
    });
    act(() => {
      mockRecognition.onresult?.({
        results: [{ 0: { transcript: "old text" }, length: 1 }],
        length: 1,
      });
    });
    expect(result.current.transcript).toBe("old text");
    act(() => {
      mockRecognition.onend?.();
    });
    act(() => {
      result.current.startListening();
    });
    expect(result.current.transcript).toBe("");
  });

  it("aborts recognition on unmount", () => {
    const { unmount } = renderHook(() => useSpeechRecognition());
    unmount();
    expect(mockRecognition.abort).toHaveBeenCalled();
  });

  it("does nothing on startListening when not supported", () => {
    Object.defineProperty(window, "SpeechRecognition", {
      value: undefined,
      writable: true,
      configurable: true,
    });
    const { result } = renderHook(() => useSpeechRecognition());
    act(() => {
      result.current.startListening();
    });
    expect(result.current.isListening).toBe(false);
  });
});
