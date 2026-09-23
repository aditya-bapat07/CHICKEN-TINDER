import { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import { jsonSchemaTransform } from "fastify-type-provider-zod";

export const swaggerPlugin = fp(async (fastify: FastifyInstance) => {
  await fastify.register(swagger, {
    openapi: {
      info: {
        title: "Chicken Tinder API",
        description:
          "Boredom solver & activity matcher with a 10-reject commitment device gimmick.",
        version: "1.0.0",
      },
      components: {
        securitySchemes: {
          apiKey: {
            type: "apiKey",
            name: "x-api-key",
            in: "header",
            description: "API key authentication header",
          },
        },
      },
      security: [{ apiKey: [] }],
    },
    transform: jsonSchemaTransform,
  });

  await fastify.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
      docExpansion: "list",
      deepLinking: false,
    },
  });
});
