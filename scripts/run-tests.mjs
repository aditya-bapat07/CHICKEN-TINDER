import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
const dir = mkdtempSync(join(process.env.TMPDIR || tmpdir(), "chicken-tinder-test-"));
const url = `file:${join(dir, "test.db")}`;
writeFileSync(join(dir, "test.db"), "");
const env = { ...process.env, NODE_ENV: "test", TEST_DATABASE_URL: url };
function run(args) {
  const result = spawnSync(process.execPath, args, { env, stdio: "inherit" });
  if (result.status !== 0)
    throw new Error(`Command failed (${result.status}): ${args[0]}`);
}
try {
  const schema = readFileSync("prisma/schema.prisma", "utf8").replace(
    "file:./dev.db",
    url,
  );
  writeFileSync(join(dir, "schema.prisma"), schema);
  run([
    "node_modules/prisma/build/index.js",
    "db",
    "push",
    "--schema",
    join(dir, "schema.prisma"),
    "--skip-generate",
  ]);
  run(["--import", "tsx", "prisma/seed.ts"]);
  if (process.argv.includes("--browser"))
    run(["node_modules/@playwright/test/cli.js", "test"]);
  else run(["--import", "tsx", "scripts/test-api.ts"]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  rmSync(dir, { recursive: true, force: true });
}
