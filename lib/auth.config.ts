import type { NextAuthConfig } from "next-auth";

import { isGithubIdentityAllowed, isPrivateHost } from "@/lib/auth-allowlist";

export const authConfig = {
  pages: {
    signIn: "/login",
    error: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isProtected =
        pathname === "/t" ||
        pathname.startsWith("/t/") ||
        pathname.startsWith("/w/") ||
        pathname.startsWith("/onboarding") ||
        pathname.startsWith("/account");

      if (isProtected) {
        if (!auth?.user) return false;
        if (!isPrivateHost()) return true;

        return isGithubIdentityAllowed({ login: auth.user.githubLogin });
      }

      return true;
    },
    signIn({ account, profile }) {
      if (!isPrivateHost()) return true;
      if (account?.provider !== "github") return false;

      return isGithubIdentityAllowed(profile);
    },
    jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id;
      }

      if (account?.provider === "github" && profile && "login" in profile) {
        const login = profile.login;

        if (typeof login === "string") token.githubLogin = login.toLowerCase();
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }

      if (session.user && typeof token.githubLogin === "string") {
        session.user.githubLogin = token.githubLogin;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
