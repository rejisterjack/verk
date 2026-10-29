import { prisma } from "@/lib/db";

export async function commentOnLinkedPullRequest(issueId: string, status: string) {
  const token = process.env.GITHUB_TOKEN;

  if (!token) return;
  const links = await prisma.issueLink.findMany({
    where: { issueId, kind: "github" },
  });

  for (const link of links) {
    const match = link.url.match(
      /github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/,
    );

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
          body: `Verk set this issue to ${status}.`,
        }),
      },
    );

    if (!response.ok) {
      console.error(`GitHub comment failed: ${response.status}`);
    }
  }
}
