/**
 * Usage tracking for MCP tool payloads and host model (LLM) calls.
 *
 * Tool responses always carry estimated token cost of the returned payload so
 * agents can stay cost-aware. Model token usage (Anthropic/OpenAI/etc.) is
 * aggregated when a host reports rounds via ModelUsageTracker.
 */

/** Rough but stable estimate: ~4 characters per token for JSON/English. */
export function estimateTokensFromText(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

export interface ToolPayloadUsage {
  /** Characters in the serialized tool response body */
  response_chars: number;
  /** Estimated tokens for the tool response (payload only) */
  estimated_response_tokens: number;
  /** ISO timestamp when the tool result was produced */
  at: string;
}

export interface ToolCallUsageRecord extends ToolPayloadUsage {
  tool?: string;
  is_error?: boolean;
}

export interface SessionToolUsage {
  tool_calls: number;
  error_calls: number;
  total_response_chars: number;
  total_estimated_response_tokens: number;
  by_tool: Record<
    string,
    {
      calls: number;
      errors: number;
      response_chars: number;
      estimated_response_tokens: number;
    }
  >;
  recent: ToolCallUsageRecord[];
}

export interface ModelRoundUsage {
  round: number;
  model?: string;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
  stop_reason?: string | null;
}

export interface ModelUsageTotals {
  rounds: number;
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
  /** input + output (excludes cache accounting duplicates) */
  total_tokens: number;
  by_model: Record<
    string,
    { rounds: number; input_tokens: number; output_tokens: number; total_tokens: number }
  >;
}

export interface ModelUsageReport {
  provider: string;
  rounds: ModelRoundUsage[];
  totals: ModelUsageTotals;
}

const MAX_RECENT = 50;

/** Process-wide session counters for this MCP server instance. */
class UsageSession {
  private toolCalls = 0;
  private errorCalls = 0;
  private totalResponseChars = 0;
  private totalEstimatedTokens = 0;
  private byTool: SessionToolUsage["by_tool"] = {};
  private recent: ToolCallUsageRecord[] = [];
  private modelReports: ModelUsageReport[] = [];

  recordTool(record: ToolCallUsageRecord): void {
    this.toolCalls += 1;
    if (record.is_error) this.errorCalls += 1;
    this.totalResponseChars += record.response_chars;
    this.totalEstimatedTokens += record.estimated_response_tokens;

    const key = record.tool || "unknown";
    const bucket = this.byTool[key] ?? {
      calls: 0,
      errors: 0,
      response_chars: 0,
      estimated_response_tokens: 0,
    };
    bucket.calls += 1;
    if (record.is_error) bucket.errors += 1;
    bucket.response_chars += record.response_chars;
    bucket.estimated_response_tokens += record.estimated_response_tokens;
    this.byTool[key] = bucket;

    this.recent.push(record);
    if (this.recent.length > MAX_RECENT) this.recent.shift();
  }

  recordModelReport(report: ModelUsageReport): void {
    this.modelReports.push(report);
    if (this.modelReports.length > 20) this.modelReports.shift();
  }

  snapshot(): {
    tools: SessionToolUsage;
    models: {
      reports: number;
      last?: ModelUsageReport;
      totals: ModelUsageTotals;
    };
  } {
    const modelTotals = emptyModelTotals();
    for (const report of this.modelReports) {
      mergeModelTotals(modelTotals, report.totals);
    }
    return {
      tools: {
        tool_calls: this.toolCalls,
        error_calls: this.errorCalls,
        total_response_chars: this.totalResponseChars,
        total_estimated_response_tokens: this.totalEstimatedTokens,
        by_tool: { ...this.byTool },
        recent: [...this.recent],
      },
      models: {
        reports: this.modelReports.length,
        last: this.modelReports[this.modelReports.length - 1],
        totals: modelTotals,
      },
    };
  }

  reset(): void {
    this.toolCalls = 0;
    this.errorCalls = 0;
    this.totalResponseChars = 0;
    this.totalEstimatedTokens = 0;
    this.byTool = {};
    this.recent = [];
    this.modelReports = [];
  }
}

export const usageSession = new UsageSession();

export function buildToolPayloadUsage(text: string): ToolPayloadUsage {
  return {
    response_chars: text.length,
    estimated_response_tokens: estimateTokensFromText(text),
    at: new Date().toISOString(),
  };
}

export function recordToolUsage(
  text: string,
  options: { tool?: string; is_error?: boolean } = {},
): ToolPayloadUsage {
  const usage = buildToolPayloadUsage(text);
  usageSession.recordTool({
    ...usage,
    tool: options.tool,
    is_error: options.is_error,
  });
  return usage;
}

/** MCP `_meta` fragment for tool/error results. */
export function usageMetaForText(
  text: string,
  options: { tool?: string; is_error?: boolean } = {},
): {
  "woo.usage": ToolPayloadUsage & { tool?: string; is_error?: boolean };
} {
  const usage = recordToolUsage(text, options);
  return {
    "woo.usage": {
      ...usage,
      ...(options.tool ? { tool: options.tool } : {}),
      ...(options.is_error ? { is_error: true } : {}),
    },
  };
}

function emptyModelTotals(): ModelUsageTotals {
  return {
    rounds: 0,
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
    total_tokens: 0,
    by_model: {},
  };
}

function mergeModelTotals(into: ModelUsageTotals, add: ModelUsageTotals): void {
  into.rounds += add.rounds;
  into.input_tokens += add.input_tokens;
  into.output_tokens += add.output_tokens;
  into.cache_creation_input_tokens += add.cache_creation_input_tokens;
  into.cache_read_input_tokens += add.cache_read_input_tokens;
  into.total_tokens += add.total_tokens;
  for (const [model, stats] of Object.entries(add.by_model)) {
    const cur = into.by_model[model] ?? {
      rounds: 0,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
    };
    cur.rounds += stats.rounds;
    cur.input_tokens += stats.input_tokens;
    cur.output_tokens += stats.output_tokens;
    cur.total_tokens += stats.total_tokens;
    into.by_model[model] = cur;
  }
}

/**
 * Aggregates Anthropic/OpenAI-style `usage` objects from multi-round tool loops.
 * Always call `finalize()` and include the report in the host response.
 */
export class ModelUsageTracker {
  private rounds: ModelRoundUsage[] = [];
  private readonly provider: string;

  constructor(provider = "anthropic") {
    this.provider = provider;
  }

  /**
   * Record one model API response.
   * Accepts Anthropic (`input_tokens`/`output_tokens`) shapes.
   */
  addRound(
    usage: {
      input_tokens?: number;
      output_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      prompt_tokens?: number;
      completion_tokens?: number;
    } | null
      | undefined,
    options: { model?: string; stop_reason?: string | null } = {},
  ): ModelRoundUsage {
    const input =
      usage?.input_tokens ?? usage?.prompt_tokens ?? 0;
    const output =
      usage?.output_tokens ?? usage?.completion_tokens ?? 0;
    const round: ModelRoundUsage = {
      round: this.rounds.length + 1,
      model: options.model,
      input_tokens: Number(input) || 0,
      output_tokens: Number(output) || 0,
      cache_creation_input_tokens: usage?.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: usage?.cache_read_input_tokens ?? 0,
      stop_reason: options.stop_reason ?? null,
    };
    this.rounds.push(round);
    return round;
  }

  finalize(): ModelUsageReport {
    const totals = emptyModelTotals();
    totals.rounds = this.rounds.length;
    for (const r of this.rounds) {
      totals.input_tokens += r.input_tokens;
      totals.output_tokens += r.output_tokens;
      totals.cache_creation_input_tokens += r.cache_creation_input_tokens ?? 0;
      totals.cache_read_input_tokens += r.cache_read_input_tokens ?? 0;
      const model = r.model || "unknown";
      const cur = totals.by_model[model] ?? {
        rounds: 0,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
      };
      cur.rounds += 1;
      cur.input_tokens += r.input_tokens;
      cur.output_tokens += r.output_tokens;
      cur.total_tokens += r.input_tokens + r.output_tokens;
      totals.by_model[model] = cur;
    }
    totals.total_tokens = totals.input_tokens + totals.output_tokens;

    const report: ModelUsageReport = {
      provider: this.provider,
      rounds: [...this.rounds],
      totals,
    };
    usageSession.recordModelReport(report);
    return report;
  }
}
