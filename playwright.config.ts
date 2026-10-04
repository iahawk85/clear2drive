import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  timeout: 60000,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:4173",
    timezoneId: "Australia/Sydney",
    trace: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run preview -- --port 4173",
        url: "http://localhost:4173",
        reuseExistingServer: !process.env.CI,
      },
  projects: [
    {
      name: "desktop",
      testIgnore: "**/webkit-offline.spec.ts",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "iphone",
      testIgnore: "**/webkit-offline.spec.ts",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
    {
      name: "android",
      testIgnore: "**/webkit-offline.spec.ts",
      use: { ...devices["Pixel 7"] },
    },
    { name: "webkit-iphone", use: { ...devices["iPhone 13"] } },
  ],
});
