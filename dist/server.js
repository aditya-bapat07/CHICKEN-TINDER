"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildApp = buildApp;
const fastify_1 = __importDefault(require("fastify"));
const static_1 = __importDefault(require("@fastify/static"));
const node_fs_1 = require("node:fs");
const node_path_1 = __importDefault(require("node:path"));
const fastify_type_provider_zod_1 = require("fastify-type-provider-zod");
const dotenv_1 = __importDefault(require("dotenv"));
const auth_js_1 = require("./plugins/auth.js");
const swagger_js_1 = require("./plugins/swagger.js");
const auth_js_2 = require("./routes/auth.js");
const me_js_1 = require("./routes/me.js");
const activities_js_1 = require("./routes/activities.js");
const sessions_js_1 = require("./routes/sessions.js");
const matches_js_1 = require("./routes/matches.js");
const db_js_1 = require("./lib/db.js");
dotenv_1.default.config();
async function buildApp() {
    const app = (0, fastify_1.default)({
        logger: {
            level: process.env.NODE_ENV === "test" ? "silent" : "info",
        },
    });
    // Configure Zod type provider compilers
    app.setValidatorCompiler(fastify_type_provider_zod_1.validatorCompiler);
    app.setSerializerCompiler(fastify_type_provider_zod_1.serializerCompiler);
    // Register custom plugins
    await app.register(swagger_js_1.swaggerPlugin);
    await app.register(auth_js_1.authPlugin);
    async function apiRoutes(server) {
        await server.register(auth_js_2.authRoutes);
        await server.register(me_js_1.meRoutes);
        await server.register(activities_js_1.activityRoutes);
        await server.register(sessions_js_1.sessionRoutes);
        await server.register(matches_js_1.matchRoutes);
    }
    await app.register(apiRoutes, { prefix: "/api" });
    // Keep the original API URLs for existing clients.
    await app.register(apiRoutes);
    app.get("/health", async () => ({ status: "online" }));
    const frontendRoot = node_path_1.default.resolve(process.cwd(), "frontend/dist");
    if ((0, node_fs_1.existsSync)(node_path_1.default.join(frontendRoot, "index.html"))) {
        await app.register(static_1.default, {
            root: frontendRoot,
            prefix: "/",
            wildcard: false,
        });
        app.addHook("onRequest", async (request, reply) => {
            // Browser navigation and API clients share the legacy paths.
            const pathname = request.url.split("?")[0];
            if (request.method === "GET" &&
                ["/activities", "/matches", "/leaderboard"].includes(pathname) &&
                request.headers.accept?.includes("text/html")) {
                return reply.sendFile("index.html");
            }
        });
        app.setNotFoundHandler((request, reply) => {
            if (request.method === "GET" &&
                !request.url.startsWith("/api/") &&
                request.headers.accept?.includes("text/html")) {
                return reply.sendFile("index.html");
            }
            return reply.code(404).send({ message: "Route not found" });
        });
    }
    else {
        app.get("/", async () => ({
            name: "Chicken Tinder API",
            status: "online",
            docs: "/docs",
        }));
    }
    return app;
}
async function start() {
    const app = await buildApp();
    const port = Number(process.env.PORT) || 3000;
    const host = "0.0.0.0";
    try {
        await app.listen({ port, host });
        console.log(`🐔 Chicken Tinder API running on http://localhost:${port}`);
        console.log(`📜 Swagger Documentation: http://localhost:${port}/docs`);
    }
    catch (err) {
        app.log.error(err);
        await db_js_1.db.$disconnect();
        process.exit(1);
    }
}
const isDirectRun = Boolean((process.argv[1] && process.argv[1].endsWith("server.ts")) ||
    process.argv[1]?.endsWith("server.js"));
if (isDirectRun) {
    start();
}
