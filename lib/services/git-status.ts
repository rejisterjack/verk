import { prisma } from "@/lib/db";
import { findMentions } from "@/lib/github-events";

type StatusPatch = {
  provider: "github" | "gitlab";
  repo: string;
  text?: string;
  url?: string;
  checkName?: string;
  checkStatus?: string;
  checkUrl?: string;
  deployEnvironment?: string;
  deployStatus?: string;
  deployUrl?: string;
};

/** Store the latest check or deployment on the issue link a webhook already knows about. */
export async function recordGitStatus(input: StatusPatch) {
  const teams = await prisma.team.findMany({
    where:
      input.provider === "github"
        ? { githubRepo: input.repo }
        : { gitlabProject: input.repo },
    select: { id: true, slug: true },
  });
  let updated = 0;

  for (const team of teams) {
    const numbers = input.text
      ? findMentions(input.text, team.slug).map((mention) => mention.number)
      : [];
    const issues = numbers.length
      ? await prisma.issue.findMany({
          where: { teamId: team.id, number: { in: numbers } },
          select: { id: true },
        })
      : [];
    const or = [
      ...(input.url ? [{ url: input.url }] : []),
      ...(issues.length
        ? [{ issueId: { in: issues.map((issue) => issue.id) } }]
        : []),
    ];

    if (!or.length) continue;
    const links = await prisma.issueLink.findMany({
      where: { kind: input.provider, OR: or },
    });

    for (const link of links) {
      await prisma.issueLink.update({
        where: { id: link.id },
        data: {
          ...(input.checkName !== undefined ? { checkName: input.checkName } : {}),
          ...(input.checkStatus !== undefined
            ? { checkStatus: input.checkStatus }
            : {}),
          ...(input.checkUrl !== undefined ? { checkUrl: input.checkUrl } : {}),
          ...(input.deployEnvironment !== undefined
            ? { deployEnvironment: input.deployEnvironment }
            : {}),
          ...(input.deployStatus !== undefined
            ? { deployStatus: input.deployStatus }
            : {}),
          ...(input.deployUrl !== undefined ? { deployUrl: input.deployUrl } : {}),
        },
      });
      updated += 1;
    }
  }

  return updated;
}
