import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient(
  process.env.TEST_DATABASE_URL
    ? { datasources: { db: { url: process.env.TEST_DATABASE_URL } } }
    : undefined,
);
