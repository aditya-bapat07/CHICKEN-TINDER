import { FastifyInstance } from "fastify";
import { ZodTypeProvider } from "fastify-type-provider-zod";
import { z } from "zod";
import { db } from "../lib/db.js";
import {
  QUIZ_QUESTIONS,
  computeBoredomProfile,
} from "../services/profile.service.js";

export async function meRoutes(fastify: FastifyInstance) {
  const server = fastify.withTypeProvider<ZodTypeProvider>();

  // GET /me
  server.get(
    "/me",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Profile"],
        summary: "Get current user details & boredom profile",
        security: [{ apiKey: [] }],
        response: {
          200: z.object({
            id: z.string(),
            email: z.string(),
            name: z.string(),
            boredomProfile: z
              .object({
                energy: z.number(),
                budget: z.number(),
                social: z.number(),
              })
              .nullable(),
            streakRejects: z.number(),
            hasPassword: z.boolean(),
            createdAt: z.date(),
          }),
          404: z.object({ error: z.string(), message: z.string() }),
        },
      },
    },
    async (request, reply) => {
      const user = await db.user.findUnique({
        where: { id: request.user.id },
      });

      if (!user) {
        return reply
          .status(404)
          .send({ error: "Not Found", message: "User not found" });
      }

      return reply.send({
        id: user.id,
        email: user.email,
        name: user.name,
        boredomProfile: user.boredomProfile as any,
        streakRejects: user.streakRejects,
        hasPassword: Boolean(user.passwordHash),
        createdAt: user.createdAt,
      });
    },
  );

  // PATCH /me
  server.patch(
    "/me",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Profile"],
        summary: "Update boredom profile directly",
        security: [{ apiKey: [] }],
        body: z.object({
          name: z.string().trim().min(1).max(80).optional(),
          boredomProfile: z
            .object({
              energy: z.number().min(1).max(5),
              budget: z.number().min(1).max(5),
              social: z.number().min(1).max(5),
            })
            .optional(),
        }),
        response: {
          200: z.object({
            id: z.string(),
            name: z.string(),
            boredomProfile: z
              .object({
                energy: z.number(),
                budget: z.number(),
                social: z.number(),
              })
              .nullable(),
          }),
        },
      },
    },
    async (request, reply) => {
      const { name, boredomProfile } = request.body;

      const updated = await db.user.update({
        where: { id: request.user.id },
        data: {
          ...(name ? { name } : {}),
          ...(boredomProfile ? { boredomProfile } : {}),
        },
      });

      return reply.send({
        id: updated.id,
        name: updated.name,
        boredomProfile: updated.boredomProfile as any,
      });
    },
  );

  // GET or POST /me/profile/quiz
  server.get(
    "/me/profile/quiz",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Profile"],
        summary: "Get quiz questions for boredom profile",
        security: [{ apiKey: [] }],
      },
    },
    async (request, reply) => {
      return reply.send({ questions: QUIZ_QUESTIONS });
    },
  );

  server.post(
    "/me/profile/quiz",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Profile"],
        summary: "Get quiz questions for boredom profile",
        security: [{ apiKey: [] }],
      },
    },
    async (request, reply) => {
      return reply.send({ questions: QUIZ_QUESTIONS });
    },
  );

  // POST /me/profile/answers
  server.post(
    "/me/profile/answers",
    {
      preHandler: [fastify.authenticate],
      schema: {
        tags: ["Profile"],
        summary: "Submit quiz answers to recompute boredom profile",
        security: [{ apiKey: [] }],
        body: z.object({
          answers: z
            .array(
              z.object({
                questionId: z.enum([
                  "energy_level",
                  "budget_flexibility",
                  "social_setting",
                ]),
                value: z.number().int().min(1).max(5),
              }),
            )
            .length(3)
            .refine(
              (answers) => new Set(answers.map((a) => a.questionId)).size === 3,
              "Answer each question once",
            ),
        }),
      },
    },
    async (request, reply) => {
      const profile = computeBoredomProfile(request.body.answers);

      const updatedUser = await db.user.update({
        where: { id: request.user.id },
        data: { boredomProfile: profile },
      });

      return reply.send({
        message: "Profile updated successfully",
        boredomProfile: updatedUser.boredomProfile,
      });
    },
  );
}
