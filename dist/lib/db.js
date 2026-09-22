"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const client_1 = require("@prisma/client");
exports.db = new client_1.PrismaClient(process.env.TEST_DATABASE_URL
    ? { datasources: { db: { url: process.env.TEST_DATABASE_URL } } }
    : undefined);
