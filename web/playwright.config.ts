import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

// CLAUDE.md 검증 규칙: 모바일 390px · PC 1280px 스크린샷 + axe 검사
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
    { name: "mobile", testIgnore: /admin/, use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } } },
    { name: "desktop", testIgnore: /admin/, use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    // 관리자 테스트는 공개 데이터를 바꾸므로 공개 화면 테스트가 끝난 뒤 혼자 돈다
    {
      name: "admin",
      testMatch: /admin/,
      dependencies: ["mobile", "desktop"],
      fullyParallel: false,
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    // 테스트 저장소를 빌드 전에 비운다 (빌드가 저장소 내용으로 페이지를 미리 만들기 때문)
    command: `node -e "require('fs').rmSync('.e2e-data',{recursive:true,force:true})" && npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    // 테스트는 별도 저장 폴더·비밀번호를 쓴다 (실제 web/data 를 건드리지 않음)
    env: {
      TF_DATA_DIR: "./.e2e-data",
      ADMIN_PASSWORD: "test-admin-password",
      ADMIN_SECRET: "test-secret-0123456789abcdef0123456789abcdef",
    },
  },
});
