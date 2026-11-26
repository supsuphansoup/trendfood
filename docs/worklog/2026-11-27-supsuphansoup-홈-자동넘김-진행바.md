# 홈 추천 사진의 자동 넘김 진행 바

- 날짜 2026-11-27
- 작업자 supsuphansoup (Codex)
- 원격 기준 `76d783a9df8e8138f5a87eca53a8a9688edc3bac`

## 한 것

- 홈 추천 사진 아래에 다음 전환까지 남은 시간을 보여 주는 3px 진행 바를 표시한다.
- 진행 바와 자동 넘김이 같은 8초를 사용한다. 일시정지와 탭 전환 때 경과 시간을 보존하고 사진을 직접 넘기면 0으로 초기화한다.
- 실제 공개 음식 데이터로 로컬 미리보기를 실행했다. 주소는 `http://localhost:3000/`이다.

## 바뀐 파일

- `web/src/components/home/home-feature.tsx` — 자동 넘김과 진행 바 시간을 맞춘다.
- `web/src/app/globals.css` — 사진 영역 아래에 진행 바를 배치한다. 동작 줄이기 설정에서는 바를 숨긴다.
- `web/e2e/mvp.spec.ts` — 8초 전환, 일시정지·재개, 탭 전환, 키보드 포커스, 수동 이동, 동작 줄이기를 검사한다.

## 검사 결과

- `npm run lint` — `eslint` 종료 코드 0
- `npm run typecheck` — `✓ Types generated successfully`, 종료 코드 0
- `npm run test:unit` — `ℹ pass 229`, `ℹ fail 0`
- `npm run test:e2e -- --workers=4` — `163 passed`, `1 skipped`
- `npm run test:content -- --workers=4` — `65 passed`, `1 skipped`
- 중간 검사에서 모바일 목록 카드 높이 측정이 한 번 어긋났다. 같은 코드를 4개 워커로 검사한 최종 실행에서 통과했다.
- 실제 콘텐츠의 모바일 320px WebKit과 PC 1280px Chromium에서 바 채움·일시정지·재개를 확인했다. `web/test-results/content/hero-timer-preview-mobile.png`와 `hero-timer-preview-desktop.png`를 열어 배치를 확인했다.

## 팀원 변경 확인

- 시작과 검사 후 확인한 원격 기준은 `76d783a`였다.
