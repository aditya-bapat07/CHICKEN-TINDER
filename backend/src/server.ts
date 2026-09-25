import { buildApp } from "./app.js";
import { db } from "./lib/db.js";

export { buildApp } from "./app.js";

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
