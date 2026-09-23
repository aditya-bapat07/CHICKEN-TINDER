import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { db } from "../lib/db.js";
import { hashApiKey } from "../lib/apikey.js";

export interface UserPayload {
  id: string;
  email: string;
  name: string;
  boredomProfile: {
    energy: number;
    budget: number;
    social: number;
  } | null;
  streakRejects: number;
}

declare module "fastify" {
  interface FastifyInstance {
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply,
    ) => Promise<void>;
  }
  interface FastifyRequest {
    user: UserPayload;
  }
}

export const authPlugin = fp(async (fastify: FastifyInstance) => {
  fastify.decorateRequest("user", null as any);

  fastify.decorate(
    "authenticate",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const rawApiKey = request.headers["x-api-key"];

      if (!rawApiKey || typeof rawApiKey !== "string") {
        return reply
          .status(401)
          .send({ error: "Unauthorized", message: "Missing x-api-key header" });
      }

      const keyHash = hashApiKey(rawApiKey);

      const apiKeyRecord = await db.apiKey.findUnique({
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

      db.apiKey
        .update({
          where: { id: apiKeyRecord.id },
          data: { lastUsed: new Date() },
        })
        .catch(() => {});

      request.user = {
        id: apiKeyRecord.user.id,
        email: apiKeyRecord.user.email,
        name: apiKeyRecord.user.name,
        boredomProfile: apiKeyRecord.user.boredomProfile as any,
        streakRejects: apiKeyRecord.user.streakRejects,
      };
    },
  );
});
