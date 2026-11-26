# 홈 추천 음식을 넘길 때 생기는 빈 영역 수정

- 날짜: 2026-11-27
- 누가: supsuphansoup (Codex)
- 작업 기준: `origin/main`의 `3d67ecb50c189d007fe09109b217ef4d0cb81b3f`

## 한 것

- 마지막 추천에서 첫 추천으로 넘어가는 도중 옆으로 한 번 더 밀면 추천 사진과 설명 옆에 빈 영역이 생기는 것을 재현했다. 수정 전 공개 콘텐츠 검사에서 모바일 195px, PC 640px까지 비었다.
- 양 끝에 복제한 슬라이드로 이동하는 도중 밀기 시작하면 같은 음식의 원래 위치로 돌아가 양옆의 추천이 이어지도록 수정했다.

## 바뀐 파일

- `web/src/components/home/home-feature.tsx` — 순환 전환을 밀기 동작이 중단할 때 시작 위치를 조정한다.
- `web/content-e2e/content.spec.ts` — 모바일·PC에서 양방향 순환 중 다시 밀어도 빈 영역 없이 다음 음식까지 이동하는지 검사한다.

## 검사 결과

- `npm run lint` 통과 (`eslint`, 종료 코드 0).
- `npm run typecheck` 통과 (`✓ Types generated successfully`, 종료 코드 0).
- `npm run test:unit` 통과 (`227 pass`, `0 fail`).
- `npm run test:e2e -- --workers=4` 통과 (`163 passed`, `1 skipped`).
- `npm run test:content -- --workers=4` 통과 (`59 passed`, `1 skipped`).
- Windows Playwright WebKit(iPhone 13 화면 크기·PC)과 Chromium(PC)에서 순환 중 양방향 밀기를 확인했다. 좌우 빈 영역은 0px이었다. `test-results/safari/home-wrap-drag-webkit-iphone.png`와 `home-wrap-drag-webkit-desktop.png`를 열어 이동 중간 화면을 확인했다.

## 정한 것·남은 것

- 순환 중 밀기에서 확인한 문제를 수정했다. 실제 iPhone Safari에서 제공된 캡처와 같은 동작을 재확인할 필요가 있다.
- 원격 기준 이후 가져온 팀원 커밋 및 병합 충돌 없음.
