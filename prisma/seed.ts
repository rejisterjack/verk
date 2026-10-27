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

async function main() {
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
    update: { name: "Acme Engineering" },
    create: {
      name: "Acme Engineering",
      slug: "acme-engineering",
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

  await prisma.issue.deleteMany({ where: { teamId: team.id } });
  await prisma.cycle.deleteMany({ where: { teamId: team.id } });

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
  }> = [
    {
      title: "Set up Neon database",
      status: "DONE",
      priority: "HIGH",
      cycle: true,
    },
    {
      title: "Implement Auth.js login",
      status: "DONE",
      priority: "HIGH",
      cycle: true,
    },
    {
      title: "Build issues list view",
      status: "IN_PROGRESS",
      priority: "HIGH",
      cycle: true,
      assignee: true,
    },
    {
      title: "Ship board drag and drop",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      cycle: true,
    },
    {
      title: "Add cycle planning",
      status: "TODO",
      priority: "MEDIUM",
      cycle: true,
    },
    {
      title: "Expose MCP server for agents",
      status: "TODO",
      priority: "URGENT",
      cycle: true,
    },
    {
      title: "Write deploy README",
      status: "TODO",
      priority: "HIGH",
      cycle: true,
    },
    { title: "Invite teammate flow", status: "BACKLOG", priority: "MEDIUM" },
    { title: "API key management UI", status: "BACKLOG", priority: "MEDIUM" },
    { title: "Polish empty states", status: "BACKLOG", priority: "LOW" },
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
    { title: "Security headers", status: "BACKLOG", priority: "MEDIUM" },
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
    },
    { title: "Member role changes", status: "TODO", priority: "MEDIUM" },
    {
      title: "Issue detail editing",
      status: "IN_PROGRESS",
      priority: "HIGH",
      cycle: true,
      assignee: true,
    },
    {
      title: "Vercel migrate on deploy",
      status: "TODO",
      priority: "URGENT",
      cycle: true,
    },
  ];

  for (let i = 0; i < titles.length; i++) {
    const item = titles[i];

    await prisma.issue.create({
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
        creatorId: demoUser.id,
      },
    });
  }

  await prisma.team.update({
    where: { id: team.id },
    data: { issueCounter: titles.length },
  });

  // eslint-disable-next-line no-console -- seed CLI feedback
  console.log(
    "Seed complete. Demo: demo@verk.dev / demo1234 · acme-engineering",
  );
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console -- seed CLI feedback
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
