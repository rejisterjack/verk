import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isProtected =
        pathname.startsWith("/t/") ||
        pathname.startsWith("/onboarding") ||
        pathname.startsWith("/account");

      if (isProtected) {
        return !!auth?.user;
      }

      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }

      return session;
    },
  },
} satisfies NextAuthConfig;
