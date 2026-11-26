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

### 사진 상단 배치와 연속 채움

- 진행 바를 추천 사진 상단에 여백 없이 전체 너비로 붙였다. `web/src/app/globals.css`에서 높이를 3px로 줄이고 기존 주황색 채움과 반투명 바탕을 사용했다. 하단에 바를 놓을 때 추가했던 여백은 되돌렸다.
- `web/src/components/home/home-feature.tsx`에서 분기된 1초 타이머를 없앴다. 자동 넘김을 켜면 동작 줄이기 설정에서도 프레임마다 진행률을 갱신한다. 동작 줄이기 설정의 기본 자동 재생 상태는 꺼짐이다.
- `web/e2e/mvp.spec.ts`에서 바의 위쪽과 양끝이 사진에 맞는지, 250ms 간격에도 진행률이 변하는지 검사한다.
- `npm run lint` — `eslint` 종료 코드 0
- `npm run typecheck` — `✓ Types generated successfully`, 종료 코드 0
- `npm run test:unit` — `ℹ pass 229`, `ℹ fail 0`
- `npm run test:e2e -- --workers=4` — `163 passed`, `1 skipped`
- `npm run test:content -- --workers=4 -g '첫 화면에서 추천 음식|추천 사진·제목·설명|추천 음식 순환 경계|짧은 화면에서 양옆 화살표|대표 음식에 추천 표기'` — `10 passed`
- 실제 공개 데이터로 320px WebKit과 1280px Chromium의 기본·동작 줄이기 설정을 확인했다. 네 경우 모두 연속 12프레임에서 진행률이 증가했다. `web/test-results/hero-progress-slim-mobile.png`와 `hero-progress-slim-desktop.png`를 열어 배치를 확인했다.
- 원격 기준은 `76d783a`로 같았다. 팀원 변경이나 충돌 없이 로컬 미리보기에 반영했다.

### 하단 진행선의 바탕 제거

- `web/src/app/globals.css`에서 회색 바탕을 제거해 8초 동안 차오르는 3px 흰 선만 표시한다.
- `web/e2e/mvp.spec.ts`에서 진행선의 바탕이 투명한지 확인한다.
- `npm run lint` — `eslint` 종료 코드 0
- `npm run typecheck` — `✓ Types generated successfully`, 종료 코드 0
- `npm run test:unit` — `ℹ pass 229`, `ℹ fail 0`
- `npm run test:e2e -- --workers=4 --retries=1` — `163 passed`, `1 skipped`
- `npm run test:content -- --workers=4 -g '첫 화면에서 추천 음식|추천 사진·제목·설명|추천 음식 순환 경계|짧은 화면에서 양옆 화살표|대표 음식에 추천 표기'` — `10 passed`
- 320px WebKit과 1280px Chromium에서 투명 바탕과 재생을 확인했다. `web/test-results/hero-progress-clear-mobile.png`와 `hero-progress-clear-desktop.png`를 열어 확인했다.
- 원격 기준은 `76d783a`로 같았다. 팀원 변경이나 충돌 없이 로컬 미리보기에 반영했다.

### 진행선을 사진이 끝나는 지점에 배치

- `web/src/components/home/home-feature.tsx`에서 진행선을 사진 바로 뒤에 렌더링하고, `web/src/app/globals.css`에서 그 높이 3px을 첫 화면 레이아웃에 포함했다. 사진과 진행선이 겹치거나 사이에 틈이 생기지 않는다.
- `web/e2e/mvp.spec.ts`에서 사진 하단, 진행선, 출처 안내의 경계 좌표를 비교한다.
- `npm run lint` — `eslint` 종료 코드 0
- `npm run typecheck` — `✓ Types generated successfully`, 종료 코드 0
- `npm run test:unit` — `ℹ pass 229`, `ℹ fail 0`
- `npm run test:e2e -- --workers=4 --retries=1` — `163 passed`, `1 skipped`
- `npm run test:content -- --workers=4 -g '첫 화면에서 추천 음식|추천 사진·제목·설명|추천 음식 순환 경계|짧은 화면에서 양옆 화살표|대표 음식에 추천 표기'` — `10 passed`
- 320×568·390×844·568×320 WebKit과 768×1024·1280×800 Chromium에서 경계 간격 0px을 확인했다. `web/test-results/hero-progress-flush-mobile.png`와 `hero-progress-flush-desktop.png`를 열어 확인했다.
- 원격 기준은 `76d783a`로 같았다. 팀원 변경이나 충돌 없이 로컬 미리보기에 반영했다.

### 홈 헤더와 맞춘 흰색 진행선

- `web/src/app/globals.css`의 진행선을 흰색 2px로 줄이고 어두운 사진 위에 옅은 같은 색 바탕을 사용했다. 헤더와 사진이 맞닿는 위치에서 8초간 채워진다. `web/e2e/mvp.spec.ts`의 높이 기대값을 갱신했다.
- `npm run lint` — `eslint` 종료 코드 0
- `npm run typecheck` — `✓ Types generated successfully`, 종료 코드 0
- `npm run test:unit` — `ℹ pass 229`, `ℹ fail 0`
- 첫 E2E 실행에서 모바일 목록 카드의 세로 위치 측정이 한 번 실패했다. 두 진행선 테스트는 통과했다.
- `npm run test:e2e -- --workers=4 --retries=1` 재실행 — `163 passed`, `1 skipped`
- `npm run test:content -- --workers=4 -g '첫 화면에서 추천 음식|추천 사진·제목·설명|추천 음식 순환 경계|짧은 화면에서 양옆 화살표|대표 음식에 추천 표기'` — `10 passed`
- 실제 공개 데이터의 320px WebKit과 1280px Chromium에서 상단 배치와 기본·동작 줄이기 재생을 확인했다. `web/test-results/hero-progress-mono-mobile.png`와 `hero-progress-mono-desktop.png`를 열어 확인했다.
- 원격은 `76d783a`로 같았다. 새 팀원 변경이나 충돌 없이 로컬에 반영했다.

### 헤더와 진행선의 경계 보강

- `web/src/app/globals.css`의 흰 선이 흰 헤더에 묻힌다는 피드백을 반영했다. 사진 상단에 2px 어두운 경계를 두고, 그 아래에서 흰색 3px 선을 진한 바탕 위에 표시한다. `web/e2e/mvp.spec.ts`는 사진 상단 배치와 재생 중 선의 위치·두께를 검사한다.
- `npm run lint` — `eslint` 종료 코드 0
- `npm run typecheck` — `✓ Types generated successfully`, 종료 코드 0
- `npm run test:unit` — `ℹ pass 229`, `ℹ fail 0`
- `npm run test:e2e -- --workers=4 --retries=1` — `163 passed`, `1 skipped`
- `npm run test:content -- --workers=4 -g '첫 화면에서 추천 음식|추천 사진·제목·설명|추천 음식 순환 경계|짧은 화면에서 양옆 화살표|대표 음식에 추천 표기'` — `10 passed`
- 320px WebKit과 1280px Chromium에서 매 프레임 채움과 캡처의 실제 경계·흰 선·바탕 색을 확인했다. `web/test-results/hero-progress-edge-mobile.png`와 `hero-progress-edge-desktop.png`를 열어 확인했다.
- 원격은 `76d783a`로 같았다. 팀원 변경이나 충돌 없이 로컬 미리보기에 반영했다.

### 사진 하단 시안 로컬 적용

- 사용자가 고른 하단 시안을 `web/src/app/globals.css`에 적용했다. 사진 하단에서 2px 위에 테두리 없는 3px 흰 선을 두고, 기존 8초 자동 넘김과 진행률을 맞춘다.
- `web/e2e/mvp.spec.ts`에서 작은 모바일 화면에도 하단 진행선이 보이고 조작 버튼과 겹치지 않는지 검사한다.
- `npm run lint` — `eslint` 종료 코드 0
- `npm run typecheck` — `✓ Types generated successfully`, 종료 코드 0
- `npm run test:unit` — `ℹ pass 229`, `ℹ fail 0`
- `npm run test:e2e -- --workers=4 --retries=1` — `163 passed`, `1 skipped`
- `npm run test:content -- --workers=4 -g '첫 화면에서 추천 음식|추천 사진·제목·설명|추천 음식 순환 경계|짧은 화면에서 양옆 화살표|대표 음식에 추천 표기'` — `10 passed`
- 320px WebKit과 1280px Chromium에서 로컬의 실제 음식으로 재생을 확인했다. `web/test-results/hero-progress-bottom-mobile.png`와 `hero-progress-bottom-desktop.png`를 열어 확인했다.
- 원격 기준은 `76d783a`로 같았다. 팀원 변경이나 충돌 없이 로컬 미리보기에 반영했다.
