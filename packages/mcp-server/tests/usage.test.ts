import {
  ModelUsageTracker,
  estimateTokensFromText,
  usageSession,
} from "../src/usage.js";
import { textContent } from "../src/types.js";
import { toMcpToolError } from "../src/errors.js";
import { callTool, createMcpTestContext } from "./helpers.js";

describe("usage tracking", () => {
  beforeEach(() => {
    usageSession.reset();
  });

  it("estimates tokens from text length", () => {
    expect(estimateTokensFromText("")).toBe(0);
    expect(estimateTokensFromText("abcd")).toBe(1);
    expect(estimateTokensFromText("a".repeat(40))).toBe(10);
  });

  it("textContent always attaches usage on object payloads", () => {
    const result = textContent({ items: [1, 2], pagination: { total: 2 } });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.usage).toMatchObject({
      response_chars: expect.any(Number),
      estimated_response_tokens: expect.any(Number),
      at: expect.any(String),
    });
    expect(result._meta?.["woo.usage"].estimated_response_tokens).toBeGreaterThan(0);
    expect(usageSession.snapshot().tools.tool_calls).toBe(1);
  });

  it("textContent can skip usage when includeUsage=false", () => {
    const result = textContent({ ok: true }, { includeUsage: false });
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.usage).toBeUndefined();
    expect(result._meta).toBeUndefined();
  });

  it("toMcpToolError includes usage meta", () => {
    const payload = toMcpToolError(new Error("boom"));
    expect(payload.isError).toBe(true);
    expect(payload._meta?.["woo.usage"].is_error).toBe(true);
    expect(payload._meta?.["woo.usage"].estimated_response_tokens).toBeGreaterThan(0);
  });

  it("ModelUsageTracker always totals rounds", () => {
    const tracker = new ModelUsageTracker("anthropic");
    tracker.addRound(
      { input_tokens: 100, output_tokens: 10 },
      { model: "claude-haiku", stop_reason: "tool_use" },
    );
    tracker.addRound(
      { input_tokens: 200, output_tokens: 20 },
      { model: "claude-haiku", stop_reason: "end_turn" },
    );
    const report = tracker.finalize();
    expect(report.totals).toMatchObject({
      rounds: 2,
      input_tokens: 300,
      output_tokens: 30,
      total_tokens: 330,
    });
    expect(report.rounds).toHaveLength(2);
    expect(usageSession.snapshot().models.totals.total_tokens).toBe(330);
  });

  it("woo_usage_stats and woo_model_usage_record tools work", async () => {
    const ctx = await createMcpTestContext();
    try {
      // produce one tool payload usage via textContent path indirectly
      textContent({ hello: "world" }, { tool: "fixture" });

      const recorded = await callTool(ctx.client, "woo_model_usage_record", {
        provider: "anthropic",
        model: "claude-haiku",
        input_tokens: 50,
        output_tokens: 5,
        round: 1,
      });
      expect(recorded.isError).toBe(false);
      expect(recorded.data).toMatchObject({
        recorded: true,
        usage: expect.objectContaining({
          estimated_response_tokens: expect.any(Number),
        }),
      });

      const stats = await callTool(ctx.client, "woo_usage_stats", {});
      expect(stats.isError).toBe(false);
      expect(stats.data).toMatchObject({
        tools: expect.objectContaining({
          tool_calls: expect.any(Number),
        }),
        models: expect.objectContaining({
          totals: expect.objectContaining({
            input_tokens: 50,
            output_tokens: 5,
          }),
        }),
        usage: expect.any(Object),
      });
    } finally {
      await ctx.cleanup();
    }
  });
});
