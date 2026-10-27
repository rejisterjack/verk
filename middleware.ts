import NextAuth from "next-auth";

import { authConfig } from "@/lib/auth.config";

export default NextAuth(authConfig).auth;

export const config = {
  matcher: [
    "/t",
    "/t/:path*",
    "/onboarding",
    "/account",
    "/account/:path*",
    "/login",
    "/register",
  ],
};
