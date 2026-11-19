/* eslint-disable no-console */
import { createHmac, timingSafeEqual } from "node:crypto";

import { prisma } from "@/lib/db";
import { issueKey } from "@/lib/utils";

export function matchIssueNumber(
  text: string,
  teamSlug: string,
): number | null {
  const prefix = (teamSlug.slice(0, 3) || "VRK").toUpperCase();
  const escape = (value: string) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`(?:^|\\s)${escape(teamSlug)}-(\\d+)\\b`, "i"),
    new RegExp(`(?:^|\\s)${escape(prefix)}-(\\d+)\\b`, "i"),
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (match) return Number(match[1]);
  }

  return null;
}

export function verkIssueUrl(teamSlug: string, number: number) {
  const origin = (process.env.AUTH_URL ?? "").replace(/\/$/, "");

  return `${origin}/t/${teamSlug}/issues/${number}`;
}

export function githubSignature(secret: string, raw: string) {
  return `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
}

export function verifyGithubSignature(
  secret: string,
  raw: string,
  signature: string,
) {
  const expected = githubSignature(secret, raw);
  const left = Buffer.from(expected);
  const right = Buffer.from(signature);

  return left.length === right.length && timingSafeEqual(left, right);
}

export function pullRequestComment(
  status: string,
  teamSlug: string,
  number: number,
) {
  return `Verk set ${issueKey(teamSlug, number)} to ${status}. ${verkIssueUrl(teamSlug, number)}`;
}

export async function commentOnLinkedPullRequest(
  issueId: string,
  status: string,
) {
  const token = process.env.GITHUB_TOKEN;

  if (!token) return;
  const links = await prisma.issueLink.findMany({
    where: { issueId, kind: "github" },
  });

  const issue = await prisma.issue.findUnique({
    where: { id: issueId },
    include: { team: { select: { slug: true } } },
  });

  if (!issue) return;

  for (const link of links) {
    const match = link.url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/);

    if (!match) continue;
    const response = await fetch(
      `https://api.github.com/repos/${match[1]}/${match[2]}/issues/${match[3]}/comments`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: pullRequestComment(status, issue.team.slug, issue.number),
        }),
      },
    );

    if (!response.ok) {
      console.error(`GitHub comment failed: ${response.status}`);
    }
  }
}
