import { spawn } from "node:child_process";
const apiPort = process.env.PORT || process.env.API_PORT || "3000";
const childEnv = { ...process.env, API_PORT: apiPort };
const processes = [
  spawn(process.execPath, ["--import", "tsx", "--watch", "backend/src/server.ts"], {
    env: childEnv,
    stdio: "inherit",
  }),
  spawn(
    process.execPath,
    [
      process.cwd() + "/frontend/node_modules/vite/bin/vite.js",
      "--host",
      "127.0.0.1",
    ],
    { cwd: process.cwd() + "/frontend", env: childEnv, stdio: "inherit" },
  ),
];
// Vite's script path is absolute because its working directory is the frontend.
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  processes.forEach((p) => p.kill("SIGTERM"));
  process.exitCode = code;
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
for (const child of processes) {
  child.on("error", (e) => {
    console.error(e.message);
    stop(1);
  });
  child.on("exit", (code) => stop(code || 0));
}
