import "dotenv/config";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";

if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    "Set TEST_DATABASE_URL to a disposable PostgreSQL database. See .env.example.",
  );
}
const schema = `test_${randomUUID().replaceAll("-", "")}`;
const url = new URL(process.env.TEST_DATABASE_URL);
if (!["postgres:", "postgresql:"].includes(url.protocol))
  throw new Error("Tests require PostgreSQL.");
url.searchParams.set("schema", schema);
const databaseUrl = url.toString();
const env = {
  ...process.env,
  NODE_ENV: "test",
  DATABASE_URL: databaseUrl,
  DIRECT_URL: databaseUrl,
};
const admin = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
function run(args) {
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`Command failed (${result.status}): ${args[0]}`);
}
try {
  // The identifier is generated above, never taken from user input.
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  run([
    "node_modules/prisma/build/index.js",
    "migrate",
    "deploy",
    "--schema",
    "database/prisma/schema.prisma",
  ]);
  run(["--import", "tsx", "database/prisma/seed.ts"]);
  const before = await admin.activity.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  run(["--import", "tsx", "database/prisma/seed.ts"]);
  const after = await admin.activity.findMany({
    select: { id: true },
    orderBy: { id: "asc" },
  });
  if (before.length !== 185 || JSON.stringify(before) !== JSON.stringify(after))
    throw new Error("Seed is not idempotent");
  if (process.argv.includes("--browser"))
    run(["node_modules/@playwright/test/cli.js", "test"]);
  else {
    run(["--import", "tsx", "scripts/test-api.ts"]);
    run(["--import", "tsx", "scripts/test-production.ts"]);
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await admin.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await admin.$disconnect();
}
