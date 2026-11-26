# 홈 고정 검색과 음식 상세 유튜브 검색

- 날짜 2026-11-27
- 작업자 supsuphansoup (AI 도구 Codex)
- 시작 원격 기준 `3b5483b1e6bcc7eac3104c0c80380569f3cba68d`
- 통합 후 원격 기준 `89331c87da38ea8f95a7131385cd44a717ded5f0`

## 한 것

- 목록의 필터가 상단에 고정되면 옆에 검색창을 표시한다. 위로 올라가면 헤더 검색창으로 돌아가며 입력한 검색어와 검색 결과를 유지한다.
- 모바일에서는 카테고리 바로 아래 줄에 검색과 필터를 놓는다. 화면이 검색 줄이나 펼친 필터 높이를 갱신하는 중에도 목록 영역의 시작 위치를 기준으로 스크롤한다.
- 모든 음식 상세의 첫 번째 버튼 옆에 ‘영상 보기’를 표시한다. 음식 이름을 검색한 YouTube 결과를 새 탭에서 열고 개인정보 안내에도 반영했다.

## 바뀐 파일

- `web/src/components/home/home-feed.tsx` — 헤더와 고정 필터의 검색창 및 입력 상태를 공유한다.
- `web/src/app/food/[slug]/page.tsx` — 모든 상세의 영상 검색 링크를 추가한다.
- `web/src/app/privacy/page.tsx` — 상세의 YouTube 이동을 안내한다.
- `web/content-e2e/content.spec.ts` — 고정 검색, 필터와 목록 정렬, 새 탭 이동, 공개 음식 81개 상세의 검색 주소를 검사한다.

## 검사 결과

- `npm run lint` — `eslint` 종료 코드 0
- `npm run typecheck` — `✓ Types generated successfully`, 종료 코드 0
- `npm run test:unit` — `ℹ pass 229`, `ℹ fail 0`
- `npm run test:e2e -- --workers=6` — `163 passed`, `1 skipped`
- `npm run test:content -- --workers=6` — `65 passed`, `1 skipped`
- `web/test-results/content/`의 `sticky-search-{mobile,desktop}.png`, `sticky-filters-{mobile,desktop}.png`, `pokemon-official-detail-{mobile,desktop}.png`를 열어 확인했다.
- 320px WebKit과 1280px Chromium에서 검색창 이동과 밤 티라미수 YouTube 검색 새 탭 열기를 확인했다.
- 모바일 Chromium과 WebKit에서 필터를 펼친 채 목록으로 이동하면 목록 시작이 필터 아래에 붙는 동작을 각각 4회 확인했다.

## 정한 것·남은 것

- 모바일의 고정 검색과 필터는 카테고리 아래에 한 줄로 배치했다.
- 팀원 커밋 `89331c8`의 포켓몬빵 직접 촬영 사진과 출처 표시를 통합했다. 같은 공개 콘텐츠 테스트의 충돌은 사진 검사와 새 유튜브 검색 동작을 모두 검사하도록 해결했다. 통합 상태에서 검사 5개를 다시 실행했다.
