"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.activityRoutes = activityRoutes;
const zod_1 = require("zod");
const db_js_1 = require("../lib/db.js");
async function activityRoutes(fastify) {
    const server = fastify.withTypeProvider();
    // GET /activities
    server.get("/activities", {
        schema: {
            tags: ["Activities"],
            summary: "Get list of activities with optional filters",
            querystring: zod_1.z.object({
                category: zod_1.z.string().optional(),
                energy: zod_1.z.coerce.number().min(1).max(5).optional(),
                budget: zod_1.z.coerce.number().min(1).max(5).optional(),
            }),
        },
    }, async (request, reply) => {
        const { category, energy, budget } = request.query;
        const activities = await db_js_1.db.activity.findMany({
            where: {
                ...(category ? { category } : {}),
                ...(energy ? { energy } : {}),
                ...(budget ? { budget } : {}),
            },
        });
        return reply.send(activities);
    });
    // GET /activities/:id
    server.get("/activities/:id", {
        schema: {
            tags: ["Activities"],
            summary: "Get single activity details by ID",
            params: zod_1.z.object({
                id: zod_1.z.string(),
            }),
        },
    }, async (request, reply) => {
        const { id } = request.params;
        const activity = await db_js_1.db.activity.findUnique({
            where: { id },
        });
        if (!activity) {
            return reply
                .status(404)
                .send({ error: "Not Found", message: "Activity not found" });
        }
        return reply.send(activity);
    });
    // POST /activities (Admin / authed)
    server.post("/activities", {
        preHandler: [fastify.authenticate],
        schema: {
            tags: ["Activities"],
            summary: "Create a new activity",
            security: [{ apiKey: [] }],
            body: zod_1.z.object({
                title: zod_1.z.string().trim().min(1).max(160),
                description: zod_1.z.string().trim().min(1).max(2000),
                category: zod_1.z.enum([
                    "outdoor",
                    "creative",
                    "social",
                    "solo",
                    "fitness",
                    "learning",
                    "gaming",
                    "relaxation",
                ]),
                energy: zod_1.z.number().int().min(1).max(5),
                budget: zod_1.z.number().int().min(1).max(5),
                social: zod_1.z.number().int().min(1).max(5),
                durationMin: zod_1.z.number().int().min(1).max(1440),
            }),
        },
    }, async (request, reply) => {
        const newActivity = await db_js_1.db.activity.create({
            data: request.body,
        });
        return reply.status(201).send(newActivity);
    });
}
