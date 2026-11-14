import type { Profile } from "@node-saml/node-saml";

import { prisma } from "@/lib/db";
import { isPrivateHost } from "@/lib/auth-allowlist";
import {
  emailFromProfile,
  isDomainAllowed,
  mintSamlTicket,
  nameFromProfile,
  type SamlEnv,
} from "@/lib/saml";

export type SamlLoginResult =
  | { ok: true; ticket: string; email: string }
  | {
      ok: false;
      reason: "no_email" | "domain_not_allowed" | "disabled" | "private_host";
    };

/**
 * Turn a VALIDATED SAML profile into a login ticket. node-saml has already checked the
 * signature, audience, time window and replay; this adds Verk's own rules:
 *   - the profile must carry an email, and it must be on an allowed domain
 *   - a SCIM-disabled account cannot sign in, however valid the assertion
 *   - a private host (GitHub allowlist) refuses SAML, to keep that allowlist authoritative
 * A first-time user is created here, so SAML users land on /onboarding like any new user.
 */
export async function loginFromSamlProfile(
  profile: Profile,
  env: SamlEnv,
): Promise<SamlLoginResult> {
  if (isPrivateHost()) return { ok: false, reason: "private_host" };

  const email = emailFromProfile(profile, env);

  if (!email) return { ok: false, reason: "no_email" };
  if (!isDomainAllowed(email, env.allowedDomains)) {
    return { ok: false, reason: "domain_not_allowed" };
  }
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { disabled: true },
  });

  if (existing?.disabled) return { ok: false, reason: "disabled" };

  const name = nameFromProfile(profile, env);

  if (!existing) {
    await prisma.user.create({
      data: { email, name: name ?? email, emailVerified: new Date() },
    });
  }

  return { ok: true, ticket: mintSamlTicket({ email, name }), email };
}

/** Where to send the browser when SAML login fails. The login page shows the message. */
export const SAML_ERROR_CODE: Record<
  Exclude<SamlLoginResult, { ok: true }>["reason"] | "invalid_response",
  string
> = {
  no_email: "SamlNoEmail",
  domain_not_allowed: "SamlDomain",
  disabled: "SamlDisabled",
  private_host: "SamlPrivateHost",
  invalid_response: "SamlInvalid",
};
