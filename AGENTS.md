# AGENTS.md — 트렌드푸드 (GPT/Codex 작업자용)

이 파일은 이 저장소에서 일하는 모든 AI 작업자(Codex·Cursor 등)의 규칙이다. 팀장 PC 에서는 Claude Code 가 감독하고 Codex 작업자가 구현하며, 팀원 PC 에서는 팀원이 자기 AI 도구로 직접 구현한다.
이 파일은 Codex 가 매번 자동으로 읽는 유일한 규칙 파일이라 **혼자서도 충분하게** 쓴다. 더 자세한 배경은 `CLAUDE.md`(결정·진행 상황), 기준 문서 `docs/intent.md` → `docs/spec.md` → `docs/plan.md` + `docs/design.md`.
답변·커밋 메시지·코드 주석·문서는 **한국어**. 작업 폴더는 이 저장소를 clone 한 폴더. PR 없이 최신 `main` 에서 작업해 바로 push 한다: push 전 `git pull --rebase`, 검사 4개 통과(팀장 PC 의 Orca 작업자는 지시서가 정한 폴더·브랜치를 따른다).

지시서 없이 사람이 직접 시킬 때는 요청한 것만 고치고, 결정이 필요하면 사람에게 묻고, 끝나면 검사 4개 출력을 보여 준다.

## 작업 기록 남기기 (필수)
코드·문서·설정을 바꾸는 작업을 끝낼 때마다 **`docs/worklog/` 에 파일을 하나 새로 만든다** (팀장이 팀원 작업을 확인하는 곳). 틀과 규칙은 `docs/worklog/README.md`.
- 파일 이름 `YYYY-MM-DD-이름-주제.md`, 내용: 한 것 · 바뀐 파일 · 검사 4개 결과 · 임의로 정한 것·확인받을 것·남은 것. 작업과 **같은 커밋** 에 넣는다.
- 남의 기록 파일은 고치지 않는다. 같은 작업을 이어서 하면 자기 파일에 `## 이어서 (날짜)` 를 덧붙인다.
- 질문에 답만 하고 파일을 바꾸지 않았으면 기록하지 않는다. 비밀값·비밀번호는 기록에 쓰지 않는다.

## Orca 작업 지시를 받았을 때
1. 작업 지시서(spec)에 적힌 **목표·수정 허용 범위·완료 증거**만 따른다. 범위 밖 파일, 이름 바꾸기, 리팩터링, 포매팅 일괄 변경 금지. 범위가 부족하면 고치기 전에 `ask` 로 묻는다.
2. 시작 전에 관련 문서(`docs/spec.md` 해당 R 번호, `docs/plan.md` 해당 단계)와 고칠 파일의 해당 부분만 읽는다. 추측으로 API 를 쓰지 말고 설치된 버전의 문서(`web/node_modules/next/dist/docs/` 등)를 확인한다.
3. 지시서에 없는 결정(수치·문구·디자인·새 패키지·DB 구조)이 필요하면 **멈추고 `ask`**. 임의로 정했으면 보고에 "임의 결정" 으로 적는다.
4. **커밋·push·브랜치 생성·`git stash`·`reset`·파일 삭제는 지시서가 허락할 때만.** 다른 사람의 미커밋 변경은 건드리지 않는다.
5. 끝나면 `worker_done` 으로 보고: ① 바꾼 파일 목록 ② 아래 검사 명령과 **실제 출력 끝부분** ③ 새로 추가한 테스트 ④ 임의 결정·남은 문제. 실패한 검사를 숨기거나 "아마 될 것"이라고 쓰지 않는다.

## Commands
2026-11-13 팀장이 실사 우선 방식을 승인했다. `photos:auto`는 준비 중 사진과 음식 주소가 일치하는 등록된 생성 예시를 기본 하루 5개씩 순환 검색한다. 라이선스·실제 이미지·레시피·구도 검사를 통과한 실사만 적용하고, 실패하면 기존 생성 예시와 안내를 보존한다. 기존 실사·업로드 사진·제외 이력은 보존하며 실사 교체 후에도 생성 파일·프롬프트 기록은 지우지 않는다. 실제 교체와 생성 유지 여부는 실행 보고서로 확인한다. 검색 개수·판별 한도·예약 시각은 늘리지 않는다.
2026-11-13 팀장이 텍스트 카드 대신 실사 또는 생성형 음식 이미지를 요청해 기존 AI 생성 사진 금지를 변경했다. 실사 4장은 보존하고 사진이 없던 26개는 음식별로 만든 `AI 생성 예시`를 연결한다. 생성 이미지는 `web/src/data/content/generated-images.json`에 도구·날짜·프롬프트·안내를 기록하고 `src/assets/generated/`·`src/lib/generated-photos.ts`로 별도 보존한다. 카드·상세·대체 설명에서 생성 사실을 표시하며 실제 판매 제품·직접 조리 사진으로 표시하거나 작가·CC 라이선스를 꾸미지 않는다. 실사 자동 검색의 라이선스 검사와 제외 이력은 유지한다. 대화의 생성 도구는 예약 작업과 연결되지 않으므로 예약 생성이 완료됐다고 보고하지 않는다.
2026-11-13 팀장이 사진 검색처 확대와 사진 없는 음식의 텍스트 카드 표시를 승인했다. `docs/automation.md`에 따라 Commons 외에 Openverse(Flickr·기존 CC/퍼블릭 도메인 조건 유지)·Pexels 공식 API를 사용한다. Pexels는 별도 Pexels License·출처/작가 링크를 보존하며 `PEXELS_API_KEY`가 없으면 호출하지 않는다. 부적합 사진을 다시 쓰지 않고, 사진 없는 항목은 내부 `pending`을 유지하되 공개 화면의 빈 사진 영역과 '사진 준비 중' 문구를 없앤다. 게시를 사진 확보까지 지연하지는 않는다.
2026-11-12 팀장이 새 트렌드 음식의 자동 진행을 요청했다. `PIPELINE_AUTO_PUBLISH=true`에서는 `docs/automation.md`의 원문 대조·신호·전체 검사 조건을 통과한 새 레시피만 개별 승인 없이 반영한다. 기존 "AI 글 승인 후 게시" 규칙은 그 밖의 AI 초안에 적용한다. 새 자동 글에는 개별 운영자 미검수 표시가 필수다. 공개 JSON 모드(`TF_CONTENT_ONLY=1`)의 글은 JSON 또는 `content:import`로 수정한다.
같은 날 팀장이 사진 검색·적용 자동화도 요청했다. Commons 공식 API의 CC0·퍼블릭 도메인·CC BY 4.0·CC BY-SA 4.0 사진만 이용 조건과 실제 이미지·메뉴 일치를 자동 대조한 뒤 적용한다. 원작자·출처·라이선스 링크·변환 내역을 표시하고 CC BY-SA 변환본은 같은 라이선스로 제공한다. 기존 사진은 보존하고 확인되지 않는 사진은 준비 중으로 둔다. 사진 등록부·실제 파일·번들 목록·콘텐츠를 함께 검사·저장한다.
같은 날 팀장이 쿠팡 링크 생성·연결 자동화도 요청했다. `docs/coupang-automation.md`에 따라 파트너스 API 키·등록 채널을 연결한 뒤 실제 검색 상품의 제휴 URL만 재료에 저장한다. 기존 수동 링크는 보존하고 불일치·실패·미설정이면 일반 검색 연결을 유지한다. 가격·사진을 저장하거나 URL의 제휴 추적 값을 임의로 만들지 않는다. API 키가 없으면 실제 발급까지 완료했다고 보고하지 않는다.
같은 날 팀장이 승인 전 일반 상품 상세페이지 자동 연결도 요청했다. `PIPELINE_AUTO_PRODUCT_LINKS=true`에서는 OpenAI 공식 웹 검색 API의 색인 전용 모드로 쿠팡 상품 출처·인용 제목을 확인하고 재료 대조를 통과한 일반 상품 주소만 저장한다. 쿠팡 페이지 직접 수집·AI 생성 주소는 금지한다. 파트너스 키가 필요하지 않으며 제휴 수익은 없다. 파트너스 자동화를 켜면 일반 상품 검색 단계는 건너뛴다.

`web/` 에서 실행 (Node 24, Windows · Git Bash/PowerShell):
- `npm ci` 설치 · `npm run dev` 개발 서버 3000 · `npm run build` 정적 빌드 → `out/` · `npm start` 빌드 결과 보기
- `npm run lint` · `npm run typecheck` · `npm run test:unit` (node --test) · `npm run test:e2e` (빌드 후 3100 포트, 모바일 390px·PC 1280px + axe, 관리자는 가짜 Supabase)
- `npm run pipeline -- --dry-run` 수집 시험(키 없이) · `npm run db:seed-sql` (`src/data/seed-foods.ts` → `supabase/seed.sql`)

## Conventions
- **스택 고정**: Next.js 16.4.5 App Router + TS, `output: "export"` 정적 사이트. Tailwind v4 + shadcn/ui(`npx shadcn@4.23.0 add <이름>`, 설정 `--base base`) + `lucide-react` + Pretendard. 다른 UI 라이브러리 금지. 새 npm 패키지는 지시서에 없으면 추가 금지(추가 시 정확한 버전 고정).
- **정적 사이트라 못 쓰는 것**: Proxy/middleware, Server Actions, Route Handlers, `cookies()`·`headers()`, ISR/revalidate, `next/image` 최적화(`images.unoptimized`). 새 상세 주소는 `generateStaticParams`, `dynamicParams = false`.
- **디자인**: 기준 `docs/design.md` + 실제 화면(`web/`). 색·글자·모서리는 `web/src/app/theme.css` 토큰만(파일에 hex 직접 쓰기 금지). 버튼·입력 최소 44px(`h-11`). 한국어 `word-break: keep-all`, 실제 한국어 문구 사용.
- **데이터**: 형식 `src/data/catalog-schema.ts`, 변환 `src/data/db-mapping.ts`, 후보 규칙 `src/data/candidates.ts`. `src/data/`·`scripts/` 의 상대 import 는 `.ts` 확장자를 붙인다(Node 가 바로 실행). DB 변경은 `web/supabase/migrations/` 에 **새 번호 파일**(0002, 0003…)로만, RLS 정책 포함.
- **비밀값**: 코드·로그·테스트·문서에 키를 쓰지 않는다. `.env.local` 커밋 금지. `service_role` 키는 수집 스크립트(GitHub Actions)에서만.
- **서비스 규칙(위반 금지)**: 공식 API만(SNS·커뮤니티 크롤링, 영상 자막 추출, 쿠팡 스크래핑 금지) · 쿠팡은 사용자 탭 1회 = 상품 1개(자동·다중 탭, 장바구니 일괄 전송, 최저가 비교 금지) · 대가성 문구 "쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다." 유지 · 장바구니 버튼·재료 체크리스트 주변 광고 금지 · AI 글은 운영자 승인 후 게시 + "AI 요약" 표시 · 플랫폼 썸네일·게시물 사진 저장 금지, 생성 이미지는 위 2026-11-13 변경에 따라 예시 표시 필수(실사 사진은 출처·라이선스 필수) · 후기·평점은 Phase 2(만들지 않음).

## Architecture
- `web/src/app/` 화면: `/`(home-feed), `/food/[slug]`, `/about`, `/privacy`, `/terms`, `/admin`, 404. 빌드 때 `src/lib/catalog.ts` 가 Supabase `published_foods` 뷰를 읽고, 설정이 없으면 `src/data/seed-foods.ts` 예시 10개. 사진은 `src/lib/foods.ts` 의 키→import, 운영자가 올린 사진은 빌드 전 `scripts/fetch-photos.ts` 가 `public/photos/` 로 내려받는다.
- `/admin`(`src/components/admin/`): 브라우저에서 Supabase Auth + RLS 로 직접 읽고 쓴다(공개 화면에 링크 금지, noindex). [사이트에 반영] → Edge Function `web/supabase/functions/request-publish` → GitHub `repository_dispatch` → `.github/workflows/deploy.yml` → Cloudflare Pages.
- 자동 수집: `.github/workflows/pipeline.yml`(매일 10:17 KST, 하루 1회) → `web/scripts/pipeline/run.ts`(YouTube → `llm.ts` → 네이버 데이터랩 → `candidates` 대기). 계산은 `logic.ts`(외부 호출 없음, 단위 테스트 대상). AI 공급자는 `AI_PROVIDER`·`AI_MODEL` 환경변수.
- 테스트: `web/e2e/mvp.spec.ts`(공개 화면), `web/e2e/admin.spec.ts`(`page.route` 로 가짜 Supabase `127.0.0.1:54321`), `web/scripts/pipeline/*.test.ts`.

## Verifying your work
완료 보고 전 `web/` 에서 `npm run lint && npm run typecheck && npm run test:unit && npm run test:e2e` 를 실행하고 **출력을 그대로 보여줄 것, 실패하면 코드를 고칠 것.** 바뀐 동작에 테스트가 없으면 추가한다(관리자 기능은 `admin.spec.ts` 의 가짜 Supabase 에 필요한 응답을 더한다). 화면을 바꿨으면 `web/test-results/` 의 모바일·PC 스크린샷을 열어 확인하고 파일명을 보고한다. 새 SQL 은 RLS 가 의도대로 막는지(anon·비운영자·운영자) 확인 방법을 보고한다. 문서만 바꿨으면 문서 속 파일 경로가 실제로 있는지 확인한다.

## Things the agent gets wrong
- 이전 화면이 숨겨진 채 DOM 에 남아 e2e 가 엉뚱한 요소를 잡음 → `getByRole`·`getByLabel`(보이는 것만)로 찾는다.
- shadcn `init`/`add` 가 `globals.css` 에 `:root`·`@theme` 를 다시 넣음 → 지운다(토큰 원본은 `theme.css`). `--base base-ui` 는 틀린 값, `--base base`.
- `wrangler pages project create` 를 `web/` 안에서 실행하면 Workers(OpenNext)로 바꾸려고 `package.json`·`next.config.ts` 등을 마음대로 고침 → wrangler 는 `pages deploy out` 외에는 빈 임시 폴더에서 실행하고, 실행 뒤 `git status` 확인.
- 새로 clone 하면 `next-env.d.ts`·`.next/types` 가 없어 `tsc` 가 실패함 → `typecheck` 스크립트가 `next typegen` 을 먼저 돌린다. 지우지 않는다.
- Git Bash 에서 heredoc 과 `< /dev/null` 을 같이 써서 파일을 빈 파일로 만듦 → 파일 쓰기는 편집 도구로.
- `"use client"` 를 하위 컴포넌트마다 붙여 직렬화 경고 → 진입 컴포넌트(`admin-app.tsx` 등)에만.
- 정적 내보내기에서 서버 전용 기능을 넣어 `npm run build` 가 깨짐 → 위 "못 쓰는 것" 확인.
