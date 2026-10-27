import { Metadata } from "next";
import NextLink from "next/link";

import { siteConfig } from "@/config/site";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-20">
      <h1 className="font-display text-4xl font-semibold tracking-tight">
        About Verk
      </h1>
      <div className="mt-8 space-y-5 text-muted leading-relaxed">
        <p>
          Verk exists because Linear is excellent but expensive for small teams,
          and open-source alternatives often demand Docker and ongoing ops. Verk
          runs as a single Next.js app on Vercel with Neon Postgres — clone,
          connect, deploy.
        </p>
        <p>
          It covers the core 80% of project tracking: issues, statuses,
          priorities, cycles, teams with roles, board and list views, plus a
          first-class MCP server for AI agents. It is infrastructure for
          developers, not a consumer product chasing every feature.
        </p>
        <p>
          <a
            className="font-medium text-accent hover:opacity-80"
            href={siteConfig.links.github}
            rel="noopener noreferrer"
            target="_blank"
          >
            github.com/rejisterjack/verk
          </a>
          {" · "}
          <NextLink
            className="font-medium text-accent hover:opacity-80"
            href="/"
          >
            Back home
          </NextLink>
        </p>
      </div>
    </div>
  );
}
