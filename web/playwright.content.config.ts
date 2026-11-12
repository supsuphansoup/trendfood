import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./content-e2e",
  outputDir: "./test-results/content",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://localhost:3101", locale: "ko-KR" },
  projects: [
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: "npm run content:build && npx serve@14.2.6 out -l 3101 --no-port-switching",
    url: "http://localhost:3101",
    reuseExistingServer: false,
    timeout: 240_000,
    env: { TF_SEED_ONLY: "0", TF_CONTENT_ONLY: "1" },
  },
});
