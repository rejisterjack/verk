import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import bcrypt from "bcryptjs";

import {
  IssueStatus,
  Priority,
  PrismaClient,
} from "../lib/generated/prisma/client";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });

export async function seedDemo() {
  const passwordHash = await bcrypt.hash("demo1234", 10);

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@verk.dev" },
    update: { name: "Demo User", passwordHash },
    create: {
      email: "demo@verk.dev",
      name: "Demo User",
      passwordHash,
    },
  });

  const teammate = await prisma.user.upsert({
    where: { email: "alex@verk.dev" },
    update: { name: "Alex Rivera", passwordHash },
    create: {
      email: "alex@verk.dev",
      name: "Alex Rivera",
      passwordHash,
    },
  });

  const team = await prisma.team.upsert({
    where: { slug: "acme-engineering" },
    update: {
      name: "Acme Engineering",
      cycleDurationWeeks: 2,
      cyclesEnabled: true,
    },
    create: {
      name: "Acme Engineering",
      slug: "acme-engineering",
      cycleDurationWeeks: 2,
      cyclesEnabled: true,
    },
  });

  await prisma.membership.upsert({
    where: { userId_teamId: { userId: demoUser.id, teamId: team.id } },
    update: { role: "OWNER" },
    create: { userId: demoUser.id, teamId: team.id, role: "OWNER" },
  });

  await prisma.membership.upsert({
    where: { userId_teamId: { userId: teammate.id, teamId: team.id } },
    update: { role: "MEMBER" },
    create: { userId: teammate.id, teamId: team.id, role: "MEMBER" },
  });

  await prisma.attachment.deleteMany({
    where: { issue: { teamId: team.id } },
  });
  await prisma.comment.deleteMany({ where: { issue: { teamId: team.id } } });
  await prisma.issueRelation.deleteMany({
    where: {
      OR: [
        { fromIssue: { teamId: team.id } },
        { toIssue: { teamId: team.id } },
      ],
    },
  });
  await prisma.issueLabel.deleteMany({
    where: { issue: { teamId: team.id } },
  });
  await prisma.notification.deleteMany({ where: { teamId: team.id } });
  await prisma.issue.deleteMany({ where: { teamId: team.id } });
  await prisma.milestone.deleteMany({
    where: { project: { teamId: team.id } },
  });
  await prisma.project.deleteMany({ where: { teamId: team.id } });
  await prisma.label.deleteMany({ where: { teamId: team.id } });
  await prisma.savedView.deleteMany({ where: { teamId: team.id } });
  await prisma.workflowStatus.deleteMany({ where: { teamId: team.id } });
  await prisma.cycle.deleteMany({ where: { teamId: team.id } });

  const workflowDefaults = [
    { key: "backlog", name: "Backlog", type: "backlog" as const, position: 0 },
    { key: "todo", name: "Todo", type: "unstarted" as const, position: 1 },
    {
      key: "in_progress",
      name: "In Progress",
      type: "started" as const,
      position: 2,
    },
    { key: "done", name: "Done", type: "completed" as const, position: 3 },
    {
      key: "canceled",
      name: "Canceled",
      type: "canceled" as const,
      position: 4,
    },
  ];

  await prisma.workflowStatus.createMany({
    data: workflowDefaults.map((d) => ({ ...d, teamId: team.id })),
  });

  const bug = await prisma.label.create({
    data: { teamId: team.id, name: "bug", color: "#ef4444" },
  });
  const feature = await prisma.label.create({
    data: { teamId: team.id, name: "feature", color: "#0f766e" },
  });
  const polish = await prisma.label.create({
    data: { teamId: team.id, name: "polish", color: "#6366f1" },
  });

  const project = await prisma.project.create({
    data: {
      teamId: team.id,
      name: "Launch Verk",
      summary: "Ship the public demo with Linear-migration UX.",
      status: "IN_PROGRESS",
      leadId: demoUser.id,
    },
  });

  await prisma.milestone.create({
    data: {
      projectId: project.id,
      name: "Public demo",
      targetDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      sortOrder: 0,
    },
  });

  await prisma.savedView.create({
    data: {
      teamId: team.id,
      name: "Active cycle",
      layout: "BOARD",
      pinned: true,
      filterJson: {},
    },
  });

  const now = new Date();
  const cycle = await prisma.cycle.create({
    data: {
      teamId: team.id,
      name: "Cycle 1",
      startDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      endDate: new Date(now.getTime() + 11 * 24 * 60 * 60 * 1000),
      isActive: true,
    },
  });

  const titles: Array<{
    title: string;
    status: IssueStatus;
    priority: Priority;
    cycle?: boolean;
    assignee?: boolean;
    labelIds?: string[];
    project?: boolean;
  }> = [
    {
      title: "Set up Neon database",
      status: "DONE",
      priority: "HIGH",
      cycle: true,
      project: true,
      labelIds: [feature.id],
    },
    {
      title: "Implement Auth.js login",
      status: "DONE",
      priority: "HIGH",
      cycle: true,
      project: true,
    },
    {
      title: "Build issues list view",
      status: "IN_PROGRESS",
      priority: "HIGH",
      cycle: true,
      assignee: true,
      project: true,
      labelIds: [feature.id],
    },
    {
      title: "Ship board drag and drop",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      cycle: true,
      project: true,
    },
    {
      title: "Add cycle planning",
      status: "TODO",
      priority: "MEDIUM",
      cycle: true,
      project: true,
    },
    {
      title: "Expose MCP server for agents",
      status: "TODO",
      priority: "URGENT",
      cycle: true,
      labelIds: [feature.id],
    },
    {
      title: "Write deploy README",
      status: "TODO",
      priority: "HIGH",
      cycle: true,
      labelIds: [polish.id],
    },
    { title: "Invite teammate flow", status: "BACKLOG", priority: "MEDIUM" },
    { title: "API key management UI", status: "BACKLOG", priority: "MEDIUM" },
    {
      title: "Polish empty states",
      status: "BACKLOG",
      priority: "LOW",
      labelIds: [polish.id],
    },
    {
      title: "Keyboard shortcut for create",
      status: "BACKLOG",
      priority: "LOW",
    },
    {
      title: "Filter board by active cycle",
      status: "TODO",
      priority: "MEDIUM",
      cycle: true,
    },
    { title: "Seed demo data", status: "DONE", priority: "HIGH", cycle: true },
    {
      title: "Security headers",
      status: "BACKLOG",
      priority: "MEDIUM",
      labelIds: [bug.id],
    },
    { title: "Playwright happy path", status: "BACKLOG", priority: "LOW" },
    {
      title: "Cancel abandoned experiments",
      status: "CANCELLED",
      priority: "NONE",
    },
    {
      title: "Dark mode polish",
      status: "IN_PROGRESS",
      priority: "LOW",
      assignee: true,
      labelIds: [polish.id],
    },
    { title: "Member role changes", status: "TODO", priority: "MEDIUM" },
    {
      title: "Issue detail editing",
      status: "IN_PROGRESS",
      priority: "HIGH",
      cycle: true,
      assignee: true,
      project: true,
    },
    {
      title: "Vercel migrate on deploy",
      status: "TODO",
      priority: "URGENT",
      cycle: true,
      project: true,
    },
  ];

  const createdIds: string[] = [];

  for (let i = 0; i < titles.length; i++) {
    const item = titles[i]!;
    const issue = await prisma.issue.create({
      data: {
        teamId: team.id,
        number: i + 1,
        title: item.title,
        description: `${item.title}\n\nSeeded demo issue for Verk.`,
        status: item.status,
        priority: item.priority,
        order: i + 1,
        cycleId: item.cycle ? cycle.id : null,
        assigneeId: item.assignee ? teammate.id : null,
        projectId: item.project ? project.id : null,
        creatorId: demoUser.id,
        labels: item.labelIds?.length
          ? { create: item.labelIds.map((labelId) => ({ labelId })) }
          : undefined,
      },
    });

    createdIds.push(issue.id);
  }

  const primary = createdIds[2]!;
  const blocked = createdIds[3]!;

  await prisma.issueRelation.create({
    data: {
      fromIssueId: primary,
      toIssueId: blocked,
      type: "BLOCKS",
    },
  });

  await prisma.comment.create({
    data: {
      issueId: primary,
      authorId: teammate.id,
      body: "List looks good — adding keyboard focus next.",
    },
  });

  await prisma.comment.create({
    data: {
      issueId: primary,
      authorId: demoUser.id,
      body: "Ship peek with Space before launch.",
    },
  });

  await prisma.notification.create({
    data: {
      userId: demoUser.id,
      teamId: team.id,
      issueId: primary,
      type: "ASSIGNED",
      title: "Alex commented on Build issues list view",
      body: "List looks good — adding keyboard focus next.",
    },
  });

  await prisma.notification.create({
    data: {
      userId: demoUser.id,
      teamId: team.id,
      issueId: blocked,
      type: "STATUS_CHANGED",
      title: "Ship board drag and drop moved to In Progress",
      body: "",
    },
  });

  await prisma.team.update({
    where: { id: team.id },
    data: { issueCounter: titles.length },
  });

  // eslint-disable-next-line no-console -- seed CLI feedback
  console.log(
    "Seed complete. Demo: demo@verk.dev / demo1234 · acme-engineering",
  );
}

if (process.argv[1]?.includes("seed")) {
  seedDemo()
    .catch((e) => {
      // eslint-disable-next-line no-console -- seed CLI feedback
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
