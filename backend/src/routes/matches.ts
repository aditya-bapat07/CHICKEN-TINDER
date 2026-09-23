import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import {
  getUserMatches,
  getMatchById,
  updateMatchStatus,
  createShareToken,
  getSharedMatch,
  getLeaderboard,
} from "../services/match.service.js";

export async function matchRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /matches
  server.get(
    "/matches",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Matches"],
        summary: "Get all matches for current user",
        security: [{ apiKey: [] }],
        querystring: z.object({
          status: z.enum(["pending", "done", "skipped"]).optional(),
        }),
      },
    },
    async (request, reply) => {
      const { status } = request.query;
      const matches = await getUserMatches(request.user.id, status);
      return reply.send(matches);
    },
  );

  // GET /matches/:id
  server.get(
    "/matches/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Matches"],
        summary: "Get match by ID",
        security: [{ apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const match = await getMatchById(id, request.user.id);
      if (!match) {
        return reply
          .status(404)
          .send({ error: "Not Found", message: "Match not found" });
      }
      return reply.send(match);
    },
  );

  // PATCH /matches/:id
  server.patch(
    "/matches/:id",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Matches"],
        summary: "Update match status (done or skipped)",
        security: [{ apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
        body: z.object({
          status: z.enum(["done", "skipped"]),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { status } = request.body;

      try {
        const updated = await updateMatchStatus(id, request.user.id, status);
        return reply.send(updated);
      } catch (err: any) {
        return reply
          .status(400)
          .send({ error: "Bad Request", message: err.message });
      }
    },
  );

  // POST /matches/:id/share
  server.post(
    "/matches/:id/share",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Matches"],
        summary: "Generate a public share link for a match",
        security: [{ apiKey: [] }],
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      try {
        const result = await createShareToken(id, request.user.id);
        return reply.send(result);
      } catch (err: any) {
        return reply
          .status(400)
          .send({ error: "Bad Request", message: err.message });
      }
    },
  );

  // GET /shared/:token (Public - no auth key required)
  server.get(
    "/shared/:token",
    {
      schema: {
        tags: ["Public Shared Matches"],
        summary: "Public view of a shared match for friends",
        params: z.object({
          token: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { token } = request.params;

      const match = await getSharedMatch(token);
      if (!match) {
        return reply
          .status(404)
          .send({
            error: "Not Found",
            message: "Shared match link is invalid or expired",
          });
      }

      return reply.send({
        sharedBy: match.user.name,
        activity: {
          title: match.activity.title,
          description: match.activity.description,
          category: match.activity.category,
          energy: match.activity.energy,
          budget: match.activity.budget,
          social: match.activity.social,
          durationMin: match.activity.durationMin,
        },
        status: match.status,
        createdAt: match.createdAt,
      });
    },
  );

  // GET /leaderboard (Bonus)
  server.get(
    "/leaderboard",
    {
      schema: {
        tags: ["Leaderboard"],
        summary: "Leaderboard of users with most forced matches",
      },
    },
    async (request, reply) => {
      const leaderboard = await getLeaderboard();
      return reply.send(leaderboard);
    },
  );
}
