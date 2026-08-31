import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./artifacts/openkingdoms/tests",
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  reporter: "line",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "BASE_PATH=/ PORT=4173 pnpm --filter @workspace/openkingdoms run dev",
    url: "http://127.0.0.1:4173/",
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    {
      name: "desktop",
      use: {
        viewport: { width: 1280, height: 900 },
      },
    },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        hasTouch: true,
        isMobile: true,
      },
    },
  ],
});
