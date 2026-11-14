import { AuthError } from "next-auth";
import { NextResponse } from "next/server";

import { signIn } from "@/lib/auth";
import {
  safeCallbackPath,
  SAML_PROVIDER_ID,
  verifySamlTicket,
} from "@/lib/saml";

function toLogin(request: Request, code: string) {
  const login = new URL("/login", request.url);

  login.searchParams.set("error", code);

  return NextResponse.redirect(login);
}

/**
 * Redeem the short-lived ticket minted by the ACS route and start the Auth.js session.
 * Doing it here, not in the ACS route, keeps the IdP's cross-site POST away from session cookies.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ticket = url.searchParams.get("ticket") ?? "";
  const callbackUrl = safeCallbackPath(url.searchParams.get("callbackUrl"));

  if (!verifySamlTicket(ticket)) return toLogin(request, "SamlInvalid");

  try {
    // On success `signIn` sets the session cookie and throws a redirect to `redirectTo`.
    await signIn(SAML_PROVIDER_ID, { ticket, redirectTo: callbackUrl });
  } catch (error) {
    // A rejected ticket (disabled user, private host...) arrives as an AuthError.
    if (error instanceof AuthError) return toLogin(request, "SamlInvalid");
    // Anything else is the framework's redirect. Let it through.
    throw error;
  }

  return NextResponse.redirect(new URL(callbackUrl, request.url));
}
