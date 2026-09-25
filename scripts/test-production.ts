import assert from "node:assert/strict";
import { createServer } from "node:http";
import { buildApp } from "../backend/src/app.js";
import { db } from "../backend/src/lib/db.js";
import { hashApiKey } from "../backend/src/lib/apikey.js";
import { consumeLimit, clientIp } from "../backend/src/lib/rate-limit.js";
import { createShareToken } from "../backend/src/services/match.service.js";

async function main() {
  const app = await buildApp();
  const second = await buildApp();
  app.get("/__test-error", async () => {
    throw new Error("private database implementation detail");
  });
  try {
    const failure = await app.inject({ url: "/__test-error" });
    assert.equal(failure.statusCode, 500);
    assert(!failure.payload.includes("private database"));
    // Atomic limits across separate app instances and both endpoint prefixes.
    const attempts = await Promise.all(
      Array.from({ length: 25 }, (_, i) =>
        (i % 2 ? app : second).inject({
          method: "POST",
          url: i % 2 ? "/api/auth/login?attempt=1" : "/auth/login",
          remoteAddress: "192.0.2.10",
          payload: { email: "missing@example.invalid", password: "wrong" },
        }),
      ),
    );
    assert.equal(attempts.filter((r) => r.statusCode === 401).length, 20);
    assert.equal(attempts.filter((r) => r.statusCode === 429).length, 5);
    assert(
      Number(
        attempts.find((r) => r.statusCode === 429)!.headers["retry-after"],
      ) > 0,
    );
    const oldVercel = process.env.VERCEL;
    try {
      delete process.env.VERCEL;
      const req = {
        ip: "127.0.0.1",
        headers: { "x-vercel-forwarded-for": "192.0.2.20" },
      } as any;
      assert.equal(clientIp(req), "127.0.0.1");
      process.env.VERCEL = "1";
      assert.equal(clientIp(req), "192.0.2.20");
    } finally {
      if (oldVercel === undefined) delete process.env.VERCEL;
      else process.env.VERCEL = oldVercel;
    }
    await consumeLimit("expiry-test", "one", 1, 60);
    await assert.rejects(consumeLimit("expiry-test", "one", 1, 60));
    await db.rateLimit.updateMany({
      where: { key: { startsWith: "expiry-test:" } },
      data: { expiresAt: new Date(0) },
    });
    await consumeLimit("expiry-test", "one", 1, 60);

    const registration = await app.inject({
      method: "POST",
      url: "/api/auth/register",
      remoteAddress: "192.0.2.11",
      payload: {
        email: "production-test@example.com",
        name: "Production test",
        password: "correct-password",
      },
    });
    assert.equal(registration.statusCode, 201);
    assert.equal(registration.headers["cache-control"], "no-store");
    assert.equal(registration.headers["x-content-type-options"], "nosniff");
    const { apiKey, user } = registration.json();
    const headers = { "x-api-key": apiKey };
    const sessions = await Promise.all(
      Array.from({ length: 8 }, () =>
        app.inject({ method: "POST", url: "/api/sessions", headers }),
      ),
    );
    assert(sessions.every((r) => r.statusCode === 201));
    const sessionId = sessions[0].json().sessionId;
    assert(sessions.every((r) => r.json().sessionId === sessionId));
    const activities = await db.activity.findMany({ take: 10 });
    const swipes = await Promise.all(
      activities.map((activity) =>
        app.inject({
          method: "POST",
          url: `/api/sessions/${sessionId}/swipe`,
          headers,
          payload: { activityId: activity.id, direction: "reject" },
        }),
      ),
    );
    assert(
      swipes.every((r) => r.statusCode === 200),
      swipes.map((r) => r.payload).join("\n"),
    );
    assert.equal(swipes.filter((r) => r.json().forced).length, 1);
    assert.equal(await db.match.count({ where: { userId: user.id } }), 1);
    const match = await db.match.findFirstOrThrow({
      where: { userId: user.id },
    });
    const shares = await Promise.all(
      Array.from({ length: 5 }, () => createShareToken(match.id, user.id)),
    );
    assert.equal(new Set(shares.map((s) => s.shareToken)).size, 1);

    const personal = await app.inject({
      method: "POST",
      url: "/api/auth/keys",
      headers,
      payload: { label: "Browser session" },
    });
    assert.equal(personal.statusCode, 201);
    const personalHeaders = { "x-api-key": personal.json().apiKey };
    await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: personalHeaders,
    });
    assert.equal(
      (await app.inject({ url: "/api/me", headers: personalHeaders }))
        .statusCode,
      200,
    );
    await db.apiKey.update({
      where: { keyHash: hashApiKey(apiKey) },
      data: { expiresAt: new Date(0) },
    });
    assert.equal(
      (await app.inject({ url: "/api/me", headers })).statusCode,
      401,
    );
    const login = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      remoteAddress: "192.0.2.11",
      payload: { email: user.email, password: "correct-password" },
    });
    assert.equal(login.statusCode, 200);
    const sessionHeaders = { "x-api-key": login.json().apiKey };
    await app.inject({
      method: "POST",
      url: "/api/auth/logout",
      headers: sessionHeaders,
    });
    assert.equal(
      (await app.inject({ url: "/api/me", headers: sessionHeaders }))
        .statusCode,
      401,
    );

    // Exercise the actual Vercel entrypoint with HTTP, not only Fastify injection.
    const handler = require("../api/index.js");
    const server = createServer((req, res) => {
      Promise.resolve(handler(req, res)).catch(() => {
        res.statusCode = 500;
        res.end();
      });
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    try {
      const address = server.address() as { port: number };
      const origin = `http://127.0.0.1:${address.port}`;
      for (const route of [
        "/",
        "/signup",
        "/activities",
        "/matches",
        "/invite/example",
      ]) {
        const res = await fetch(origin + route, {
          headers: { accept: "text/html" },
        });
        assert.equal(res.status, 200);
        assert((await res.text()).includes('<div id="root">'));
      }
      assert.equal((await fetch(origin + "/api/health")).status, 200);
      const newActivity = await db.activity.findFirstOrThrow({
        where: { id: { notIn: activities.map(a => a.id) } },
      });
      const vote = await fetch(origin + `/api/sessions/${sessionId}/swipe`, {
        method: "POST",
        headers: { ...personalHeaders, "content-type": "application/json" },
        body: JSON.stringify({ activityId: newActivity.id, direction: "like" }),
      });
      assert.equal(vote.status, 200);
      assert.equal((await vote.json()).accepted, true);
      const catalog = await fetch(origin + "/api/activities?category=creative");
      assert.equal(catalog.status, 200);
      assert(
        (await catalog.json()).every((a: any) => a.category === "creative"),
      );
      const missing = await fetch(origin + "/api/not-real", {
        headers: { accept: "text/html" },
      });
      assert.equal(missing.status, 404);
      const docs = await fetch(origin + "/docs/json");
      assert.equal(docs.status, 200);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) =>
        server.close((e) => (e ? reject(e) : resolve())),
      );
    }
    console.log(
      "Production checks passed: shared/concurrent rate limits, expiry, proxy trust, session revocation, concurrent sessions/swipes/sharing, security headers, health, Vercel handler and deep links.",
    );
  } finally {
    await app.close();
    await second.close();
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
