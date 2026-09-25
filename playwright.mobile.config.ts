import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: "mobile-layout.spec.ts",
  timeout: 30_000,
  workers: 2,
  use: {
    baseURL: process.env.LAYOUT_BASE_URL || "http://127.0.0.1:4173",
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chrome",
      use: {
        browserName: "chromium",
        channel: process.env.CI ? undefined : "chrome",
      },
    },
    { name: "webkit", use: { ...devices["iPhone 13"], browserName: "webkit" } },
  ],
  webServer: process.env.LAYOUT_BASE_URL
    ? undefined
    : {
        command:
          "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4173 --strictPort",
        cwd: "frontend",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: false,
      },
});
