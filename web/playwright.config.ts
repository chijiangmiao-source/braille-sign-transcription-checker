import { defineConfig } from "@playwright/test";

const port = process.env.WEB_PORT ?? "8080";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${port}`,
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
