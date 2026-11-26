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

## 이어서 (2026-11-27)

- 바가 잘 보이지 않는다는 피드백에 따라 재생 버튼 위 8px 위치로 옮겼다. 높이는 6px로 늘리고 밝은 회색 바탕과 주황색 채움을 사용했다.
- `web/src/app/globals.css`에서 좁고 짧은 화면의 버튼 간격을 확보했다. `web/src/components/home/home-feature.tsx`에서 동작 줄이기를 켜도 바를 표시한다. 이때 자동 넘김을 직접 켜면 1초 단위로 채워진다.
- `web/e2e/mvp.spec.ts`에 320px 화면 안의 배치, 버튼과의 간격, 동작 줄이기 설정에서의 진행률 검사를 추가했다.
- `npm run lint` — `eslint` 종료 코드 0
- `npm run typecheck` — `✓ Types generated successfully`, 종료 코드 0
- `npm run test:unit` — `ℹ pass 229`, `ℹ fail 0`
- `npm run test:e2e -- --workers=4` — `163 passed`, `1 skipped`
- `npm run test:content -- --workers=4` — `65 passed`, `1 skipped`
- 실제 공개 데이터의 320px WebKit과 1280px Chromium에서 기본 및 동작 줄이기 설정을 확인했다. `web/test-results/hero-progress-visible-mobile.png`와 `hero-progress-visible-desktop.png`를 열어 확인했다.
- 시작과 검사 후 원격은 `76d783a`로 같았다. 새 팀원 변경이나 충돌은 없었다. 이번 작업은 `http://localhost:3000/` 미리보기까지 진행했다.
