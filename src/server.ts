import Fastify, { FastifyInstance } from "fastify";
import staticPlugin from "@fastify/static";
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
    },
  });

  // Configure Zod type provider compilers
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

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

async function start() {
  const app = await buildApp();
  const port = Number(process.env.PORT) || 3000;
  const host = "0.0.0.0";

  try {
    await app.listen({ port, host });
    console.log(`🐔 Chicken Tinder API running on http://localhost:${port}`);
    console.log(`📜 Swagger Documentation: http://localhost:${port}/docs`);
  } catch (err) {
    app.log.error(err);
    await db.$disconnect();
    process.exit(1);
  }
}

const isDirectRun = Boolean(
  (process.argv[1] && process.argv[1].endsWith("server.ts")) ||
  process.argv[1]?.endsWith("server.js"),
);
if (isDirectRun) {
  start();
}
