/**
 * Session usage tools — tool payload estimates + recorded model token totals.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { textContent } from "../types.js";
import { usageSession, type ModelUsageReport } from "../usage.js";

export function registerUsageTools(server: McpServer): void {
  server.registerTool(
    "woo_usage_stats",
    {
      title: "Get usage stats",
      description:
        "Returns token/usage statistics for this MCP server session: estimated tool-response tokens and any model (LLM) usage reports recorded by a host bridge (e.g. Anthropic). Use after multi-step agent work to audit cost.",
      inputSchema: {
        reset: z
          .boolean()
          .optional()
          .describe("If true, reset session counters after returning the snapshot"),
      },
    },
    async (args) => {
      const snapshot = usageSession.snapshot();
      const payload = {
        tools: snapshot.tools,
        models: snapshot.models,
      };
      if (args.reset) usageSession.reset();
      // Avoid recursive inflation: this tool's own usage is still attached by textContent
      return textContent(payload, { tool: "woo_usage_stats" });
    },
  );

  server.registerTool(
    "woo_model_usage_record",
    {
      title: "Record model token usage",
      description:
        "Records LLM token usage from a host model call (Anthropic/OpenAI-style) into the MCP session so woo_usage_stats can report it. Call this after each model round when your agent host tracks usage outside the MCP server.",
      inputSchema: {
        provider: z
          .string()
          .default("anthropic")
          .optional()
          .describe("Model provider id. Example: anthropic"),
        model: z.string().optional().describe("Model id. Example: claude-haiku-4-5-20251001"),
        input_tokens: z.number().int().min(0).describe("Prompt/input tokens for this round"),
        output_tokens: z.number().int().min(0).describe("Completion/output tokens for this round"),
        cache_creation_input_tokens: z.number().int().min(0).optional(),
        cache_read_input_tokens: z.number().int().min(0).optional(),
        stop_reason: z.string().optional().describe("Model stop reason if available"),
        round: z.number().int().min(1).optional().describe("1-based round index"),
      },
    },
    async (args) => {
      const input = args.input_tokens;
      const output = args.output_tokens;
      const report: ModelUsageReport = {
        provider: args.provider ?? "anthropic",
        rounds: [
          {
            round: args.round ?? 1,
            model: args.model,
            input_tokens: input,
            output_tokens: output,
            cache_creation_input_tokens: args.cache_creation_input_tokens ?? 0,
            cache_read_input_tokens: args.cache_read_input_tokens ?? 0,
            stop_reason: args.stop_reason ?? null,
          },
        ],
        totals: {
          rounds: 1,
          input_tokens: input,
          output_tokens: output,
          cache_creation_input_tokens: args.cache_creation_input_tokens ?? 0,
          cache_read_input_tokens: args.cache_read_input_tokens ?? 0,
          total_tokens: input + output,
          by_model: {
            [args.model || "unknown"]: {
              rounds: 1,
              input_tokens: input,
              output_tokens: output,
              total_tokens: input + output,
            },
          },
        },
      };
      usageSession.recordModelReport(report);
      return textContent(
        {
          recorded: true,
          report,
          session: usageSession.snapshot().models,
        },
        { tool: "woo_model_usage_record" },
      );
    },
  );
}
