import { NextRequest } from "next/server";

import { AuthError } from "@/lib/errors";
import { rateLimitShared } from "@/lib/rate-limit";
import { exchangeCode } from "@/lib/services/oauth";

function oauthError(error: string, status: number, description?: string) {
  return Response.json(
    { error, ...(description ? { error_description: description } : {}) },
    { status, headers: { "Cache-Control": "no-store", Pragma: "no-cache" } },
  );
}

/**
 * `POST application/x-www-form-urlencoded`:
 * grant_type=authorization_code, client_id, client_secret (confidential apps), code,
 * redirect_uri, code_verifier. Answers `{ access_token, token_type, scope, team_id }`.
 */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const limited = await rateLimitShared(`oauth-token:${ip}`, 30, 60_000);

  if (!limited.ok) return oauthError("slow_down", 429);
  let form: URLSearchParams;

  try {
    form = new URLSearchParams(await request.text());
  } catch {
    return oauthError("invalid_request", 400);
  }
  if (form.get("grant_type") !== "authorization_code") {
    return oauthError("unsupported_grant_type", 400);
  }
  const clientId = form.get("client_id") ?? "";
  const code = form.get("code") ?? "";
  const redirectUri = form.get("redirect_uri") ?? "";
  const codeVerifier = form.get("code_verifier") ?? "";

  if (!clientId || !code || !redirectUri || !codeVerifier) {
    return oauthError("invalid_request", 400, "Missing a required parameter");
  }
  try {
    const token = await exchangeCode({
      clientId,
      clientSecret: form.get("client_secret") ?? undefined,
      code,
      redirectUri,
      codeVerifier,
    });

    return Response.json(token, {
      headers: { "Cache-Control": "no-store", Pragma: "no-cache" },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return oauthError(
        error.message === "invalid_client" ? "invalid_client" : "invalid_grant",
        error.status,
      );
    }

    return oauthError("server_error", 500);
  }
}
