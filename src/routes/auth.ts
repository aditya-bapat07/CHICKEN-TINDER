import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../lib/db.js";
import { generateApiKey, hashApiKey } from "../lib/apikey.js";
import { hashPassword, verifyPassword } from "../lib/password.js";

const emailSchema = z
  .string()
  .trim()
  .email()
  .transform((v) => v.toLowerCase());
const passwordSchema = z.string().min(8).max(128);

export async function authRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();
  // Bound per-IP credential attempts; entries expire and are cleared on shutdown.
  const attempts = new Map<string, { count: number; until: number }>();
  const cleanup = setInterval(() => {
    for (const [ip, value] of attempts)
      if (value.until < Date.now()) attempts.delete(ip);
  }, 60_000);
  cleanup.unref();
  server.addHook("onClose", async () => clearInterval(cleanup));
  server.addHook("preHandler", async (request, reply) => {
    if (
      request.method !== "POST" ||
      !/\/auth\/(login|register)$/.test(request.url)
    )
      return;
    const now = Date.now();
    const attempt = attempts.get(request.ip);
    if (attempt && attempt.until > now && attempt.count >= 20) {
      return reply
        .code(429)
        .send({
          message: "Too many attempts. Please try again in 15 minutes.",
        });
    }
    attempts.set(
      request.ip,
      attempt && attempt.until > now
        ? { ...attempt, count: attempt.count + 1 }
        : { count: 1, until: now + 900_000 },
    );
  });

  server.post(
    "/auth/register",
    {
      schema: {
        tags: ["Auth"],
        body: z.object({
          email: emailSchema,
          name: z.string().trim().min(1).max(80),
          password: passwordSchema.optional(),
        }),
      },
    },
    async (request, reply) => {
      const { email, name, password } = request.body;
      const existing = await db.user.findFirst({
        where: { email: { equals: email } },
      });
      if (existing)
        return reply
          .code(400)
          .send({
            message:
              "An account with this email already exists. Please sign in.",
          });
      const { rawKey, keyHash } = generateApiKey();
      try {
        const user = await db.user.create({
          data: {
            email,
            name,
            passwordHash: password ? await hashPassword(password) : null,
            apiKeys: { create: { keyHash, label: "Primary key" } },
          },
        });
        return reply
          .code(201)
          .send({
            apiKey: rawKey,
            user: { id: user.id, email: user.email, name: user.name },
          });
      } catch (error: any) {
        if (error.code === "P2002")
          return reply
            .code(400)
            .send({ message: "An account with this email already exists." });
        throw error;
      }
    },
  );

  server.post(
    "/auth/login",
    {
      schema: {
        tags: ["Auth"],
        body: z.object({
          email: emailSchema,
          password: z.string().min(1).max(128),
        }),
      },
    },
    async (request, reply) => {
      const user = await db.user.findUnique({
        where: { email: request.body.email },
      });
      // Derive even for unknown accounts to avoid an immediate timing difference.
      const dummy = "0".repeat(32) + ":" + "0".repeat(128);
      const valid = await verifyPassword(
        request.body.password,
        user?.passwordHash || dummy,
      );
      if (!user?.passwordHash || !valid)
        return reply
          .code(401)
          .send({
            message:
              "Email or password is incorrect. Older accounts can sign in with an API key.",
          });
      const { rawKey, keyHash } = generateApiKey();
      await db.apiKey.create({
        data: { userId: user.id, keyHash, label: "Browser session" },
      });
      return reply.send({ apiKey: rawKey });
    },
  );

  server.post("/auth/email-key", async (_request, reply) =>
    reply.code(410).send({
      message:
        "Email recovery is not configured. Sign in with your password or an existing API key.",
    }),
  );

  server.put(
    "/auth/password",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Auth"],
        body: z.object({
          password: passwordSchema,
          currentPassword: z.string().max(128).optional(),
        }),
      },
    },
    async (request, reply) => {
      const user = await db.user.findUniqueOrThrow({
        where: { id: request.user.id },
      });
      if (
        user.passwordHash &&
        (!request.body.currentPassword ||
          !(await verifyPassword(
            request.body.currentPassword,
            user.passwordHash,
          )))
      ) {
        return reply
          .code(400)
          .send({ message: "Your current password is incorrect." });
      }
      await db.user.update({
        where: { id: user.id },
        data: { passwordHash: await hashPassword(request.body.password) },
      });
      return { message: "Password saved." };
    },
  );

  server.get(
    "/auth/keys",
    { preHandler: [fastify.authenticate], schema: { tags: ["Auth"] } },
    async (request) => {
      const records = await db.apiKey.findMany({
        where: { userId: request.user.id },
        orderBy: { createdAt: "desc" },
      });
      const currentHash = hashApiKey(request.headers["x-api-key"] as string);
      return records.map(
        ({ id, label, lastUsed, revoked, createdAt, keyHash }) => ({
          id,
          label,
          lastUsed,
          revoked,
          createdAt,
          current: keyHash === currentHash,
        }),
      );
    },
  );

  server.post(
    "/auth/keys",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Auth"],
        body: z
          .object({ label: z.string().trim().min(1).max(60).optional() })
          .optional(),
      },
    },
    async (request, reply) => {
      const { rawKey, keyHash } = generateApiKey();
      const key = await db.apiKey.create({
        data: {
          keyHash,
          userId: request.user.id,
          label: request.body?.label || "New key",
        },
      });
      return reply
        .code(201)
        .send({ id: key.id, apiKey: rawKey, label: key.label });
    },
  );

  server.delete(
    "/auth/keys/:id",
    {
      preHandler: [fastify.authenticate],
      schema: { tags: ["Auth"], params: z.object({ id: z.string() }) },
    },
    async (request, reply) => {
      const key = await db.apiKey.findFirst({
        where: { id: request.params.id, userId: request.user.id },
      });
      if (!key) return reply.code(404).send({ message: "API key not found." });
      await db.apiKey.update({
        where: { id: key.id },
        data: { revoked: true },
      });
      return { message: "API key revoked." };
    },
  );

  server.post(
    "/auth/logout",
    { preHandler: [fastify.authenticate] },
    async (request) => {
      // Browser sign-in credentials expire on logout; personal keys remain user-managed.
      await db.apiKey.updateMany({
        where: {
          keyHash: hashApiKey(request.headers["x-api-key"] as string),
          userId: request.user.id,
          label: "Browser session",
        },
        data: { revoked: true },
      });
      return { message: "Signed out." };
    },
  );
}
