답변·문서·커밋 메시지는 한국어.

# 트렌드푸드 (TrendFood) — 작업 인수인계

> 마지막 갱신: 2026-11-05 밤 (계정 연결 완료: Supabase·Cloudflare·Secrets, `ONBOARDING.md` 0장에 현재 상태·확인받을 것·남은 것). 새 세션은 이 파일을 먼저 읽고 시작한다.

누가 구현하든(사람·Claude·Codex) `AGENTS.md` 의 규칙과 검사 4개를 따른다.

## 서비스 한 줄 요약
지금 유행하는 음식을 가장 빨리 알려주고(주목적), 필요한 재료를 쿠팡에서 "다음 재료 연속 담기"로 담게 돕는 한국 모바일 우선 웹 서비스. 수익은 **쿠팡 파트너스 커미션 + 구글 애드센스**.

## 현재 상태
- **기획 v2.1 완료, 디자인 확정(포토 피드형), `docs/design.md`·테마 토큰, MVP 화면 + 관리자 화면 + 자동 수집 파이프라인 코드 완료.** **계정 연결 완료(2026-11-05, 팀장 개인 계정):** Supabase 프로젝트 `trendfood`(ref `axhhdqrajhsambxulbhi`, 서울, 예시 음식 10개, 가입 막음, 운영자 `trendfood2026@gmail.com`, Edge Function `request-publish` + `GITHUB_TOKEN`(만료 없음)·`GITHUB_REPO`), Cloudflare Pages `trendfood`(https://trendfood.pages.dev), GitHub Secrets(Supabase·Cloudflare). **수집 키(YouTube·네이버·AI)는 아직 없음** → 매일 06:00 수집이 예시 후보를 `candidates` 에 넣는다. 교수님·팀 확인 대기 항목은 `ONBOARDING.md` 0장.
- MVP 범위: 메인(1위 히어로·카테고리 탭·2~10위 카드·정렬/태그·검색(지우기 버튼)·찜 필터·인피드 광고 자리·맨 위로, 필터 상태는 주소 `?cat=&sort=&tag=&q=`에 남아 뒤로가기·공유 가능), 상세(`/food/[slug]`: AI 요약·14일 그래프·영상 자리·재료 연속 담기·집에 있어요 기억·목록 복사/공유·단계 타이머·모바일 하단 바), `/about`, 404. 찜·집에 있어요는 localStorage.
- **구조 (2026-11-05 사용자 결정, 무료 운영):** Next.js `output: "export"` 정적 사이트 → **Cloudflare Pages**. 데이터·로그인은 **Supabase**(RLS). 자동화는 **GitHub Actions**: `.github/workflows/pipeline.yml`(매일 06:00 KST 수집 → `candidates` 대기), `deploy.yml`(main push · 관리자 [사이트에 반영] = Supabase Edge Function `request-publish` → `repository_dispatch: publish` · 수동). 빌드 때 `published_foods` 뷰를 읽어 HTML 생성, 게시 음식 0개면 빌드 중단.
- **관리자 `/admin`** (정적 클라이언트 화면. 공개 화면에 링크 없음, `noindex` 메타 + `public/_headers` 의 `X-Robots-Tag`): Supabase Auth 이메일 로그인, `admins` 표에 있는 사람만 데이터 접근(RLS). 탭: 게시 관리(순서·숨기기·게시/초안·글 고치기), 재료 링크(쿠팡 주소만·참고 가격), 후보 큐(직접 추가·승인 시 AI 초안 → `foods` 초안 행·반려). 가입은 Supabase 대시보드에서 꺼 둔다.
- DB: `web/supabase/migrations/0001_init.sql`(PGlite 로 RLS 검증 완료 2026-11-05), 예시 데이터 `web/supabase/seed.sql`(= `npm run db:seed-sql`, 원본 `web/src/data/seed-foods.ts`). 행↔화면 변환 `src/data/db-mapping.ts`, 후보 규칙 `src/data/candidates.ts`. `src/data/` 는 Node 로 바로 실행되므로 `.ts` 확장자 import 를 쓴다.
- 사진: `web/src/lib/foods.ts` 의 키→import 목록(빌드에 포함). DB 의 `image` 는 키 이름. 쿠팡 링크는 파트너스 승인 전이라 **링크 없으면 쿠팡 검색 링크로 대체**. 사진은 `web/src/assets/demo/` 데모 — **배포 전 교체 필수**.
- 수집: `web/scripts/pipeline/`(YouTube search → LLM 음식명 추출 → 네이버 데이터랩 배수 → 상위 3개 AI 초안). LLM 은 `AI_PROVIDER`(openai|gemini)·`AI_MODEL` 환경변수로 교체(이번 달 OpenAI 크레딧, 그 뒤 Gemini 무료), 429 는 "크레딧·한도 소진"으로 `pipeline_runs` 에 기록. 데이터랩 주소는 `NAVER_DATALAB_URL` 로 변경 가능(API HUB 이전 대비, 미확인).
- 목표는 MVP가 아니라 **완성본**: `docs/spec.md` 전체 기능을 만들고 `docs/plan.md` 에 따라 보완한다. 단, 익명 후기·평점은 Phase 2(사용자 확보 후).
- 원격 저장소: https://github.com/supsuphansoup/trendfood (origin). `main` 보호 규칙은 걸지 않는다(2026-11-05 결정). 팀 약속: `main` 에 직접 push 하지 않고 PR 로 올리며, `ci` 검사가 초록일 때만 합친다.
- `.playwright-mcp/`(Playwright MCP 스크린샷·로그)는 커밋하지 않는다 (루트 `.gitignore`).

## 팀장 PC 전용 (Orca 감독 모드)
이 섹션은 Orca 가 설치된 팀장 PC(작업 폴더 `C:\Users\khs62\Desktop\코딩\ai어드벤쳐`)에서만 적용한다. 그 밖의 PC·팀원 세션에서는 무시하고, 아래 일반 규칙대로 직접 구현·검증한다.

- **작업 폴더: `C:\Users\khs62\Desktop\코딩\ai어드벤쳐` (브랜치 `main`). 수정은 항상 여기에 저장한다** (2026-11-05 사용자 지시). Orca 작업 폴더(`orca\workspaces\…`)는 쓰지 않는다.
- **구현은 Orca Codex 작업자**(`gpt-6.1-sol`, effort `high`)가 한다. **Claude Code 는 감독**: 작업을 나눠 지시하고, 결과를 검사하고, 사용자에게 보고·결정 요청만 한다. Claude 가 직접 코드를 고치지 않는다 (작업자 결과 검증용 명령 실행, 문서·`CLAUDE.md` 갱신은 예외).
- **알려진 문제 (2026-11-05):** Orca 1.4.248 + Codex CLI 0.160.0 에서 Codex 작업자가 `agent_readiness: timeout`(`session_not_reported`)으로 자주 시작 실패한다(Claude 작업자는 정상). 실패하면 바로 재시도하지 말고, 사용자 승인을 받아 Claude 작업자 또는 Claude 직접 구현으로 대신한다.
- 작업자 시작: `orca orchestration worker-start --worktree "path:C:/Users/khs62/Desktop/코딩/ai어드벤쳐" --agent codex --model gpt-6.1-sol --effort high --task-title "<제목>" --spec-file <지시서>` → 턴 종료, Orca 가 깨우면 처리. 폴링 금지. 안내서는 `orca skills get orchestration`.
- 작업자는 `AGENTS.md` 만 자동으로 읽는다. 규칙을 바꾸면 **`AGENTS.md` 도 같이** 고친다.
- **지시서(spec) 틀** — 매번 이 항목을 채워 자기완결로 쓴다:
  1. 목표 (`docs/spec.md` R 번호 / `docs/plan.md` 단계)
  2. 바꿀 것과 완료 조건 (화면 문구·수치는 직접 적는다)
  3. 수정 허용 파일·폴더 (그 밖은 금지) / 커밋 허용 여부 (기본: 커밋 금지)
  4. 지켜야 할 규칙 (AGENTS.md 외에 이번 작업에 특히 중요한 것)
  5. 완료 증거: `npm run lint && npm run typecheck && npm run test:unit && npm run test:e2e` 출력, 추가한 테스트, 스크린샷 파일명. 검사 하나라도 실패면 Task 실패.
  6. 결정이 필요하면 `ask` 로 묻고 멈출 것
- **검사(Claude)**: 작업자 보고를 받으면 `git diff --stat` 로 범위 확인 → 검사 4개를 직접 다시 실행(작업자 출력과 다르면 되돌려 보냄) → 화면 변경은 `web/test-results/` 스크린샷 확인 → 사용자에게 보고. 커밋은 사용자 승인 후.

## 문서 지도
| 파일 | 용도 |
| :--- | :--- |
| `docs/intent.md` | **기준 문서**: 무엇·왜, 대상·제약·성공 지표·미결정 사항 |
| `docs/spec.md` | **기준 문서**: 기능·수치·데이터·수집·수익화·사진·준수 사항·우려 사항 |
| `docs/plan.md` | **기준 문서**: 남은 작업·순서·위험·완료 증거 |
| `docs/design.md` | **기준 문서**: 색·글자 크기·간격·모서리·사진·컴포넌트(shadcn 매핑)·접근성. 실제 화면(`web/`)과 함께 시각 기준 |
| `web/` | Next.js 16.4.5 앱 (App Router, TS, `src/`, 정적 내보내기 `out/`) |
| `ONBOARDING.md` | **팀원 안내서 (프로젝트 내용만)**: 오늘 할 일·0장 지금 상태(확인받을 것·남은 것)·서비스 구조·진행 상황 보는 곳·시연·운영자 루틴·최초 설정(4장)·AI 바꾸기·파일 지도. 설치·Git 사용법은 넣지 않는다(지도학생 도움) |
| `AGENTS.md` | **Codex 작업자용 규칙 (자기완결)**: 작업자 수칙·Commands·Conventions·Architecture·Verifying·Things the agent gets wrong. **같은 실수가 두 번 나오면 마지막 섹션에 한 줄 추가** |
| `docs/worklog/` | **팀원 작업 기록**: 작업마다 `YYYY-MM-DD-이름-주제.md` 한 파일(규칙 `AGENTS.md`, 틀 `docs/worklog/README.md`). 팀원 진행 확인은 여기와 `git log` 로 |
| `README.md` | 저장소 첫 화면용 문서 안내 |
| `.github/workflows/` | `deploy.yml`(배포), `pipeline.yml`(매일 수집), `ci.yml`(PR 검사) |
| `web/src/app/theme.css` | tweakcn/shadcn v4 형식 테마 토큰 — **유일한 원본**, `globals.css`가 불러옴 |
| `archive/design-mockups/` | 예전 포토 피드형 시안: `home.html`, `detail.html`, `home-mobile.html`, `detail-mobile.html`. `alternatives/`는 탈락안, 현재 시각 기준 아님 |
| `archive/design-mockups/img/` | 시안용 데모 사진 (Wikimedia Commons, 라이선스는 `credits.json`). **실서비스 사용 금지** |
| `reports/` | 조사 보고서 3개 (데이터 연동 구성안: API 한도·쿠팡 정책·법률·비용 근거 / 전략 대안 비교 / UI 도구 비교). 결론은 `docs/` 에 반영됨, 근거 확인용 |

큰 기능은 intent → spec(Areas of concern 먼저 사람 결정) → plan → 코드 순서. spec 의 ✅/🟡/⬜ 와 plan 의 ☐ 로 진행 상황을 표시하며 시각 규칙은 `docs/design.md` 를 따른다.

팀 공유용 디자인 캔버스(claude.ai, 링크 공유 중): https://claude.ai/artifact/VEbKGqcBKPaeD7aZsSPCay — `archive/design-mockups/`와 같은 예전 시안 + 탈락안, 현재 시각 기준 아님.

## 확정된 결정
- **디자인: 포토 피드형** (2026-11-04 팀 선택).
  - 메인: 화면 가득 찬 1위 사진 히어로(헤더가 사진 위에 겹침) → 상단 가로 칩 필터 → **2위부터 한 줄에 하나씩** 큰 사진 카드(PC 사진 좌·글 우, 모바일 사진 위) → 4위 다음 인피드 광고 1개 → 11위부터 더 보기.
  - 상세: 사진 히어로 → 왜 뜨는지(AI 요약 + 14일 검색량 그래프) | 원본 영상 임베드 → 2컬럼(좌 재료 장바구니 / 우 편의점 버전·조리법·광고). 모바일은 하단 고정 '다음 재료 담기' 바.
  - **카테고리 탭 (2026-11-04 사용자 결정으로 변경):** PC는 왼쪽 고정 카테고리 탭(전체·디저트·밥·면·분식·간식·찜, 개수 표시), 모바일은 상단 가로 탭. 정렬·태그 칩은 목록 위. 사이드바 **광고**는 여전히 없음.
  - 시안 색: 진한 갈색 `#2A1D16`(글자·주 버튼), 토마토 빨강 `#B3301B`(순위 숫자·주요 CTA), 연한 베이지 `#F6EEE8`/`#FBF6F2`(칩·박스), 테두리 `#EEE3DB`. 시안 글꼴은 Noto Sans KR(900 굵은 제목)이지만 실서비스는 Pretendard.
- **익명 후기·평점: Phase 2로 연기.** 평점 표시·평점순 정렬도 제외. 좋아요(찜) 수는 유지.
- **트렌드 수집**: 공식 API만 (네이버 API HUB + 검색광고 API + YouTube Data API). SNS·커뮤니티 크롤링, 영상 자막 추출 금지. 시작은 `docs/spec.md` 수집 규칙의 쉬운 버전(운영자 시드 + YouTube 인기 영상 제목 → LLM 음식명 추출 → DataLab 급상승 배수 → 승인 큐, GitHub Actions 하루 1회).
- **Instagram/TikTok**: 임베드 전용. Instagram 해시태그 검색은 Phase 2에 Meta 앱 심사 후 보조 신호로만 검토. 게시물 사진 저장 금지.
- **음식 사진**: 자체 촬영 / AI 생성("AI 이미지" 표시) 우선, 무료 사진(Unsplash·Pexels·Pixabay·공유마당 공공누리 1유형·Wikimedia CC0)은 보조. 관리자 화면에서 후보 사진 중 운영자가 고른다. 조건은 `docs/spec.md` Design의 사진 절.
- **게시**: LLM 초안(제목·설명란·태그만 입력) → **운영자 승인 후 게시**, "AI 요약" 표시.
- **장바구니**: 사용자 탭 1회 = 쿠팡 상품 1개 ("다음 재료 연속 담기"). 다중 탭 자동 오픈·장바구니 번들 전송·쇼핑몰 최저가 비교는 **하지 않는다**.
- **쿠팡**: API는 누적 판매 15만원 + 승인 후. 그전에는 운영자가 링크 수동 등록.
- **애드센스**: 직접 검수한 글 20~30개 후 신청. 장바구니 CTA·체크리스트 주변에 광고 금지.
- **호스팅**: Cloudflare Pages(무료, 정적) + Supabase Free + GitHub Actions (2026-11-05, 무료 운영 목표로 Vercel Pro 계획 대체). 주의: Supabase Free 는 1주 무활동 시 정지(매일 수집이 막아 줌), 공개 저장소 Actions 예약은 60일 무커밋 시 정지.

## UI 개발 규칙
- 스택: Next.js (App Router, TS) + Tailwind v4 + shadcn/ui (CLI v4, Base UI 기본). 다른 UI 라이브러리(Mantine, Chakra, HeroUI 등)를 섞지 않는다.
- 배치·기능은 `docs/spec.md`, 시각 기준은 실제 화면(`web/`) + `docs/design.md`. 예전 시안은 `archive/design-mockups/` 에 보관하며 HTML 코드는 재사용하지 않는다.
- 디자인 토큰 원본은 `web/src/app/theme.css`. `docs/design.md` 와 함께 따른다. 입력칸 테두리는 대비 때문에 시안 `#D9C9BD` 대신 `#9C8576`.
- 한글: Pretendard(dynamic subset), `word-break: keep-all`, 제목 `text-wrap: balance`. 시안·구현 모두 실제 한국어 문구 사용.
- 이미지: 플랫폼 썸네일 저장·재사용 금지. AI 생성 이미지는 "AI 이미지" 표시.
- 검증: 화면 작업 후 Playwright로 모바일(390px)·PC 스크린샷 확인, axe 접근성 검사.
  - 이 PC의 Playwright MCP 브라우저는 배율이 0.5로 잡혀 있다. 실제 390px을 보려면 `setViewportSize({width:195})`, 1280px은 `640`으로 설정한다 (`innerWidth`로 확인).
  - Playwright MCP는 `file://`를 막는다. 로컬 HTML은 `python -m http.server`로 띄워서 연다. 스크린샷 저장 경로는 저장소 안(`.playwright-mcp/`)만 허용된다.
- 보안: MCP·스킬·shadcn 서드파티 레지스트리는 공식 출처 위주, 버전 고정, 서드파티 항목은 `shadcn add --dry-run`으로 먼저 확인.

## 개발 도구 (이 프로젝트 전용)
- `.mcp.json`: `shadcn@4.23.0 mcp`, `@playwright/mcp@0.0.84` (Windows용 `cmd /c npx`). 새 세션 시작 시 승인 필요. 두 서버 모두 연결·동작 확인 완료(2026-11-04).
- `web/` 명령: `npm run dev` · `lint` · `typecheck` · `test:unit`(node --test, 수집 계산·초안 변환) · `test:e2e`(빌드 후 `serve out` 3100 포트, 390px·1280px + axe. `TF_SEED_ONLY=1` 로 예시 데이터 빌드, 관리자 테스트는 `page.route` 가짜 Supabase `127.0.0.1:54321`) · `pipeline [-- --dry-run]` · `db:seed-sql` · `start`(= serve out).
- Next 16 주의: 정적 내보내기라 Proxy·Server Actions·cookies·`headers()`·ISR·이미지 최적화를 못 쓴다(`images.unoptimized`). 상세는 `dynamicParams = false` + `generateStaticParams`, 404 는 `out/404.html`. 화면 이동 후 이전 페이지가 숨겨진 채 DOM에 남으므로 테스트는 `getByRole`(보이는 것만)로 찾는다.
- shadcn: `npx shadcn@4.23.0` 고정, `--base base`(Base UI; `base-ui`는 잘못된 값). `init`/`add`가 `globals.css`에 `:root`·`@theme`를 다시 넣으면 지운다.
- 설치된 스킬 활용: `frontend-design`, `vercel:shadcn`, `vercel:nextjs`.

## 다음 할 일 (순서)
1. 2026-11-05 팀·교수님 검토 반영 (수업, 팀장 불참·팀원이 진행 — `ONBOARDING.md` 맨 위·0장).
2. 계정·키 만들기(`ONBOARDING.md` 4장): Supabase·Cloudflare·Secrets·Edge Function **완료(2026-11-05)**. 남음: 수집 키 3종·`AI_PROVIDER`/`AI_MODEL`, pipeline 수동 실행 확인. 실제 Supabase 로 빌드는 GitHub Actions 에서 확인(deploy `985c6bb`), 관리자 로그인·[사이트에 반영]→`repository_dispatch` 생성도 실제로 확인(2026-11-05). Cloudflare 업로드 성공, https://trendfood.pages.dev 응답 200.
3. 남은 로드맵(`docs/plan.md` 2단계부터): 관리자 편집 보강(사진·조리법·재료) → 영상 임베드 → 삭제 요청 창구 → YouTube 약관 대응 → 분석 → 실데이터 → 오픈 → Phase 2(후기·평점).
4. 병행: 도메인 구입(Cloudflare 에 연결), 쿠팡 파트너스 가입, 네이버 데이터랩·YouTube API 키 발급.

## 팀 결정 대기·미확인 항목
목록 원본은 `docs/spec.md` 의 **Open questions**(팀 결정: 아이콘 세트·칩 높이·Gemini 무료 등급·사진 출처·참고 가격·사업자 신고)와 **Areas of concern** 9~11(쿠팡 API 한도·수수료율, 네이버 API HUB, AI 기본법, 무료 LLM·이미지 약관, Instagram 심사). 여기에 따로 적지 않는다.
