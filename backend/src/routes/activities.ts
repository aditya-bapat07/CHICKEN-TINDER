import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../lib/db.js";
import { consumeLimit } from "../lib/rate-limit.js";

export async function activityRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /activities
  server.get(
    "/activities",
    {
      schema: {
        tags: ["Activities"],
        summary: "Get list of activities with optional filters",
        querystring: z.object({
          category: z.string().optional(),
          energy: z.coerce.number().min(1).max(5).optional(),
          budget: z.coerce.number().min(1).max(5).optional(),
        }),
      },
    },
    async (request, reply) => {
      const { category, energy, budget } = request.query;

      const activities = await db.activity.findMany({
        where: {
          ...(category ? { category } : {}),
          ...(energy ? { energy } : {}),
          ...(budget ? { budget } : {}),
        },
      });

      return reply.send(activities);
    },
  );

  // GET /activities/:id
  server.get(
    "/activities/:id",
    {
      schema: {
        tags: ["Activities"],
        summary: "Get single activity details by ID",
        params: z.object({
          id: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { id } = request.params;

      const activity = await db.activity.findUnique({
        where: { id },
      });

      if (!activity) {
        return reply
          .status(404)
          .send({ error: "Not Found", message: "Activity not found" });
      }

      return reply.send(activity);
    },
  );

  // POST /activities (Admin / authed)
  server.post(
    "/activities",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Activities"],
        summary: "Create a new activity",
        security: [{ apiKey: [] }],
        body: z.object({
          title: z.string().trim().min(1).max(160),
          description: z.string().trim().min(1).max(2000),
          category: z.enum([
            "outdoor",
            "creative",
            "social",
            "solo",
            "fitness",
            "learning",
            "gaming",
            "relaxation",
          ]),
          energy: z.number().int().min(1).max(5),
          budget: z.number().int().min(1).max(5),
          social: z.number().int().min(1).max(5),
          durationMin: z.number().int().min(1).max(1440),
        }),
      },
    },
    async (request, reply) => {
      await consumeLimit("activities", request.user.id, 10, 3600);
      const newActivity = await db.activity.create({
        data: request.body,
      });

      return reply.status(201).send(newActivity);
    },
  );
}
