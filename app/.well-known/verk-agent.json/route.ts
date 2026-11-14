import { agentManifest } from "@/lib/agent-work";

/** Public, static description of the APIs, for agents and tools to discover. */
export function GET(request: Request) {
  const origin =
    process.env.AUTH_URL ??
    `https://${request.headers.get("host") ?? "localhost"}`;

  return Response.json(agentManifest(origin), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
