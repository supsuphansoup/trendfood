import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./content-e2e",
  outputDir: "./test-results/content",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://localhost:3101", locale: "ko-KR", screenshot: "only-on-failure" },
  projects: [
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    // serve 14.2.6은 ETag가 일치해 304를 반환할 때 이미 연 파일 스트림을 닫지 않는다.
    command: "npm run content:build && npx serve@14.2.6 out -l 3101 --no-port-switching --no-etag",
    url: "http://localhost:3101",
    reuseExistingServer: false,
    timeout: 240_000,
    env: { TF_SEED_ONLY: "0", TF_CONTENT_ONLY: "1" },
  },
});
