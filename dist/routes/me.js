"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.meRoutes = meRoutes;
const zod_1 = require("zod");
const db_js_1 = require("../lib/db.js");
const profile_service_js_1 = require("../services/profile.service.js");
async function meRoutes(fastify) {
    const server = fastify.withTypeProvider();
    // GET /me
    server.get("/me", {
        preHandler: [fastify.authenticate],
        schema: {
            tags: ["Profile"],
            summary: "Get current user details & boredom profile",
            security: [{ apiKey: [] }],
            response: {
                200: zod_1.z.object({
                    id: zod_1.z.string(),
                    email: zod_1.z.string(),
                    name: zod_1.z.string(),
                    boredomProfile: zod_1.z
                        .object({
                        energy: zod_1.z.number(),
                        budget: zod_1.z.number(),
                        social: zod_1.z.number(),
                    })
                        .nullable(),
                    streakRejects: zod_1.z.number(),
                    hasPassword: zod_1.z.boolean(),
                    createdAt: zod_1.z.date(),
                }),
                404: zod_1.z.object({ error: zod_1.z.string(), message: zod_1.z.string() }),
            },
        },
    }, async (request, reply) => {
        const user = await db_js_1.db.user.findUnique({
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
            boredomProfile: user.boredomProfile,
            streakRejects: user.streakRejects,
            hasPassword: Boolean(user.passwordHash),
            createdAt: user.createdAt,
        });
    });
    // PATCH /me
    server.patch("/me", {
        preHandler: [fastify.authenticate],
        schema: {
            tags: ["Profile"],
            summary: "Update boredom profile directly",
            security: [{ apiKey: [] }],
            body: zod_1.z.object({
                name: zod_1.z.string().trim().min(1).max(80).optional(),
                boredomProfile: zod_1.z
                    .object({
                    energy: zod_1.z.number().min(1).max(5),
                    budget: zod_1.z.number().min(1).max(5),
                    social: zod_1.z.number().min(1).max(5),
                })
                    .optional(),
            }),
            response: {
                200: zod_1.z.object({
                    id: zod_1.z.string(),
                    name: zod_1.z.string(),
                    boredomProfile: zod_1.z
                        .object({
                        energy: zod_1.z.number(),
                        budget: zod_1.z.number(),
                        social: zod_1.z.number(),
                    })
                        .nullable(),
                }),
            },
        },
    }, async (request, reply) => {
        const { name, boredomProfile } = request.body;
        const updated = await db_js_1.db.user.update({
            where: { id: request.user.id },
            data: {
                ...(name ? { name } : {}),
                ...(boredomProfile ? { boredomProfile } : {}),
            },
        });
        return reply.send({
            id: updated.id,
            name: updated.name,
            boredomProfile: updated.boredomProfile,
        });
    });
    // GET or POST /me/profile/quiz
    server.get("/me/profile/quiz", {
        preHandler: [fastify.authenticate],
        schema: {
            tags: ["Profile"],
            summary: "Get quiz questions for boredom profile",
            security: [{ apiKey: [] }],
        },
    }, async (request, reply) => {
        return reply.send({ questions: profile_service_js_1.QUIZ_QUESTIONS });
    });
    server.post("/me/profile/quiz", {
        preHandler: [fastify.authenticate],
        schema: {
            tags: ["Profile"],
            summary: "Get quiz questions for boredom profile",
            security: [{ apiKey: [] }],
        },
    }, async (request, reply) => {
        return reply.send({ questions: profile_service_js_1.QUIZ_QUESTIONS });
    });
    // POST /me/profile/answers
    server.post("/me/profile/answers", {
        preHandler: [fastify.authenticate],
        schema: {
            tags: ["Profile"],
            summary: "Submit quiz answers to recompute boredom profile",
            security: [{ apiKey: [] }],
            body: zod_1.z.object({
                answers: zod_1.z
                    .array(zod_1.z.object({
                    questionId: zod_1.z.enum([
                        "energy_level",
                        "budget_flexibility",
                        "social_setting",
                    ]),
                    value: zod_1.z.number().int().min(1).max(5),
                }))
                    .length(3)
                    .refine((answers) => new Set(answers.map((a) => a.questionId)).size === 3, "Answer each question once"),
            }),
        },
    }, async (request, reply) => {
        const profile = (0, profile_service_js_1.computeBoredomProfile)(request.body.answers);
        const updatedUser = await db_js_1.db.user.update({
            where: { id: request.user.id },
            data: { boredomProfile: profile },
        });
        return reply.send({
            message: "Profile updated successfully",
            boredomProfile: updatedUser.boredomProfile,
        });
    });
}
