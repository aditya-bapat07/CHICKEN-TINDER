import "dotenv/config";
import { PrismaClient } from "@prisma/client";

// Reuse the client/pool across requests in a warm serverless instance.
const globalDb = globalThis as unknown as { chickenDb?: PrismaClient };
export const db = globalDb.chickenDb ?? new PrismaClient();
globalDb.chickenDb = db;
