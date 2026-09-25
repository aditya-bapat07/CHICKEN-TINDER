import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../lib/db.js";
import { generateApiKey, hashApiKey } from "../lib/apikey.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { clientIp, consumeLimit } from "../lib/rate-limit.js";

const emailSchema = z
  .string()
  .trim()
  .email()
  .transform((v) => v.toLowerCase());
const passwordSchema = z.string().min(8).max(128);

export async function authRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();
  server.addHook("preHandler", async (request) => {
    if (
      request.method !== "POST" ||
      !/\/auth\/(login|register)$/.test(request.routeOptions.url ?? "")
    )
      return;
    await consumeLimit("credentials", clientIp(request), 20, 900);
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
        return reply.code(400).send({
          message: "An account with this email already exists. Please sign in.",
        });
      const { rawKey, keyHash } = generateApiKey();
      try {
        const user = await db.user.create({
          data: {
            email,
            name,
            passwordHash: password ? await hashPassword(password) : null,
            apiKeys: {
              create: {
                keyHash,
                label: password ? "Browser session" : "Primary key",
                kind: password ? "session" : "personal",
                expiresAt: password
                  ? new Date(Date.now() + 7 * 86400_000)
                  : null,
              },
            },
          },
        });
        return reply.code(201).send({
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
        return reply.code(401).send({
          message:
            "Email or password is incorrect. Older accounts can sign in with an API key.",
        });
      const { rawKey, keyHash } = generateApiKey();
      await db.apiKey.create({
        data: {
          userId: user.id,
          keyHash,
          label: "Browser session",
          kind: "session",
          expiresAt: new Date(Date.now() + 7 * 86400_000),
        },
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
      await consumeLimit("password", request.user.id, 10, 900);
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
      const passwordHash = await hashPassword(request.body.password);
      await db.$transaction([
        db.user.update({ where: { id: user.id }, data: { passwordHash } }),
        db.apiKey.updateMany({
          where: {
            userId: user.id,
            kind: "session",
            keyHash: {
              not: hashApiKey(request.headers["x-api-key"] as string),
            },
          },
          data: { revoked: true },
        }),
      ]);
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
        ({ id, label, lastUsed, revoked, createdAt, keyHash, expiresAt }) => ({
          id,
          label,
          lastUsed,
          revoked,
          expired: Boolean(expiresAt && expiresAt <= new Date()),
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
      await consumeLimit("keys", request.user.id, 20, 86400);
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
          kind: "session",
        },
        data: { revoked: true },
      });
      return { message: "Signed out." };
    },
  );
}
