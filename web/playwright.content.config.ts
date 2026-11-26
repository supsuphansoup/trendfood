import { defineConfig, devices } from "@playwright/test";
import { adminApi } from "./content-e2e/admin-api";

const testAdmin = process.env.TF_CONTENT_ADMIN_E2E === "1";

export default defineConfig({
  testDir: "./content-e2e",
  testMatch: testAdmin ? "admin-content.spec.ts" : "content.spec.ts",
  outputDir: testAdmin ? "./test-results/content-admin" : "./test-results/content",
  fullyParallel: true,
  reporter: "list",
  use: { baseURL: "http://localhost:3101", locale: "ko-KR", screenshot: "only-on-failure" },
  projects: [
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: [
    ...(testAdmin ? [{ command: "node content-e2e/admin-api.ts --serve", url: adminApi, reuseExistingServer: false }] : []),
    {
    // serve 14.2.6은 ETag가 일치해 304를 반환할 때 이미 연 파일 스트림을 닫지 않는다.
    command: "npm run content:build && npx serve@14.2.6 out -l 3101 --no-port-switching --no-etag",
    url: "http://localhost:3101",
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      TF_SEED_ONLY: "0", TF_CONTENT_ONLY: "1", TF_CONTENT_ADMIN: testAdmin ? "1" : "0",
      ...(testAdmin ? { NEXT_PUBLIC_SUPABASE_URL: adminApi, NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key" } : {}),
    },
  }],
});
