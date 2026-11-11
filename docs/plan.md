# Plan: 트렌드푸드 — 지금부터 오픈까지

Status: draft (2026-11-05). `docs/intent.md`·`docs/spec.md` 를 읽고 세운 **남은 작업** 계획. 이미 된 것은 spec 의 ✅ 항목.
작업 하나를 시작할 때 그 항목을 AI에게 보여 주고 "이 단계만 계획대로 해줘"라고 한다. 끝나면 ☐ 를 ☑ 로 바꾸고 커밋한다.

## Files that change
| 단계 | 바뀌는 파일 |
| :--- | :--- |
| 1 계정 연결 | 코드 없음. Supabase·Cloudflare·GitHub 설정 (`ONBOARDING.md` 4장) |
| 2 관리자 편집 보강 | `web/src/components/admin/foods-panel.tsx`, 새 `recipe-editor.tsx`·`photo-picker.tsx`, `web/src/data/photo-keys.ts`(사진 키 목록, `lib/foods.ts` 와 공유), `web/e2e/admin.spec.ts` |
| 3 영상 임베드 | `web/supabase/migrations/0002_video.sql`(`foods.video_id`), `src/data/db-mapping.ts`, `src/data/catalog-schema.ts`, `src/app/food/[slug]/page.tsx`, 관리자 입력칸, e2e |
| 4 삭제 요청·약관 | `web/src/app/about/page.tsx`·`web/src/app/privacy/page.tsx`·`web/src/app/terms/page.tsx`, 공통 안내 틀·운영자 메일 상수·푸터·공개 화면 e2e. 남음: 관리자 게시 관리의 내림 사유 기록(DB 열 필요) |
| 5 약관 준수 수집 | `web/scripts/pipeline/run.ts`(30일 지난 후보 신호 삭제), `logic.test.ts` |
| 6 분석 | `src/app/layout.tsx`(GA4, 동의 문구), `ingredient-cart.tsx`(쿠팡 링크 `subId=<slug>`) |
| 7 실데이터·오픈 | `web/src/assets/` 실제 사진, Supabase 데이터, `CLAUDE.md`·`docs/` 기준 문서 상태 갱신 |

## Order of work
1. 🟡 **계정 연결 (사람이 직접)** — 2026-11-05 Supabase·Cloudflare·GitHub Secrets·Edge Function·운영자 등록 완료(팀장 개인 계정, `ONBOARDING.md` 0장). **남음: 수집 키 3종(YouTube·네이버·AI)과 `AI_PROVIDER`·`AI_MODEL`, 교수님·팀 확인.** 원래 범위: Supabase 프로젝트·SQL·운영자 등록 → Cloudflare Pages → GitHub Secrets/Variables → Edge Function. 키는 채팅에 붙여 넣지 않는다. 병행 준비: 도메인 구입, 쿠팡 파트너스 가입, 네이버 API HUB·YouTube 키 발급, 사업자 신고 필요 여부 확인, SNS 계정 개설. 네이버 키는 **API HUB 에서만 새로 발급**되고 인증 헤더가 달라 수집 코드의 HUB 전환이 먼저다(2026-11-10 조사). 데이터랩 지수의 상업 이용·저장 범위는 네이버에 문의한다(같은 조사 보고서의 문의 목록).
2. 🟡 **관리자 편집 보강** (spec R10·R14·R16, Areas of concern 2·3): 조리 단계·재료 추가/삭제/순서·타이머 편집, 번들 사진 키·설명 선택과 구역별 저장, 기본 정보(이름·카테고리·태그·조리 시간·표시 문구·난이도·분량·순위 변동 문구) 편집, 사서 맛보기(편의점·마트) 편집 완료. **남음: 사진 업로드, "AI 이미지" 표시.** 사진 업로드는 비용·용량 검토 후 별도 단계.
3. ☑ **영상 임베드** (R5): 운영자가 YouTube 주소 입력 → ID 만 저장(11자, `^[A-Za-z0-9_-]{11}$`) → `youtube-nocookie.com/embed/<id>` + 출처 링크 완료. 썸네일 저장 금지. **실제 Supabase 에 0002_video.sql 적용 필요(사람이 직접)**.
4. 🟡 **삭제 요청 창구·필수 페이지 본문** (R8·R15): `/about#contact`에 메일 창구·48시간 답장 안내, `/privacy`·`/terms` 본문과 AI 활용·신고·임시조치 고지 완료. **남음: 관리자 화면의 내림 사유 기록(DB 열 필요), 법률 전문가 검토 전 초안이라는 점.** 운영자는 삭제 요청 확인 후 게시 관리에서 숨기기 → [사이트에 반영]으로 내린다.
5. ☐ **YouTube 약관 대응** (R19, concern 6): 30일 지난 후보의 `signals` 비우기, 상세의 "관련 영상 n개" 표기 유지 여부 결정.
6. ☐ **분석** (R20): GA4, 쿠팡 링크 `subId`. 쿠키 고지 문구.
7. ☐ **실데이터 준비**: 데모 사진 교체, 쿠팡 파트너스 링크 등록, 직접 검수한 글 20~30개, 도메인 연결.
8. ☐ **오픈** → 직접 작성·검수한 글 20~30개 이상으로 애드센스 신청·승인 후 `ads.txt` 배포 → 누적 판매 15만원 + 최종 승인 후 쿠팡 API 상품 검색·딥링크 자동화. 자동 광고는 모바일 가독성 확인 후에만 사용한다.
9. ☐ **수집 확장·Phase 2**: 검색광고·블로그·카페 신호는 약관상 못 쓴다(2026-11-10 조사) — 쇼핑인사이트, 심사 후 Threads·인스타 해시태그를 후보로 본다. 사용자 확보 후 후기 CRUD·평점·Turnstile·금칙어·LLM 검수·신고·임시조치는 새 `intent.md` 로 시작하며, Instagram 해시태그 보조 신호는 앱 심사 후 검토한다 (`docs/spec.md` 제외·수집 규칙).

## Risks
- **가장 깨지기 쉬운 곳: 반영 경로** (관리자 → Edge Function → GitHub 토큰 → deploy). 토큰 삭제·권한 부족이면 버튼만 실패한다 → 관리자 화면에 실패 문구가 보이는지 확인. 토큰은 만료 없음(2026-11-05)이라 프로젝트 종료·유출 의심 시 직접 삭제한다.
- **빌드가 DB 에 의존**: Supabase 가 정지·오류면 배포가 멈춘다(사이트는 직전 버전 유지). 정지 해제 방법을 `ONBOARDING.md` 에 둔다.
- **AI 초안 품질**: 사실과 다른 요약·조리법. 승인 후에도 게시 전 운영자 검수 필수, "AI 요약" 표시 유지.
- **스키마 변경**: 마이그레이션은 번호를 붙여 새 파일로만 추가(0002, 0003…), 기존 파일은 고치지 않는다. 적용은 SQL Editor 에서 순서대로.
- **무료 등급 한도**: YouTube 하루 10,000유닛(지금 500 사용), 데이터랩 하루 1,000회, Cloudflare 빌드 월 500회(반영 버튼 남용 주의).

## Proof
- 모든 단계: `web` 에서 `npm run lint` · `npm run typecheck` · `npm run test:unit` · `npm run test:e2e` 통과 출력을 보여 준다. 바뀐 동작마다 테스트를 추가한다.
- 1: `ONBOARDING.md` 4-5 (deploy ✓, pipeline 후 후보 생성, 숨기기 → 반영 → 사이트에서 사라짐).
- 2·3·4: 관리자 e2e 에 새 동작 추가(가짜 Supabase), 새 SQL 은 PGlite 로 RLS 확인 후 실제 Supabase 에 적용.
- 5: `logic.test.ts` 에 30일 정리 테스트.
- 6·7: 실제 사이트에서 GA4 실시간 보고서·쿠팡 파트너스 리포트에 `subId` 가 찍히는지 확인.
