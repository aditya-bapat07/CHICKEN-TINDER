import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  timeout: 120_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    channel: "chrome",
    headless: true,
    actionTimeout: 12_000,
    viewport: { width: 1440, height: 1000 },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node dist/server.js",
    url: "http://127.0.0.1:3100/health",
    reuseExistingServer: false,
    env: { PORT: "3100", NODE_ENV: "test" },
  },
});
