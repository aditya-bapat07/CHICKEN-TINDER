import { test } from "node:test";
import assert from "node:assert/strict";
import { validateDeploymentEnv } from "../scripts/deployment-env.mjs";

const valid = {
  DATABASE_URL:
    "postgresql://user:secret@pool.example.com/chicken?schema=public",
  DIRECT_URL: "postgresql://user:secret@db.example.com/chicken",
  VERCEL_ENV: "preview",
};
test("accepts pooled and direct hosts for the same PostgreSQL database", () => {
  assert.doesNotThrow(() => validateDeploymentEnv(valid));
});
test("missing credentials produce a deployment setup error", () => {
  assert.throws(() => validateDeploymentEnv({}), /Missing DATABASE_URL/);
  assert.throws(
    () => validateDeploymentEnv({ DATABASE_URL: valid.DATABASE_URL }),
    /Missing DIRECT_URL/,
  );
});
test("rejects SQLite and malformed URLs without exposing credentials", () => {
  for (const DATABASE_URL of ["file:./dev.db", "secret password invalid url"]) {
    assert.throws(
      () => validateDeploymentEnv({ ...valid, DATABASE_URL }),
      (error) =>
        !error.message.includes("secret") && /PostgreSQL/.test(error.message),
    );
  }
});
test("rejects different database names or schemas", () => {
  for (const suffix of ["other", "chicken?schema=other"]) {
    assert.throws(
      () =>
        validateDeploymentEnv({
          ...valid,
          DIRECT_URL: `postgresql://user:secret@db.example.com/${suffix}`,
        }),
      /same database/,
    );
  }
});
test("rejects local connections in deployed environments but permits local build tests", () => {
  const local = {
    DATABASE_URL: "postgresql://user:secret@127.0.0.1/chicken",
    DIRECT_URL: "postgresql://user:secret@127.0.0.1/chicken",
  };
  assert.throws(
    () => validateDeploymentEnv({ ...local, VERCEL_ENV: "production" }),
    /hosted PostgreSQL/,
  );
  assert.doesNotThrow(() => validateDeploymentEnv(local));
});
