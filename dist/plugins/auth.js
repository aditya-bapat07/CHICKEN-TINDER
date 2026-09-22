"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const db_js_1 = require("../lib/db.js");
const apikey_js_1 = require("../lib/apikey.js");
exports.authPlugin = (0, fastify_plugin_1.default)(async (fastify) => {
    fastify.decorateRequest("user", null);
    fastify.decorate("authenticate", async (request, reply) => {
        const rawApiKey = request.headers["x-api-key"];
        if (!rawApiKey || typeof rawApiKey !== "string") {
            return reply
                .status(401)
                .send({ error: "Unauthorized", message: "Missing x-api-key header" });
        }
        const keyHash = (0, apikey_js_1.hashApiKey)(rawApiKey);
        const apiKeyRecord = await db_js_1.db.apiKey.findUnique({
            where: { keyHash },
            include: { user: true },
        });
        if (!apiKeyRecord || apiKeyRecord.revoked) {
            return reply
                .status(401)
                .send({
                error: "Unauthorized",
                message: "Invalid or revoked API key",
            });
        }
        db_js_1.db.apiKey
            .update({
            where: { id: apiKeyRecord.id },
            data: { lastUsed: new Date() },
        })
            .catch(() => { });
        request.user = {
            id: apiKeyRecord.user.id,
            email: apiKeyRecord.user.email,
            name: apiKeyRecord.user.name,
            boredomProfile: apiKeyRecord.user.boredomProfile,
            streakRejects: apiKeyRecord.user.streakRejects,
        };
    });
});
