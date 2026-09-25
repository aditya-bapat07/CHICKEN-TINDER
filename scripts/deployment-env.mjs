export function validateDeploymentEnv(env) {
  for (const name of ["DATABASE_URL", "DIRECT_URL"]) {
    if (!env[name]) {
      throw new Error(
        `Missing ${name}. Add the PostgreSQL connection URLs in Vercel → Settings → Environment Variables, then redeploy. See DEPLOYMENT.md.`,
      );
    }
    let url;
    try {
      url = new URL(env[name]);
    } catch {
      throw new Error(
        `${name} must be a valid PostgreSQL URL. Its value has not been logged.`,
      );
    }
    if (
      !["postgres:", "postgresql:"].includes(url.protocol) ||
      !url.hostname ||
      url.pathname.length < 2
    ) {
      throw new Error(
        `${name} must point to a PostgreSQL database, including its database name.`,
      );
    }
    if (
      env.VERCEL_ENV &&
      env.VERCEL_ENV !== "development" &&
      ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
    ) {
      throw new Error(
        `${name} points to localhost. A Vercel deployment needs a hosted PostgreSQL database.`,
      );
    }
  }
  const runtime = new URL(env.DATABASE_URL);
  const direct = new URL(env.DIRECT_URL);
  if (
    runtime.pathname !== direct.pathname ||
    (runtime.searchParams.get("schema") || "public") !==
      (direct.searchParams.get("schema") || "public")
  ) {
    throw new Error(
      "DATABASE_URL and DIRECT_URL must target the same database name and schema.",
    );
  }
}
