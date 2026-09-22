"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionRoutes = sessionRoutes;
const zod_1 = require("zod");
const db_js_1 = require("../lib/db.js");
const swipe_service_js_1 = require("../services/swipe.service.js");
async function sessionRoutes(fastify) {
    const server = fastify.withTypeProvider();
    // POST /sessions
    server.post("/sessions", {
        preHandler: [fastify.authenticate],
        schema: {
            tags: ["Swipe Sessions"],
            summary: "Start a new swipe session",
            security: [{ apiKey: [] }],
            response: {
                201: zod_1.z.object({
                    sessionId: zod_1.z.string(),
                    streakRejects: zod_1.z.number(),
                    startedAt: zod_1.z.date(),
                    message: zod_1.z.string(),
                }),
            },
        },
    }, async (request, reply) => {
        const session = await db_js_1.db.$transaction(async (tx) => {
            const active = await tx.swipeSession.findFirst({
                where: { userId: request.user.id, endedAt: null },
                orderBy: { startedAt: "desc" },
            });
            if (active)
                return active;
            await tx.user.update({
                where: { id: request.user.id },
                data: { streakRejects: 0 },
            });
            return tx.swipeSession.create({ data: { userId: request.user.id } });
        });
        return reply.status(201).send({
            sessionId: session.id,
            streakRejects: (await db_js_1.db.user.findUniqueOrThrow({ where: { id: request.user.id } })).streakRejects,
            startedAt: session.startedAt,
            message: "Swipe session initialized. Get swiping!",
        });
    });
    // GET /sessions/:id/next
    server.get("/sessions/:id/next", {
        preHandler: [fastify.authenticate],
        schema: {
            tags: ["Swipe Sessions"],
            summary: "Get next activity candidate for swiping",
            security: [{ apiKey: [] }],
            params: zod_1.z.object({
                id: zod_1.z.string(),
            }),
        },
    }, async (request, reply) => {
        const { id } = request.params;
        const session = await db_js_1.db.swipeSession.findUnique({
            where: { id },
        });
        if (!session || session.userId !== request.user.id || session.endedAt) {
            return reply
                .status(404)
                .send({ error: "Not Found", message: "Active session not found" });
        }
        const nextActivity = await (0, swipe_service_js_1.pickNextActivity)(request.user.id, session.id);
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
                score: nextActivity.score,
            },
        });
    });
    // POST /sessions/:id/swipe
    server.post("/sessions/:id/swipe", {
        preHandler: [fastify.authenticate],
        schema: {
            tags: ["Swipe Sessions"],
            summary: "Record a swipe on an activity",
            security: [{ apiKey: [] }],
            params: zod_1.z.object({
                id: zod_1.z.string(),
            }),
            body: zod_1.z.object({
                activityId: zod_1.z.string(),
                direction: zod_1.z.enum(["like", "reject"]),
            }),
            response: {
                200: zod_1.z.object({
                    accepted: zod_1.z.boolean(),
                    forced: zod_1.z.boolean(),
                    streak: zod_1.z.number(),
                    message: zod_1.z.string(),
                }),
                400: zod_1.z.object({ error: zod_1.z.string(), message: zod_1.z.string() }),
                404: zod_1.z.object({ error: zod_1.z.string(), message: zod_1.z.string() }),
            },
        },
    }, async (request, reply) => {
        const { id: sessionId } = request.params;
        const { activityId, direction } = request.body;
        try {
            const result = await (0, swipe_service_js_1.handleSwipe)(request.user.id, sessionId, activityId, direction);
            return reply.send(result);
        }
        catch (err) {
            return reply
                .status(400)
                .send({ error: "Bad Request", message: err.message });
        }
    });
    // POST /sessions/:id/end
    server.post("/sessions/:id/end", {
        preHandler: [fastify.authenticate],
        schema: {
            tags: ["Swipe Sessions"],
            summary: "End a swipe session",
            security: [{ apiKey: [] }],
            params: zod_1.z.object({
                id: zod_1.z.string(),
            }),
        },
    }, async (request, reply) => {
        const { id } = request.params;
        const session = await db_js_1.db.swipeSession.findUnique({ where: { id } });
        if (!session || session.userId !== request.user.id) {
            return reply
                .status(404)
                .send({ error: "Not Found", message: "Session not found" });
        }
        const updated = await db_js_1.db.swipeSession.update({
            where: { id },
            data: { endedAt: new Date() },
        });
        return reply.send({
            message: "Session ended successfully",
            endedAt: updated.endedAt,
        });
    });
    // GET /sessions/:id/summary (Bonus)
    server.get("/sessions/:id/summary", {
        preHandler: [fastify.authenticate],
        schema: {
            tags: ["Swipe Sessions"],
            summary: "Post-session recap summary",
            security: [{ apiKey: [] }],
            params: zod_1.z.object({
                id: zod_1.z.string(),
            }),
        },
    }, async (request, reply) => {
        const { id } = request.params;
        const session = await db_js_1.db.swipeSession.findUnique({
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
        const rejects = session.swipes.filter((s) => s.direction === "reject").length;
        const forced = session.swipes.filter((s) => s.direction === "forced_accept").length;
        return reply.send({
            sessionId: session.id,
            totalSwipes,
            likes,
            rejects,
            forced,
            forcedAt: session.forcedAt,
            recapMessage: `You swiped ${totalSwipes} times: rejected ${rejects} activities and were forced into ${forced}.`,
        });
    });
}
