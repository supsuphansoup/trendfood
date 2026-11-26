# 홈 목록 필터 고정과 모바일 찜 크기 조정

- 날짜: 2026-11-27
- 누가: supsuphansoup (Codex)
- 시작 기준: `origin/main`의 `6db05e9b92a0f2accc7085daf501fec9de92001f`
- 통합·검사 기준: `origin/main`의 `58da0e0ca5162c4eedce7c64e0f2b1f7c6a00c50`

## 한 것

- 스크롤할 때 펼쳐 둔 정렬·태그·연도 필터가 카테고리 줄 아래에 고정된다. 작은 화면에서는 펼친 영역을 화면 높이의 40%로 제한하고 이 영역 안에서 나머지 옵션을 스크롤할 수 있다.
- 목록으로 이동할 때 펼친 필터의 높이를 반영해 목록 시작을 필터 바로 아래에 맞춘다.
- 모바일 음식 카드의 찜은 가장자리에서 띄우고 보이는 원을 32px, 하트 아이콘을 16px로 줄였다. 버튼을 누를 수 있는 영역은 44px이다.

## 바뀐 파일

- `web/src/components/home/home-feed.tsx` — 펼친 필터 고정과 음식 목록 스크롤 위치 보정.
- `web/src/components/home/food-card.tsx` — 모바일 2열·3열 음식 카드의 찜 위치와 크기 조정.
- `web/content-e2e/content.spec.ts` — 스크롤 중 필터 고정·내부 스크롤·찜의 크기와 동작 검사. 기존 결과 전환 테스트는 클릭과 동시에 애니메이션을 관찰한다.

## 검사 결과

- `npm run lint` 통과 (`eslint`, 종료 코드 0).
- `npm run typecheck` 통과 (`✓ Types generated successfully`, 종료 코드 0).
- `npm run test:unit` 통과 (`228 pass`, `0 fail`).
- `npm run test:e2e -- --workers=6` 통과 (`163 passed`, `1 skipped`).
- `npm run test:content -- --workers=6` 통과 (`63 passed`, `1 skipped`). 처음 실행에서는 기존 목록 전환 검사 한 건이 360ms 애니메이션을 놓쳤고, 클릭 전에 관찰을 시작하도록 보정한 뒤 통과했다.
- 320×568 Windows WebKit에서 필터 고정·내부 스크롤과 2열·3열 찜 버튼을 확인했다. 필터 시작은 65px, 찜 터치 영역은 44px, 하트 아이콘은 16px였다.
- 모바일·PC의 `sticky-filters-mobile.png`, `sticky-filters-desktop.png`, `card-like-mobile.png`, `card-like-desktop.png`를 열어 확인했다.

## 정한 것·남은 것

- 필터가 스크롤을 따라오도록 해 달라는 요청은 펼친 옵션도 카테고리 아래에 고정하는 것으로 해석했다.
- 기준에 포함된 팀원 변경 `b76c19d`, `6db05e9`는 네이버·구글 검색 소유 확인이며 필터·찜과 겹치는 파일이 없다.
- 첫 푸시 전 검사에서 3101 포트가 이미 사용 중이었다. 같은 동안 원격에 컵라면 볶음밥 사진 변경 `58da0e0`이 올라왔다. 양쪽이 수정한 콘텐츠 테스트의 각 구간을 확인한 뒤 충돌 없이 통합하고 포트가 비었을 때 검사했다.
