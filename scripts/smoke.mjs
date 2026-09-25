import assert from "node:assert/strict";

const target = process.argv[2];
if (!target)
  throw new Error("Usage: npm run smoke -- https://your-project.vercel.app");
const base = new URL(target);
if (!["https:", "http:"].includes(base.protocol))
  throw new Error("Use an HTTP(S) deployment URL.");
async function get(path, accept = "application/json") {
  const response = await fetch(new URL(path, base), {
    headers: { accept },
    signal: AbortSignal.timeout(20000),
    redirect: "manual",
  });
  assert(
    ![301, 302, 303, 307, 308].includes(response.status),
    `${path}: unexpected redirect; check the URL and Vercel deployment protection.`,
  );
  return response;
}
const health = await get("/api/health");
assert.equal(health.status, 200, "Database readiness failed");
assert.equal((await health.json()).database, "connected");
const catalog = await get("/api/activities");
assert.equal(catalog.status, 200);
assert((await catalog.json()).length >= 185, "The catalog has not been seeded");
for (const path of [
  "/",
  "/signup",
  "/activities",
  "/matches",
  "/keys",
  "/invite/smoke-check",
]) {
  const page = await get(path, "text/html");
  assert.equal(page.status, 200, `${path}: deep-link routing failed`);
  assert(
    (await page.text()).includes('<div id="root">'),
    `${path}: missing frontend`,
  );
}
assert.equal(
  (await get("/api/me")).status,
  401,
  "Protected API must require authentication",
);
const missing = await get("/api/not-a-real-route", "text/html");
assert.equal(missing.status, 404);
assert(missing.headers.get("content-type")?.includes("application/json"));
console.log(
  "Deployment smoke checks passed: database, seeded catalog, frontend/deep links, authentication boundary, and API 404s.",
);
