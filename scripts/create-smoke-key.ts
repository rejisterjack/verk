import "dotenv/config";
import { createHash, randomBytes } from "node:crypto";

import { PrismaNeon } from "@prisma/adapter-neon";

import { PrismaClient } from "../lib/generated/prisma/client";

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});
const prisma = new PrismaClient({ adapter });


async function main() {
  const secret = `verk_${randomBytes(24).toString("hex")}`;
  const prefix = secret.slice(0, 12);
  const keyHash = createHash("sha256").update(secret).digest("hex");
  const team = await prisma.team.findFirst({ where: { slug: "acme-engineering" } });
  const user = await prisma.user.findFirst({ where: { email: "demo@verk.dev" } });
  if (!team || !user) throw new Error("missing seed data");
  await prisma.apiKey.create({
    data: {
      teamId: team.id,
      name: "smoke",
      prefix,
      keyHash,
      createdById: user.id,
    },
  });
  process.stdout.write(secret);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
