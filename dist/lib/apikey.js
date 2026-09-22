"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateApiKey = generateApiKey;
exports.hashApiKey = hashApiKey;
const node_crypto_1 = __importDefault(require("node:crypto"));
function generateApiKey(prefix = "ct_live_") {
    const randomBytes = node_crypto_1.default.randomBytes(24).toString("hex");
    const rawKey = `${prefix}${randomBytes}`;
    const keyHash = hashApiKey(rawKey);
    return { rawKey, keyHash };
}
function hashApiKey(key) {
    return node_crypto_1.default.createHash("sha256").update(key).digest("hex");
}
