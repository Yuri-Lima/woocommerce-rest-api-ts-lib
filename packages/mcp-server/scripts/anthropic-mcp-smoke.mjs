/**
 * Low-token Anthropic ↔ woo-mcp-server smoke test.
 *
 * Always returns structured model token usage (per-round + totals).
 * After the loop, records usage into MCP via woo_model_usage_record and
 * prints woo_usage_stats so hosts see both model and tool payload costs.
 *
 * Usage:
 *   export ANTHROPIC_API_KEY=sk-ant-...
 *   export WC_URL=... WC_KEY=... WC_SECRET=...
 *   node scripts/anthropic-mcp-smoke.mjs
 *
 * Env:
 *   ANTHROPIC_MODEL   default claude-haiku-4-5-20251001
 *   ANTHROPIC_MAX_TOKENS default 256
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { createServer, ModelUsageTracker } from "../dist/server.js";

const API_KEY = process.env.ANTHROPIC_API_KEY;
const MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS || 256);

if (!API_KEY) {
  console.error("Missing ANTHROPIC_API_KEY");
  process.exit(1);
}
for (const k of ["WC_URL", "WC_KEY", "WC_SECRET"]) {
  if (!process.env[k]) {
    console.error(`Missing ${k}`);
    process.exit(1);
  }
}
if (process.env.WC_URL?.startsWith("http://")) {
  process.env.WC_QUERY_STRING_AUTH = "false";
}

/** Only expose high-signal read tools to keep Anthropic input tiny. */
const ALLOWED = new Set([
  "woo_products_list",
  "woo_products_search",
  "woo_orders_list",
  "woo_reports_orders_totals",
  "woo_usage_stats",
  "woo_model_usage_record",
]);

function mcpToolToAnthropic(tool) {
  return {
    name: tool.name,
    description: (tool.description || "").slice(0, 280),
    input_schema: tool.inputSchema || { type: "object", properties: {} },
  };
}

async function anthropicMessages(body) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    const err = new Error(`Anthropic HTTP ${res.status}: ${msg}`);
    err.data = data;
    throw err;
  }
  return data;
}

async function callMcp(client, name, args = {}) {
  const result = await client.callTool({ name, arguments: args });
  const text = result.content?.[0]?.text ?? "";
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return {
    isError: Boolean(result.isError),
    data,
    text,
    meta: result._meta,
    raw: result,
  };
}

async function main() {
  const mcp = createServer();
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await mcp.server.connect(serverTransport);
  const client = new Client({ name: "anthropic-smoke", version: "1.0.0" });
  await client.connect(clientTransport);

  const modelUsage = new ModelUsageTracker("anthropic");
  const listed = await client.listTools();
  const tools = listed.tools
    .filter((t) => ALLOWED.has(t.name) && !t.name.startsWith("woo_model") && t.name !== "woo_usage_stats")
    .map(mcpToolToAnthropic);
  console.log(`MCP tools exposed to Claude: ${tools.map((t) => t.name).join(", ")}`);

  const messages = [
    {
      role: "user",
      content:
        "Using tools only: list 2 products. Reply with product names only, one per line. No preamble.",
    },
  ];

  let response;
  try {
    response = await anthropicMessages({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      tools,
      messages,
    });
  } catch (e) {
    console.error("Anthropic call failed:", e.message);
    if (e.data) console.error(JSON.stringify(e.data, null, 2));
    // Still emit usage report shape (empty) for hosts that parse stdout JSON
    console.log(
      "\n--- TOKEN USAGE ---\n" +
        JSON.stringify(
          {
            model_usage: modelUsage.finalize(),
            error: e.message,
          },
          null,
          2,
        ),
    );
    await client.close().catch(() => undefined);
    await mcp.server.close().catch(() => undefined);
    process.exit(2);
  }

  const round1 = modelUsage.addRound(response.usage, {
    model: MODEL,
    stop_reason: response.stop_reason,
  });
  console.log("round usage:", round1);

  // Tool-use loop (max 2 rounds)
  for (let i = 0; i < 2; i++) {
    const toolUses = (response.content || []).filter((b) => b.type === "tool_use");
    if (!toolUses.length) break;

    const toolResults = [];
    for (const tu of toolUses) {
      console.log(`tool_use → ${tu.name}`, JSON.stringify(tu.input));
      const result = await client.callTool({
        name: tu.name,
        arguments: tu.input || {},
      });
      const text = result.content?.[0]?.text ?? JSON.stringify(result);
      const clipped = text.length > 1500 ? text.slice(0, 1500) + "…" : text;
      const toolUsage = result._meta?.["woo.usage"];
      toolResults.push({
        type: "tool_result",
        tool_use_id: tu.id,
        content: clipped,
        is_error: Boolean(result.isError),
      });
      console.log(
        `tool_result ← ${tu.name} (chars=${clipped.length}, error=${Boolean(result.isError)}, tool_usage=${JSON.stringify(toolUsage || null)})`,
      );
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: toolResults });

    response = await anthropicMessages({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      tools,
      messages,
    });
    const round = modelUsage.addRound(response.usage, {
      model: MODEL,
      stop_reason: response.stop_reason,
    });
    console.log("round usage:", round);
  }

  const text = (response.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
  console.log("\n--- Claude final text ---\n" + text);

  // finalize() persists one multi-round report into the MCP session (no per-round double count)
  const model_usage = modelUsage.finalize();

  const session = await callMcp(client, "woo_usage_stats", {});
  const report = {
    final_text: text,
    model_usage,
    mcp_session_usage: session.data,
    note: "model_usage = Anthropic API tokens; mcp_session_usage.tools = estimated tool payload tokens",
  };

  console.log("\n--- TOKEN USAGE ---\n" + JSON.stringify(report.model_usage, null, 2));
  console.log("\n--- MCP SESSION USAGE ---\n" + JSON.stringify(session.data, null, 2));
  console.log("\n--- FULL REPORT (JSON) ---\n" + JSON.stringify(report, null, 2));

  await client.close().catch(() => undefined);
  await mcp.server.close().catch(() => undefined);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
