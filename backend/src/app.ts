import Fastify, { FastifyInstance, FastifyError } from "fastify";
import staticPlugin from "@fastify/static";
import helmet from "@fastify/helmet";
import { existsSync } from "node:fs";
import path from "node:path";
import {
  serializerCompiler,
  validatorCompiler,
} from "fastify-type-provider-zod";
import dotenv from "dotenv";
import { authPlugin } from "./plugins/auth.js";
import { swaggerPlugin } from "./plugins/swagger.js";
import { authRoutes } from "./routes/auth.js";
import { meRoutes } from "./routes/me.js";
import { activityRoutes } from "./routes/activities.js";
import { sessionRoutes } from "./routes/sessions.js";
import { matchRoutes } from "./routes/matches.js";
import { db } from "./lib/db.js";

dotenv.config();

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === "test" ? "silent" : "info",
      redact: [
        "req.headers.authorization",
        "req.headers.x-api-key",
        "req.headers.cookie",
      ],
    },
  });

  // Configure Zod type provider compilers
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  await app.register(helmet, { contentSecurityPolicy: false });
  app.addHook("onRequest", async (_request, reply) => {
    reply.header("Cache-Control", "no-store");
    reply.header(
      "Permissions-Policy",
      "camera=(), microphone=(), geolocation=()",
    );
  });
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const status =
      error.statusCode && error.statusCode >= 400 && error.statusCode < 500
        ? error.statusCode
        : 500;
    if (status === 500) request.log.error({ err: error }, "Request failed");
    const retryAfter = (error as { retryAfter?: number }).retryAfter;
    if (retryAfter) reply.header("Retry-After", retryAfter);
    reply.code(status).send({
      error: status === 500 ? "Internal Server Error" : "Request rejected",
      message:
        status === 500
          ? "Something went wrong. Please try again."
          : error.message,
    });
  });

  // Register custom plugins
  await app.register(swaggerPlugin);
  await app.register(authPlugin);

  async function apiRoutes(server: FastifyInstance) {
    await server.register(authRoutes);
    await server.register(meRoutes);
    await server.register(activityRoutes);
    await server.register(sessionRoutes);
    await server.register(matchRoutes);
  }
  await app.register(apiRoutes, { prefix: "/api" });
  // Keep the original API URLs for existing clients.
  await app.register(apiRoutes);
  app.get("/health", async () => ({ status: "online" }));
  app.get("/api/health", async (_request, reply) => {
    try {
      await db.activity.count();
      return { status: "online", database: "connected" };
    } catch {
      return reply.code(503).send({ status: "unavailable" });
    }
  });
  const frontendRoot = path.resolve(process.cwd(), "frontend/dist");
  if (existsSync(path.join(frontendRoot, "index.html"))) {
    await app.register(staticPlugin, {
      root: frontendRoot,
      prefix: "/",
      wildcard: false,
    });
    app.addHook("onRequest", async (request, reply) => {
      // Browser navigation and API clients share the legacy paths.
      const pathname = request.url.split("?")[0];
      if (
        request.method === "GET" &&
        ["/activities", "/matches", "/leaderboard"].includes(pathname) &&
        request.headers.accept?.includes("text/html")
      ) {
        return reply.sendFile("index.html");
      }
    });
    app.setNotFoundHandler((request, reply) => {
      if (
        request.method === "GET" &&
        !request.url.startsWith("/api/") &&
        request.headers.accept?.includes("text/html")
      ) {
        return reply.sendFile("index.html");
      }
      return reply.code(404).send({ message: "Route not found" });
    });
  } else {
    app.get("/", async () => ({
      name: "Chicken Tinder API",
      status: "online",
      docs: "/docs",
    }));
  }

  return app;
}
