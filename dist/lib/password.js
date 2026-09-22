"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
const node_crypto_1 = require("node:crypto");
const node_util_1 = require("node:util");
const derive = (0, node_util_1.promisify)(node_crypto_1.scrypt);
async function hashPassword(password) {
    const salt = (0, node_crypto_1.randomBytes)(16).toString("hex");
    const key = (await derive(password, salt, 64));
    return `${salt}:${key.toString("hex")}`;
}
async function verifyPassword(password, stored) {
    const [salt, hash] = stored.split(":");
    const key = (await derive(password, salt, 64));
    const expected = Buffer.from(hash, "hex");
    return expected.length === key.length && (0, node_crypto_1.timingSafeEqual)(expected, key);
}
