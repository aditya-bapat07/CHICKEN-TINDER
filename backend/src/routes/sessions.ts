import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../lib/db.js";
import { pickNextActivity, handleSwipe } from "../services/swipe.service.js";

export async function sessionRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // POST /sessions
  server.post(
    "/sessions",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Swipe Sessions"],
        summary: "Start a new swipe session",
        security: [{ apiKey: [] }],
        response: {
          201: z.object({
            sessionId: z.string(),
            streakRejects: z.number(),
            startedAt: z.date(),
            message: z.string(),
          }),
        },
      },
    },
    async (request, reply) => {
      const session = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${request.user.id} FOR UPDATE`;
        const active = await tx.swipeSession.findFirst({
          where: { userId: request.user.id, endedAt: null },
          orderBy: { startedAt: "desc" },
        });
        if (active) return active;
        await tx.user.update({
          where: { id: request.user.id },
          data: { streakRejects: 0 },
        });
        return tx.swipeSession.create({ data: { userId: request.user.id } });
      });

      return reply.status(201).send({
        sessionId: session.id,
        streakRejects: (
          await db.user.findUniqueOrThrow({ where: { id: request.user.id } })
        ).streakRejects,
        startedAt: session.startedAt,
        message: "Swipe session initialized. Get swiping!",
      });
    },
  );

  // GET /sessions/:id/next
  server.get(
    "/sessions/:id/next",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Swipe Sessions"],
        summary: "Get next activity candidate for swiping",
        security: [{ apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const session = await db.swipeSession.findUnique({
        where: { id },
      });

      if (!session || session.userId !== request.user.id || session.endedAt) {
        return reply
          .status(404)
          .send({ error: "Not Found", message: "Active session not found" });
      }

      const nextActivity = await pickNextActivity(request.user.id, session.id);

      if (!nextActivity) {
        return reply.send({
          activity: null,
          message: "No more activities available for swiping!",
        });
      }

      return reply.send({
        activity: {
          id: nextActivity.id,
          title: nextActivity.title,
          description: nextActivity.description,
          category: nextActivity.category,
          energy: nextActivity.energy,
          budget: nextActivity.budget,
          social: nextActivity.social,
          durationMin: nextActivity.durationMin,
          score: (nextActivity as any).score,
        },
      });
    },
  );

  // POST /sessions/:id/swipe
  server.post(
    "/sessions/:id/swipe",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Swipe Sessions"],
        summary: "Record a swipe on an activity",
        security: [{ apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          activityId: z.string(),
          direction: z.enum(["like", "reject"]),
        }),
        response: {
          200: z.object({
            accepted: z.boolean(),
            forced: z.boolean(),
            streak: z.number(),
            message: z.string(),
          }),
          400: z.object({ error: z.string(), message: z.string() }),
          404: z.object({ error: z.string(), message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const { id: sessionId } = request.params;
      const { activityId, direction } = request.body;

      try {
        const result = await handleSwipe(
          request.user.id,
          sessionId,
          activityId,
          direction,
        );
        return reply.send(result);
      } catch (err: any) {
        throw err;
      }
    },
  );

  // POST /sessions/:id/end
  server.post(
    "/sessions/:id/end",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Swipe Sessions"],
        summary: "End a swipe session",
        security: [{ apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const session = await db.swipeSession.findUnique({ where: { id } });
      if (!session || session.userId !== request.user.id) {
        return reply
          .status(404)
          .send({ error: "Not Found", message: "Session not found" });
      }

      const updated = await db.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${request.user.id} FOR UPDATE`;
        return tx.swipeSession.update({
          where: { id },
          data: { endedAt: new Date() },
        });
      });

      return reply.send({
        message: "Session ended successfully",
        endedAt: updated.endedAt,
      });
    },
  );

  // GET /sessions/:id/summary (Bonus)
  server.get(
    "/sessions/:id/summary",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Swipe Sessions"],
        summary: "Post-session recap summary",
        security: [{ apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const session = await db.swipeSession.findUnique({
        where: { id },
        include: {
          swipes: {
            include: { activity: true },
          },
        },
      });

      if (!session || session.userId !== request.user.id) {
        return reply
          .status(404)
          .send({ error: "Not Found", message: "Session not found" });
      }

      const totalSwipes = session.swipes.length;
      const likes = session.swipes.filter((s) => s.direction === "like").length;
      const rejects = session.swipes.filter(
        (s) => s.direction === "reject",
      ).length;
      const forced = session.swipes.filter(
        (s) => s.direction === "forced_accept",
      ).length;

      return reply.send({
        sessionId: session.id,
        totalSwipes,
        likes,
        rejects,
        forced,
        forcedAt: session.forcedAt,
        recapMessage: `You swiped ${totalSwipes} times: rejected ${rejects} activities and were forced into ${forced}.`,
      });
    },
  );
}
