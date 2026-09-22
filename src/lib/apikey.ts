import crypto from "node:crypto";

export function generateApiKey(prefix = "ct_live_"): {
  rawKey: string;
  keyHash: string;
} {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const rawKey = `${prefix}${randomBytes}`;
  const keyHash = hashApiKey(rawKey);
  return { rawKey, keyHash };
}

export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}
