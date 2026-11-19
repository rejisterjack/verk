import { spawnSync } from "node:child_process";

const url = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
const canMigrate =
  Boolean(url) &&
  !url.includes("localhost") &&
  !url.includes("127.0.0.1");

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  if (result.error) {
    throw result.error;
  }

  if (typeof result.status === "number" && result.status !== 0) {
    process.exit(result.status);
  }
}

if (canMigrate) {
  run("npx", ["prisma", "migrate", "deploy"]);
} else {
  // Preview / CI builds may lack Neon credentials; generate already ran in postinstall.
  // eslint-disable-next-line no-console
  console.warn(
    "Skipping prisma migrate deploy (no reachable production database URL).",
  );
}

run("npx", ["next", "build", "--webpack"]);
