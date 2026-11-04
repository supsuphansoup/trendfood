import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
export const FAKE_SUPABASE = "http://127.0.0.1:54321";

// CLAUDE.md 검증 규칙: 모바일 390px · PC 1280px 스크린샷 + axe 검사
// 실제 배포와 같은 정적 결과물(out/)을 띄워서 검사한다.
export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "ko-KR",
  },
  projects: [
    { name: "mobile", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: `npm run build && npx serve@14.2.6 out -l ${PORT} --no-port-switching`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    // 공개 화면은 예시 데이터로, 관리자 화면은 테스트가 흉내 낸 가짜 Supabase(이 주소)로 동작한다
    env: {
      TF_SEED_ONLY: "1",
      NEXT_PUBLIC_SUPABASE_URL: FAKE_SUPABASE,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    },
  },
});
