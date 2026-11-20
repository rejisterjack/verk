import type { Provider } from "next-auth/providers";

import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import GitHub from "next-auth/providers/github";
import Google from "next-auth/providers/google";

import { isPrivateHost } from "@/lib/auth-allowlist";
import { isStaleSessionError } from "@/lib/auth-errors";
import { authConfig } from "@/lib/auth.config";
import { prisma } from "@/lib/db";
import { rateLimitShared } from "@/lib/rate-limit";
import { isSamlEnabled, SAML_PROVIDER_ID, verifySamlTicket } from "@/lib/saml";
import { finishAuthentication } from "@/lib/services/passkeys";
import {
  isTwoFactorEnabled,
  verifySecondFactor,
} from "@/lib/services/two-factor";
import {
  isEmailDisabled,
  isUserActive,
  getPasswordStamp,
} from "@/lib/user-status";
import { loginSchema } from "@/lib/validators";

const providers: Provider[] = [
  Credentials({
    name: "credentials",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
      code: { label: "Authentication code", type: "text" },
    },
    async authorize(credentials) {
      if (isPrivateHost()) return null;

      const parsed = loginSchema.safeParse(credentials);

      if (!parsed.success) return null;

      const user = await prisma.user.findUnique({
        where: { email: parsed.data.email.toLowerCase() },
      });

      if (!user?.passwordHash || user.disabled) return null;

      const valid = await bcrypt.compare(
        parsed.data.password,
        user.passwordHash,
      );

      if (!valid) return null;

      // Second factor: a correct password alone is never enough once 2FA is on. Guessing is
      // throttled per account so a six-digit code can't be brute-forced.
      if (await isTwoFactorEnabled(user.id)) {
        const attempt = await rateLimitShared(`2fa:${user.id}`, 8, 5 * 60_000);

        if (!attempt.ok) return null;
        const code = String(credentials?.code ?? "");

        if (!code || !(await verifySecondFactor(user.id, code))) return null;
      }

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
];

// Passkey sign-in. The browser sends the signed assertion; it is only trusted after the
// signature, site, single-use challenge and counter all check out. A passkey is device plus
// local unlock, so it stands in for the TOTP step.
providers.push(
  Credentials({
    id: "passkey",
    name: "Passkey",
    credentials: { assertion: { label: "Assertion", type: "text" } },
    async authorize(credentials) {
      if (isPrivateHost()) return null;
      let response;

      try {
        response = JSON.parse(String(credentials?.assertion ?? ""));
      } catch {
        return null;
      }
      if (!response || typeof response.id !== "string") return null;
      const attempt = await rateLimitShared(
        `passkey:${response.id.slice(0, 40)}`,
        10,
        5 * 60_000,
      );

      if (!attempt.ok) return null;
      const userId = await finishAuthentication(response);

      if (!userId) return null;
      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user || user.disabled) return null;

      return {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image,
      };
    },
  }),
);

// SAML single sign-on. Auth.js has no SAML provider, so the ACS route validates the
// IdP's signed response and mints a 60-second ticket; this provider redeems it.
// It trusts nothing but a valid ticket, and still refuses disabled users.
if (isSamlEnabled()) {
  providers.push(
    Credentials({
      id: SAML_PROVIDER_ID,
      name: "SAML",
      credentials: { ticket: { label: "Ticket", type: "text" } },
      async authorize(credentials) {
        if (isPrivateHost()) return null;
        const verified = verifySamlTicket(String(credentials?.ticket ?? ""));

        if (!verified) return null;
        const user = await prisma.user.findUnique({
          where: { email: verified.email },
        });

        if (!user || user.disabled) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  );
}

if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
  providers.unshift(
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.unshift(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (
  process.env.AUTH_OIDC_ISSUER &&
  process.env.AUTH_OIDC_CLIENT_ID &&
  process.env.AUTH_OIDC_CLIENT_SECRET
) {
  providers.unshift({
    id: "oidc",
    name: "SSO",
    type: "oidc",
    issuer: process.env.AUTH_OIDC_ISSUER,
    clientId: process.env.AUTH_OIDC_CLIENT_ID,
    clientSecret: process.env.AUTH_OIDC_CLIENT_SECRET,
    allowDangerousEmailAccountLinking: true,
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  callbacks: {
    ...authConfig.callbacks,
    // OAuth sign-in: a deprovisioned account cannot come back through GitHub/Google/OIDC.
    async signIn(params) {
      const allowed = await authConfig.callbacks.signIn(params);

      if (!allowed) return false;
      if (await isEmailDisabled(params.user?.email)) return false;

      return true;
    },
    // Runs on every session read in the Node runtime. Returning null ends the
    // session, so a user disabled by SCIM loses access to existing JWTs at once.
    async jwt(params) {
      const token = await authConfig.callbacks.jwt(params);

      if (typeof token?.id !== "string") return token;
      if (!(await isUserActive(token.id))) return null;

      const stamp = await getPasswordStamp(token.id);

      // A new sign-in records the current stamp. An older JWT ends once the password changes.
      if (params.user) {
        token.passwordChangedAt = stamp;

        return token;
      }

      const issued =
        typeof token.passwordChangedAt === "string"
          ? token.passwordChangedAt
          : "";

      if (issued !== stamp) return null;

      return token;
    },
  },
  adapter: PrismaAdapter(prisma),
  providers,
  trustHost: true,
  logger: {
    error(error) {
      if (isStaleSessionError(error)) return;
      console.error("[auth][error]", error);
    },
  },
});
