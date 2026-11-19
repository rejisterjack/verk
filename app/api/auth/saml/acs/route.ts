import { NextResponse } from "next/server";

import { rateLimitShared } from "@/lib/rate-limit";
import { createSamlClient, safeCallbackPath, samlEnv } from "@/lib/saml";
import {
  loginFromSamlProfile,
  SAML_ERROR_CODE,
} from "@/lib/services/saml-login";

function fail(request: Request, code: string) {
  const url = new URL("/login", request.url);

  url.searchParams.set("error", code);

  // 303 so the browser turns the IdP's POST into a GET.
  return NextResponse.redirect(url, 303);
}

/**
 * Assertion Consumer Service. The IdP POSTs the signed response here.
 * node-saml checks the signature, audience, validity window, InResponseTo and replay;
 * anything it rejects, or that fails Verk's own rules, lands on /login with an error.
 */
export async function POST(request: Request) {
  const env = samlEnv();

  if (!env) return new Response(null, { status: 404 });
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";

  if (!(await rateLimitShared(`saml-acs:${ip}`, 30)).ok) {
    return Response.json({ error: "Too many requests" }, { status: 429 });
  }

  let form: FormData;

  try {
    form = await request.formData();
  } catch {
    return fail(request, SAML_ERROR_CODE.invalid_response);
  }
  const samlResponse = form.get("SAMLResponse");

  if (typeof samlResponse !== "string" || !samlResponse) {
    return fail(request, SAML_ERROR_CODE.invalid_response);
  }
  const relayState = form.get("RelayState");
  const saml = await createSamlClient(env);
  let profile;

  try {
    ({ profile } = await saml!.validatePostResponseAsync({
      SAMLResponse: samlResponse,
    }));
  } catch {
    // Bad signature, wrong audience, expired, replayed, unsolicited... all the same to the user.
    return fail(request, SAML_ERROR_CODE.invalid_response);
  }
  if (!profile) return fail(request, SAML_ERROR_CODE.invalid_response);

  const result = await loginFromSamlProfile(profile, env);

  if (!result.ok) return fail(request, SAML_ERROR_CODE[result.reason]);

  // Hand the signed ticket to the Auth.js `saml` provider, which creates the session.
  const url = new URL("/api/auth/saml/complete", request.url);

  url.searchParams.set("ticket", result.ticket);
  url.searchParams.set(
    "callbackUrl",
    safeCallbackPath(typeof relayState === "string" ? relayState : null),
  );

  return NextResponse.redirect(url, 303);
}
