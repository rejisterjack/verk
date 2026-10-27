import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { NextRequest } from "next/server";

import { createVerkMcpServer } from "@/lib/mcp/server";
import { resolveApiKey } from "@/lib/services/api-keys";

export const runtime = "nodejs";

async function handle(request: NextRequest) {
  const header = request.headers.get("authorization");

  if (!header?.startsWith("Bearer ")) {
    return Response.json(
      { error: "Missing Bearer API key", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }
  const token = header.slice("Bearer ".length).trim();
  const apiKey = await resolveApiKey(token);

  if (!apiKey) {
    return Response.json(
      { error: "Invalid API key", code: "UNAUTHORIZED" },
      { status: 401 },
    );
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  const server = createVerkMcpServer({
    teamId: apiKey.teamId,
    userId: apiKey.createdById,
  });

  await server.connect(transport);

  return transport.handleRequest(request);
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}

export async function DELETE(request: NextRequest) {
  return handle(request);
}
