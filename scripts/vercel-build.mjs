import "dotenv/config";
import { spawnSync } from "node:child_process";
import { validateDeploymentEnv } from "./deployment-env.mjs";

try {
  validateDeploymentEnv(process.env);
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("Run this command with npm run vercel:build.");
  for (const task of ["build", "db:deploy", "db:seed"]) {
    // Compile first so compilation failures cannot apply database changes.
    // Seed through the direct connection; the deployed API uses the pooled URL.
    const env =
      task === "db:seed"
        ? { ...process.env, DATABASE_URL: process.env.DIRECT_URL }
        : process.env;
    const result = spawnSync(process.execPath, [npmCli, "run", task], {
      env,
      stdio: "inherit",
    });
    if (result.error || result.status !== 0) {
      throw new Error(
        `Deployment stopped: ${task} failed. No deployment should be promoted.`,
      );
    }
  }
  console.log(
    "Vercel build complete: app compiled, PostgreSQL migrations applied, catalog seeded.",
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
