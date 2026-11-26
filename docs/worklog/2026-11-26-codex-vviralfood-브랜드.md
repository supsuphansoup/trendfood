# vviralfood 이름과 로고 적용

- 날짜: 2026-11-26
- 누가: Codex
- 원격 기준: `c145c28550852eab39eff5bac0f6fae2819b223e` (디저트 분류 통합). 원격 기준의 새 로컬 복제본에서 작업했다. 충돌은 없었다.

## 한 것

- 첨부 PNG를 그대로 복사해 홈·상세·안내 헤더와 브라우저 탭에 연결했다. 헤더 표시 영역은 로고 주변 여백을 줄였다.
- 서비스 이름을 `vviralfood`로 모아 페이지·공유 제목, 안내 문구, 관리자, 새 직접 촬영 사진의 기본 출처에 적용했다.
- 홈 시안 A~D도 같은 로고와 이름으로 바꾸고, 서버 없이 열리는 HTML을 OneDrive 문서에 저장했다.

## 바뀐 파일

- `web/public/brand/vviralfood-logo.png`, `web/src/data/site.ts`, `web/src/components/site-logo.tsx`: 로고와 공통 브랜드 설정.
- `web/src/app/`, `web/src/components/`: 헤더, 제목, 안내, 관리자, 공유 문구.
- `web/e2e/mvp.spec.ts`, `web/e2e/admin.spec.ts`, `web/content-e2e/content.spec.ts`: 로고 로딩·홈 이동·접근성 이름, 브랜드 제목, 사진 기본 출처 검사.
- `docs/design.md`: 최신 브랜드 기준.

## 검사 결과

- `npm run lint`: 통과.
- `npm run typecheck`: Types generated successfully, 종료 코드 0.
- `npm run test:unit`: 220 통과, 0 실패. 초기에는 새 Windows 체크아웃의 CRLF로 훅 테스트가 실패했다. 복제본의 훅 소스 줄 끝을 Git 원본 LF와 맞춘 뒤 검사했다. 훅 코드 변경은 없다.
- `npm run test:e2e`: 158 passed. `logo-home-mobile.png`와 `logo-detail-desktop.png`에서 로고를 확인했다.
- `npm run test:content`: 42 passed. 3003 포트에서 홈과 봄동 비빔밥 상세 HTTP 200.
- `node verify-portable.cjs`: PC·모바일 A~D의 파일 전환, 이미지·글꼴 로딩 통과. axe 위반 0.

## 정한 것·남은 것

- 로고에 그려진 글자는 그대로 사용하고 서비스 이름은 요청된 철자로 지정했다. 기존 URL과 운영 연락처는 유지했다.
- 로컬 확인용이다. OneDrive의 다른 기기 동기화와 실서비스 배포는 확인 범위에 포함하지 않았다.
