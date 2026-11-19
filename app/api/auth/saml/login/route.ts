import { NextResponse } from "next/server";

import { rateLimitShared } from "@/lib/rate-limit";
import { createSamlClient, safeCallbackPath, samlEnv } from "@/lib/saml";

/** Start SP-initiated login: redirect the browser to the IdP with a signed-in-later RelayState. */
export async function GET(request: Request) {
  const env = samlEnv();

  if (!env) return new Response(null, { status: 404 });
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (!(await rateLimitShared(`saml-login:${ip}`, 30)).ok) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }
  const callbackUrl = safeCallbackPath(
    new URL(request.url).searchParams.get("callbackUrl"),
  );
  const saml = await createSamlClient(env);
  const redirect = await saml!.getAuthorizeUrlAsync(callbackUrl, undefined, {});

  return NextResponse.redirect(redirect);
}
