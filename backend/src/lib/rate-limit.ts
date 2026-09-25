import { createHash } from "node:crypto";
import { isIP } from "node:net";
import { FastifyRequest } from "fastify";
import { db } from "./db.js";

export function clientIp(request: FastifyRequest) {
  // Only the Vercel runtime may supply this trusted platform header.
  const forwarded = request.headers["x-vercel-forwarded-for"];
  if (process.env.VERCEL === "1" && typeof forwarded === "string") {
    const ip = forwarded.split(",")[0].trim();
    if (isIP(ip)) return ip;
  }
  return request.ip;
}

export async function consumeLimit(
  scope: string,
  identity: string,
  limit: number,
  seconds: number,
) {
  const key = `${scope}:${createHash("sha256").update(identity).digest("hex")}`;
  // Atomic upsert prevents parallel instances/requests from bypassing the limit.
  const [bucket] = await db.$queryRaw<{ count: number; retryAfter: number }[]>`
    INSERT INTO "RateLimit" ("key", "count", "expiresAt")
    VALUES (${key}, 1, NOW() + ${seconds} * INTERVAL '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE WHEN "RateLimit"."expiresAt" <= NOW() THEN 1
        ELSE LEAST("RateLimit"."count" + 1, ${limit + 1}) END,
      "expiresAt" = CASE WHEN "RateLimit"."expiresAt" <= NOW()
        THEN NOW() + ${seconds} * INTERVAL '1 second' ELSE "RateLimit"."expiresAt" END
    RETURNING "count", GREATEST(1, CEIL(EXTRACT(EPOCH FROM ("expiresAt" - NOW()))))::int AS "retryAfter"
  `;
  // Bounded, indexed cleanup also works in serverless processes without timers.
  await db.$executeRaw`
    DELETE FROM "RateLimit" WHERE "key" IN (
      SELECT "key" FROM "RateLimit" WHERE "expiresAt" < NOW()
      ORDER BY "expiresAt" LIMIT 100 FOR UPDATE SKIP LOCKED
    )
  `;
  if (bucket.count > limit) {
    const error = new Error(
      "Too many attempts. Please try again later.",
    ) as Error & {
      statusCode: number;
      retryAfter: number;
    };
    error.statusCode = 429;
    error.retryAfter = bucket.retryAfter;
    throw error;
  }
}
