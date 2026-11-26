# 유행 음식 머랭롤과 플레이트 실사 추가

- 날짜: 2026-11-26
- 누가: supsuphansoup (AI 도구: Codex)
- 관련: docs/spec.md R1·R2·R14

## 한 것

- 머랭롤을 유행 음식 소개로 추가했다. 11월 하순 검색 관심도와 ASMR 확산을 보도·먹방 원본에 연결하고, 홈 첫 슬라이드와 유행 목록에 표시했다.
- Pexels 작가 Valeria Boltneva의 머랭롤 사진을 원본 구도 그대로 WebP로 변환해 사용했다. 상세의 사진 정보에 원본·작가·이용 조건을 연결했다.
- 대표 음식이 조리법 없는 소개이거나 최근 날짜를 가진 경우에도 기존 단위 검사가 일정한 조건을 검증하도록 테스트 자료를 수정했다.

## 바뀐 파일

- `web/src/data/content/foods.json` — 음식 소개, 유행 기록, 추천 추가.
- `web/src/data/content/auto-photo-credits.json`, `web/src/lib/curated-photos.ts`, `web/src/assets/curated/photo-meringue-roll-pexels.webp` — 사진 파일과 출처 등록.
- `web/content-e2e/content.spec.ts` — 검색 카드·상세 사진·유행 근거·이용 조건 검사.
- `web/scripts/content-edits.test.ts`, `web/scripts/content.test.ts`, `web/scripts/photo-automation.test.ts` — 새 음식의 종류와 유행 시기에 영향받던 테스트 자료 조정.

## 검사 결과

- `git diff --check`, `npm run lint`, `npm run typecheck` — 통과.
- `npm run test:unit` — 227개 통과.
- `npm run test:e2e -- --workers=2` — 통과.
- `npm run content:check` — 공개 음식 81개 검증.
- `npm run test:content -- --workers=2` — 57개 통과, 기존 조건부 검사 1개 건너뜀. PC·모바일 `hero-fullscreen-*.png`와 `meringue-roll-card-*.png`, `meringue-roll-detail-*.png` 확인.

## 정한 것·남은 것

- 11월 23일 검색 관심도 집계일을 최신 유행 기록으로, 11월 26일을 등록일로 썼다.
- 원격 기준 `c74efffebf25f7b9061474f0534a250d0d53dad0`에서 작업했다. 작업 중 추가 팀원 커밋과 충돌은 없었다.
