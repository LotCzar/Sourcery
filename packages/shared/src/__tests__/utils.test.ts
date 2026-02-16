import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatRelativeTime,
  generateOrderNumber,
  slugify,
  titleCase,
  truncate,
  percentageChange,
  isEmpty,
  deepClone,
} from "../utils";

describe("formatCurrency", () => {
  it("formats USD by default", () => {
    expect(formatCurrency(10.5)).toBe("$10.50");
  });

  it("formats zero", () => {
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("formats large numbers with commas", () => {
    expect(formatCurrency(1234567.89)).toBe("$1,234,567.89");
  });
});

describe("formatDate", () => {
  it("formats a Date object", () => {
    const date = new Date("2024-06-15T12:00:00Z");
    const result = formatDate(date);
    expect(result).toContain("Jun");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });

  it("formats a date string", () => {
    const result = formatDate("2024-06-15T12:00:00Z");
    expect(result).toContain("Jun");
    expect(result).toContain("15");
    expect(result).toContain("2024");
  });

  it("accepts custom options", () => {
    const date = new Date("2024-06-15T12:00:00Z");
    const result = formatDate(date, { year: "numeric", month: "long" });
    expect(result).toContain("June");
    expect(result).toContain("2024");
  });
});

describe("formatRelativeTime", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-15T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for current time", () => {
    const now = new Date("2024-06-15T12:00:00Z");
    expect(formatRelativeTime(now)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinutesAgo = new Date("2024-06-15T11:55:00Z");
    expect(formatRelativeTime(fiveMinutesAgo)).toBe("5 minutes ago");
  });

  it("returns singular minute", () => {
    const oneMinuteAgo = new Date("2024-06-15T11:59:00Z");
    expect(formatRelativeTime(oneMinuteAgo)).toBe("1 minute ago");
  });

  it("returns hours ago", () => {
    const threeHoursAgo = new Date("2024-06-15T09:00:00Z");
    expect(formatRelativeTime(threeHoursAgo)).toBe("3 hours ago");
  });

  it("returns days ago", () => {
    const twoDaysAgo = new Date("2024-06-13T12:00:00Z");
    expect(formatRelativeTime(twoDaysAgo)).toBe("2 days ago");
  });
});

describe("generateOrderNumber", () => {
  it("starts with ORD-", () => {
    const orderNumber = generateOrderNumber();
    expect(orderNumber).toMatch(/^ORD-/);
  });

  it("generates unique values", () => {
    const numbers = new Set(
      Array.from({ length: 10 }, () => generateOrderNumber())
    );
    expect(numbers.size).toBe(10);
  });
});

describe("slugify", () => {
  it("converts to lowercase", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("removes special characters", () => {
    expect(slugify("Hello! World@#$")).toBe("hello-world");
  });

  it("collapses multiple separators", () => {
    expect(slugify("hello   world--test")).toBe("hello-world-test");
  });

  it("trims leading/trailing hyphens", () => {
    expect(slugify("--hello world--")).toBe("hello-world");
  });
});

describe("titleCase", () => {
  it("capitalizes each word", () => {
    expect(titleCase("hello world")).toBe("Hello World");
  });

  it("handles already uppercase input", () => {
    expect(titleCase("HELLO WORLD")).toBe("Hello World");
  });

  it("handles single word", () => {
    expect(titleCase("hello")).toBe("Hello");
  });
});

describe("truncate", () => {
  it("returns text unchanged when under limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates with ellipsis when over limit", () => {
    expect(truncate("hello world this is long", 10)).toBe("hello w...");
  });

  it("returns text unchanged when exactly at limit", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

describe("percentageChange", () => {
  it("calculates positive change", () => {
    const result = percentageChange(100, 150);
    expect(result.value).toBe(50);
    expect(result.formatted).toBe("+50.0%");
  });

  it("calculates negative change", () => {
    const result = percentageChange(100, 75);
    expect(result.value).toBe(-25);
    expect(result.formatted).toBe("-25.0%");
  });

  it("handles zero old value", () => {
    const result = percentageChange(0, 50);
    expect(result.value).toBe(0);
    expect(result.formatted).toBe("0%");
  });

  it("handles no change", () => {
    const result = percentageChange(100, 100);
    expect(result.value).toBe(0);
    expect(result.formatted).toBe("+0.0%");
  });
});

describe("isEmpty", () => {
  it("returns true for null", () => {
    expect(isEmpty(null)).toBe(true);
  });

  it("returns true for undefined", () => {
    expect(isEmpty(undefined)).toBe(true);
  });

  it("returns true for empty string", () => {
    expect(isEmpty("")).toBe(true);
  });

  it("returns true for whitespace-only string", () => {
    expect(isEmpty("   ")).toBe(true);
  });

  it("returns true for empty array", () => {
    expect(isEmpty([])).toBe(true);
  });

  it("returns true for empty object", () => {
    expect(isEmpty({})).toBe(true);
  });

  it("returns false for non-empty string", () => {
    expect(isEmpty("hello")).toBe(false);
  });

  it("returns false for non-empty array", () => {
    expect(isEmpty([1])).toBe(false);
  });

  it("returns false for non-empty object", () => {
    expect(isEmpty({ a: 1 })).toBe(false);
  });

  it("returns false for numbers", () => {
    expect(isEmpty(0)).toBe(false);
    expect(isEmpty(42)).toBe(false);
  });
});

describe("deepClone", () => {
  it("creates a deep copy", () => {
    const original = { a: { b: { c: 1 } }, d: [1, 2, 3] };
    const clone = deepClone(original);

    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
    expect(clone.a).not.toBe(original.a);
    expect(clone.a.b).not.toBe(original.a.b);
    expect(clone.d).not.toBe(original.d);
  });

  it("isolates mutations", () => {
    const original = { a: { b: 1 } };
    const clone = deepClone(original);

    clone.a.b = 999;
    expect(original.a.b).toBe(1);
  });
});
