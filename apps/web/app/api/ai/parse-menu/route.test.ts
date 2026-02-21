import { describe, it, expect, beforeEach, vi } from "vitest";
import { mockAuth } from "@/__tests__/mocks/clerk";
import {
  mockAnthropicClient,
  mockAnthropicCreate,
} from "@/__tests__/mocks/anthropic";
import { getAnthropicClient } from "@/lib/anthropic";

const { mockValidateBody } = vi.hoisted(() => ({
  mockValidateBody: vi.fn(),
}));
vi.mock("@/lib/validations/validate", () => ({
  validateBody: mockValidateBody,
}));

import { POST } from "./route";
import { NextResponse } from "next/server";

function createParseMenuRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/ai/parse-menu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/ai/parse-menu", () => {
  beforeEach(() => {
    mockAuth.mockResolvedValue({ userId: "clerk_test_user_123" });
    (getAnthropicClient as ReturnType<typeof vi.fn>).mockReturnValue(
      mockAnthropicClient
    );
  });

  it("returns 503 when Anthropic not configured", async () => {
    (getAnthropicClient as ReturnType<typeof vi.fn>).mockReturnValue(null);

    const request = createParseMenuRequest({
      menuText: "Caesar Salad",
      menuType: "restaurant",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.error).toBe("AI service not configured");
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.mockResolvedValue({ userId: null });

    const request = createParseMenuRequest({
      menuText: "Caesar Salad",
      menuType: "restaurant",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("returns validation error when body is invalid", async () => {
    mockValidateBody.mockReturnValue({
      success: false,
      response: NextResponse.json(
        { error: "Validation failed", details: { menuText: ["Required"] } },
        { status: 400 }
      ),
    });

    const request = createParseMenuRequest({});
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("Validation failed");
  });

  it("parses menu successfully with valid JSON response", async () => {
    const parsedResult = {
      menuItems: [
        {
          name: "Caesar Salad",
          description: "Classic caesar",
          ingredients: [
            {
              name: "Romaine Lettuce",
              category: "PRODUCE",
              estimatedQuantity: "1 head",
              unit: "EACH",
            },
          ],
        },
      ],
      summary: {
        totalDishes: 1,
        totalIngredients: 1,
        categories: { PRODUCE: 1 },
      },
    };

    mockValidateBody.mockReturnValue({
      success: true,
      data: { menuText: "Caesar Salad - romaine, parmesan", menuType: "restaurant" },
    });
    mockAnthropicCreate.mockResolvedValue({
      content: [{ type: "text", text: JSON.stringify(parsedResult) }],
    });

    const request = createParseMenuRequest({
      menuText: "Caesar Salad - romaine, parmesan",
      menuType: "restaurant",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.parsed).toBe(true);
    expect(data.data.menuItems).toHaveLength(1);
    expect(data.data.menuItems[0].name).toBe("Caesar Salad");
  });

  it("extracts JSON from markdown code blocks", async () => {
    const parsedResult = {
      menuItems: [{ name: "Soup", description: "Tomato soup", ingredients: [] }],
      summary: { totalDishes: 1, totalIngredients: 0, categories: {} },
    };

    mockValidateBody.mockReturnValue({
      success: true,
      data: { menuText: "Tomato Soup", menuType: "restaurant" },
    });
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: `Here's the analysis:\n\n\`\`\`json\n${JSON.stringify(parsedResult)}\n\`\`\``,
        },
      ],
    });

    const request = createParseMenuRequest({
      menuText: "Tomato Soup",
      menuType: "restaurant",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.parsed).toBe(true);
    expect(data.data.menuItems[0].name).toBe("Soup");
  });

  it("returns raw response when JSON parsing fails", async () => {
    mockValidateBody.mockReturnValue({
      success: true,
      data: { menuText: "Some menu", menuType: "restaurant" },
    });
    mockAnthropicCreate.mockResolvedValue({
      content: [
        {
          type: "text",
          text: "I could not parse this menu. Please provide more details.",
        },
      ],
    });

    const request = createParseMenuRequest({
      menuText: "Some menu",
      menuType: "restaurant",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.parsed).toBe(false);
    expect(data.rawResponse).toBe(
      "I could not parse this menu. Please provide more details."
    );
  });

  it("returns 500 on Anthropic API error", async () => {
    mockValidateBody.mockReturnValue({
      success: true,
      data: { menuText: "Menu text", menuType: "restaurant" },
    });
    mockAnthropicCreate.mockRejectedValue(new Error("Anthropic API down"));

    const request = createParseMenuRequest({
      menuText: "Menu text",
      menuType: "restaurant",
    });
    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to parse menu");
  });
});
