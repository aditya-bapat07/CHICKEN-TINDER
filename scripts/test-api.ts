import assert from "node:assert/strict";
import { buildApp } from "../backend/src/server.js";
import { db } from "../backend/src/lib/db.js";
async function runTests() {
  const app = await buildApp();
  let count = 0;
  async function call(
    method: any,
    url: string,
    status = 200,
    key?: string,
    payload?: object,
  ) {
    const response = await app.inject({
      method,
      url,
      ...(key ? { headers: { "x-api-key": key } } : {}),
      ...(payload ? { payload } : {}),
    });
    assert.equal(
      response.statusCode,
      status,
      `${method} ${url}: ${response.payload}`,
    );
    count++;
    return response.json();
  }
  try {
    await call("GET", "/health");
    for (const url of [
      "/",
      "/activities",
      "/matches",
      "/leaderboard",
      "/keys",
      "/invite/example",
    ]) {
      const html = await app.inject({
        method: "GET",
        url,
        headers: { accept: "text/html" },
      });
      assert.equal(html.statusCode, 200, `${url}: ${html.payload}`);
      assert(
        html.payload.includes('<div id="root">'),
        `${url} must load the frontend`,
      );
      count++;
    }
    await call("GET", "/api/me", 401);
    const registration = await call(
      "POST",
      "/api/auth/register",
      201,
      undefined,
      {
        name: "Test Adventurer",
        email: "Test@Example.com",
        password: "sunshine-test-123",
      },
    );
    const key = registration.apiKey;
    assert(key.startsWith("ct_live_"));
    await call("POST", "/api/auth/register", 400, undefined, {
      name: "Duplicate",
      email: "test@example.com",
      password: "sunshine-test-123",
    });
    const me = await call("GET", "/api/me", 200, key);
    assert.equal(me.email, "test@example.com");
    assert.equal(me.hasPassword, true);
    assert(!JSON.stringify(me).includes("passwordHash"));
    await call("POST", "/api/auth/login", 401, undefined, {
      email: "test@example.com",
      password: "incorrect",
    });
    const login = await call("POST", "/api/auth/login", 200, undefined, {
      email: "TEST@example.com",
      password: "sunshine-test-123",
    });
    await call("POST", "/api/auth/email-key", 410, undefined, {
      email: me.email,
    });
    const other = await call("POST", "/api/auth/register", 201, undefined, {
      name: "Other user",
      email: "other@example.com",
    });
    const otherKey = other.apiKey;
    await call("PUT", "/api/auth/password", 200, otherKey, {
      password: "new-password-123",
    });
    await call("POST", "/api/auth/login", 200, undefined, {
      email: "other@example.com",
      password: "new-password-123",
    });
    await call("PUT", "/api/auth/password", 400, key, {
      password: "new-password-123",
      currentPassword: "bad",
    });
    await call("PUT", "/api/auth/password", 200, key, {
      password: "new-password-123",
      currentPassword: "sunshine-test-123",
    });
    await call("GET", "/api/me", 401, login.apiKey);
    const freshLogin = await call("POST", "/api/auth/login", 200, undefined, {
      email: me.email,
      password: "new-password-123",
    });
    await call("POST", "/api/auth/login", 401, undefined, {
      email: me.email,
      password: "sunshine-test-123",
    });
    await call("PATCH", "/api/me", 200, key, { name: "Updated Adventurer" });
    await call("PATCH", "/api/me", 400, key, { name: "  " });
    const quiz = await call("GET", "/api/me/profile/quiz", 200, key);
    assert.equal(quiz.questions.length, 3);
    await call("POST", "/api/me/profile/answers", 400, key, {
      answers: [{ questionId: "energy_level", value: 2 }],
    });
    const answers = await call("POST", "/api/me/profile/answers", 200, key, {
      answers: quiz.questions.map((q: any) => ({ questionId: q.id, value: 2 })),
    });
    assert.deepEqual(answers.boredomProfile, {
      energy: 2,
      budget: 2,
      social: 2,
    });
    const newKey = await call("POST", "/api/auth/keys", 201, key, {
      label: "Test device",
    });
    const keys = await call("GET", "/api/auth/keys", 200, key);
    assert(keys.some((k: any) => k.current));
    assert(!JSON.stringify(keys).includes("keyHash"));
    assert(!JSON.stringify(keys).includes("ct_live_"));
    await call("DELETE", `/api/auth/keys/${newKey.id}`, 404, otherKey);
    await call("GET", "/api/me", 200, newKey.apiKey);
    await call("DELETE", `/api/auth/keys/${newKey.id}`, 200, key);
    await call("GET", "/api/me", 401, newKey.apiKey);
    await call("POST", "/api/auth/logout", 200, freshLogin.apiKey);
    await call("GET", "/api/me", 401, freshLogin.apiKey);
    const activities = await call("GET", "/api/activities");
    assert(activities.length >= 20);
    const filtered = await call("GET", "/api/activities?category=creative");
    assert(filtered.every((a: any) => a.category === "creative"));
    await call("POST", "/api/activities", 400, key, {
      title: "Invalid",
      description: "Test",
      category: "creative",
      energy: 1.5,
      budget: 1,
      social: 1,
      durationMin: 30,
    });
    const created = await call("POST", "/api/activities", 201, key, {
      title: "Test activity",
      description: "A pleasant walk",
      category: "outdoor",
      energy: 2,
      budget: 1,
      social: 2,
      durationMin: 30,
    });
    const session = await call("POST", "/api/sessions", 201, key);
    const resumed = await call("POST", "/api/sessions", 201, key);
    assert.equal(resumed.sessionId, session.sessionId);
    const id = session.sessionId;
    await call("GET", `/api/sessions/${id}/next`, 404, otherKey);
    await call("POST", `/api/sessions/${id}/swipe`, 400, otherKey, {
      activityId: created.id,
      direction: "like",
    });
    // Two full forced cycles catch the old session-based leaderboard miscount.
    for (let i = 0; i < 20; i++) {
      const next = await call("GET", `/api/sessions/${id}/next`, 200, key);
      const vote = await call("POST", `/api/sessions/${id}/swipe`, 200, key, {
        activityId: next.activity.id,
        direction: "reject",
      });
      assert.equal(vote.forced, i % 10 === 9);
      assert.equal(vote.streak, (i + 1) % 10);
      if (i === 0)
        await call("POST", `/api/sessions/${id}/swipe`, 400, key, {
          activityId: next.activity.id,
          direction: "like",
        });
    }
    const matches = await call("GET", "/api/matches", 200, key);
    assert.equal(matches.length, 2);
    await call("PATCH", `/api/matches/${matches[0].id}`, 400, otherKey, {
      status: "done",
    });
    await call("PATCH", `/api/matches/${matches[0].id}`, 200, key, {
      status: "done",
    });
    await call("PATCH", `/api/matches/${matches[1].id}`, 200, key, {
      status: "skipped",
    });
    const shared = await call(
      "POST",
      `/api/matches/${matches[0].id}/share`,
      200,
      key,
    );
    const publicMatch = await call("GET", `/api/shared/${shared.shareToken}`);
    assert.equal(publicMatch.sharedBy, "Updated Adventurer");
    assert.equal(shared.link, `/invite/${shared.shareToken}`);
    const invitation = await app.inject({
      method: "GET",
      url: shared.link,
      headers: { accept: "text/html" },
    });
    assert.equal(invitation.statusCode, 200);
    assert(invitation.payload.includes('<div id="root">'));
    count++;
    const recap = await call("GET", `/api/sessions/${id}/summary`, 200, key);
    assert.equal(recap.totalSwipes, 20);
    assert.equal(recap.forced, 2);
    const board = await call("GET", "/api/leaderboard");
    assert.equal(
      board.find((u: any) => u.userId === me.id).forcedMatchesCount,
      2,
    );
    await call("POST", `/api/sessions/${id}/end`, 200, key);
    await call("GET", `/api/sessions/${id}/next`, 404, key);
    await call("POST", `/api/sessions/${id}/swipe`, 400, key, {
      activityId: created.id,
      direction: "like",
    });
    // Legacy API clients still work.
    await call("GET", "/me", 200, key);
    // Query strings must not bypass credential throttling on either API prefix.
    for (const prefix of ["/api", ""]) {
      let limited = false;
      for (let i = 0; i < 21; i++) {
        const response = await app.inject({
          method: "POST",
          url: `${prefix}/auth/login`,
          payload: { email: "unknown@example.com", password: "incorrect" },
        });
        if (response.statusCode === 429) {
          limited = true;
          break;
        }
        assert.equal(response.statusCode, 401);
      }
      assert(limited, "Credential attempts must be rate limited");
      for (const endpoint of ["login", "register"]) {
        await call(
          "POST",
          `${prefix}/auth/${endpoint}?attempt=1`,
          429,
          undefined,
          {
            email: "unknown@example.com",
            name: "Rate limit regression",
            password: "incorrect",
          },
        );
      }
    }
    console.log(
      `Passed ${count} API checks: auth, credentials, keys, profile, activities, sessions, ownership, forced matches, sharing and leaderboard.`,
    );
  } finally {
    await app.close();
    await db.$disconnect();
  }
}
runTests().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
