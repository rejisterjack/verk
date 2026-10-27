/**
 * Smoke-test Verk MCP tools against a running server.
 * Usage: VERK_BASE_URL=http://localhost:3000 VERK_API_KEY=verk_... npm run mcp:smoke
 */

export {};

const baseUrl = process.env.VERK_BASE_URL ?? "http://localhost:3000";
const apiKey = process.env.VERK_API_KEY;

if (!apiKey) {
  console.error("Set VERK_API_KEY");
  process.exit(1);
}

async function mcpCall(method: string, params?: Record<string, unknown>) {
  const res = await fetch(`${baseUrl}/api/mcp`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: crypto.randomUUID(),
      method,
      params: params ?? {},
    }),
  });
  const text = await res.text();
  console.log(method, res.status, text.slice(0, 500));
  if (!res.ok) process.exitCode = 1;
}

await mcpCall("initialize", {
  protocolVersion: "2024-11-05",
  capabilities: {},
  clientInfo: { name: "verk-smoke", version: "0.1.0" },
});
await mcpCall("tools/list");
await mcpCall("tools/call", {
  name: "list_issues",
  arguments: { take: 5 },
});

console.log("MCP smoke finished");
