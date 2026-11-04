# 트렌드푸드 (TrendFood) — 작업 인수인계

> 마지막 갱신: 2026-11-04 (카테고리 탭·관리자 화면 추가 후). 새 세션은 이 파일을 먼저 읽고 시작한다.

## 서비스 한 줄 요약
지금 유행하는 음식을 가장 빨리 알려주고(주목적), 필요한 재료를 쿠팡에서 "다음 재료 연속 담기"로 담게 돕는 한국 모바일 우선 웹 서비스. 수익은 **쿠팡 파트너스 커미션 + 구글 애드센스**.

## 현재 상태
- **기획 v2.1 완료, 디자인 방향 확정(포토 피드형), `DESIGN.md`·테마 토큰 작성 완료, **MVP 동작 화면 + 관리자 화면 완료**(예시 데이터 10개, DB·외부 API 없음, 관리자 저장은 로컬 파일).**
- MVP 범위: 메인(1위 히어로·카테고리 탭·2~10위 카드·정렬/태그·검색(지우기 버튼)·찜 필터·인피드 광고 자리·맨 위로, 필터 상태는 주소 `?cat=&sort=&tag=&q=`에 남아 뒤로가기·공유 가능), 상세(`/food/[slug]`: AI 요약·14일 그래프·영상 자리·재료 연속 담기·집에 있어요 기억·목록 복사/공유·단계 타이머·모바일 하단 바), `/about`, 404. 찜·집에 있어요는 localStorage.
- **관리자 `/admin`** (공개 화면 어디에도 링크 없음, `noindex` 메타 + `X-Robots-Tag`, Proxy가 로그인 전 접근을 `/admin/login`으로 보냄, 서버 액션마다 다시 확인): 게시 관리(순서·숨기기·글 고치기), 재료 링크(쿠팡 주소만 허용·참고 가격), 후보 큐(추가·승인·반려). 비밀번호·서명 키는 `web/.env.local`의 `ADMIN_PASSWORD`·`ADMIN_SECRET`(커밋 금지, 8시간 httpOnly 쿠키).
- 관리자 저장소: `web/data/admin-store.json`(gitignore). 공개 화면은 `web/src/lib/catalog.ts`가 `foods.ts`와 합쳐 읽고, 저장 시 `updateTag`+`revalidatePath`. **Vercel에서는 파일을 쓸 수 없으니 배포 전 Supabase로 교체**(인증도 Supabase Auth로).
- 데이터: `web/src/lib/foods.ts`(예시), 주소 목록 `web/src/lib/food-slugs.ts`(Proxy 404용, 둘을 같이 고친다). 쿠팡 링크는 파트너스 승인 전이라 **쿠팡 검색 링크로 대체**. 사진은 `web/src/assets/demo/` 데모 사진 — **배포 전 교체 필수**.
- 목표는 MVP가 아니라 **완성본**: `prd.md` 전체 기능을 만들고 보완한다. 단, 익명 후기·평점은 Phase 2(사용자 확보 후).
- 원격 저장소: `https://github.com/supsuphansoup/trendfood` (origin). 기획 문서 v2.0·v2.1 개정분, `reports/`, `research_notes/`, `design/`, `.mcp.json`, 이 파일은 **아직 커밋 전**.
- 저장소 루트의 `.playwright-mcp/`는 시안 검사 때 생긴 스크린샷·로그다. 커밋하지 않는다 (삭제 또는 `.gitignore` 추가는 사용자 결정 대기).

## 문서 지도
| 파일 | 용도 |
| :--- | :--- |
| `DESIGN.md` | 색·글자 크기·간격·모서리·사진·컴포넌트(shadcn 매핑)·접근성 규칙 — **시각 기준 문서** |
| `web/` | Next.js 16.4.5 앱 (App Router, TS, `src/`). Vercel Root Directory는 `web` |
| `web/src/app/theme.css` | tweakcn/shadcn v4 형식 테마 토큰 — **유일한 원본**, `globals.css`가 불러옴 |
| `prd.md` (v2.1) | 기능·화면 구성(5장)·수익화·기술 스택·준수 사항·로드맵 — **기준 문서**. 0장 끝에 v2.1 변경 요약 |
| `agent.md` | 에이전트 설계, 프롬프트, DB 스키마, 연속 담기 구현 패턴 (후기 관련은 Phase 2 표시) |
| `design/mockups/` | **확정 시안 (포토 피드형)**: `home.html`, `detail.html`, `home-mobile.html`, `detail-mobile.html`. `alternatives/`는 탈락안(랭킹 리포트형, 장보기형). 브라우저로 바로 열린다 |
| `design/mockups/img/` | 시안용 데모 사진 (Wikimedia Commons, 라이선스는 `credits.json`). **실서비스 사용 금지** |
| `reports/트렌드푸드 데이터 연동 구성안.md` | API 한도·쿠팡 정책·법률·비용 근거 |
| `reports/트렌드푸드 전략 대안 비교.md` | 전략 대안·비판적 검토 |
| `reports/트렌드푸드 UI 도구 비교.md` | UI 도구 조합·워크플로·이미지·폰트·보안 |
| `index.html` | 초기 배치 데모. **코드·목업 데이터·장바구니 모달 재사용 금지** (이제 `design/mockups/`가 시각 기준) |
| `research_notes/아이디어 고도화/` | 이 작업에서 만든 것이 아님 — 건드리지 않는다 |

팀 공유용 디자인 캔버스(claude.ai, 링크 공유 중): https://claude.ai/artifact/VEbKGqcBKPaeD7aZsSPCay — `design/mockups/`와 같은 내용 + 탈락안.

## 확정된 결정
- **디자인: 포토 피드형** (2026-11-04 팀 선택).
  - 메인: 화면 가득 찬 1위 사진 히어로(헤더가 사진 위에 겹침) → 상단 가로 칩 필터 → **2위부터 한 줄에 하나씩** 큰 사진 카드(PC 사진 좌·글 우, 모바일 사진 위) → 4위 다음 인피드 광고 1개 → 11위부터 더 보기.
  - 상세: 사진 히어로 → 왜 뜨는지(AI 요약 + 14일 검색량 그래프) | 원본 영상 임베드 → 2컬럼(좌 재료 장바구니 / 우 편의점 버전·조리법·광고). 모바일은 하단 고정 '다음 재료 담기' 바.
  - **카테고리 탭 (2026-11-04 사용자 결정으로 변경):** PC는 왼쪽 고정 카테고리 탭(전체·디저트·밥·면·분식·간식·찜, 개수 표시), 모바일은 상단 가로 탭. 정렬·태그 칩은 목록 위. 사이드바 **광고**는 여전히 없음.
  - 시안 색: 진한 갈색 `#2A1D16`(글자·주 버튼), 토마토 빨강 `#B3301B`(순위 숫자·주요 CTA), 연한 베이지 `#F6EEE8`/`#FBF6F2`(칩·박스), 테두리 `#EEE3DB`. 시안 글꼴은 Noto Sans KR(900 굵은 제목)이지만 실서비스는 Pretendard.
- **익명 후기·평점: Phase 2로 연기.** 평점 표시·평점순 정렬도 제외. 좋아요(찜) 수는 유지.
- **트렌드 수집**: 공식 API만 (네이버 API HUB + 검색광고 API + YouTube Data API). SNS·커뮤니티 크롤링, 영상 자막 추출 금지. 시작은 `prd.md` 3.5 쉬운 버전(운영자 시드 + YouTube 인기 영상 제목 → LLM 음식명 추출 → DataLab 급상승 배수 → 승인 큐, Vercel Cron 하루 1회).
- **Instagram/TikTok**: 임베드 전용. Instagram 해시태그 검색은 Phase 2에 Meta 앱 심사 후 보조 신호로만 검토. 게시물 사진 저장 금지.
- **음식 사진**: 자체 촬영 / AI 생성("AI 이미지" 표시) 우선, 무료 사진(Unsplash·Pexels·Pixabay·공유마당 공공누리 1유형·Wikimedia CC0)은 보조. 관리자 화면에서 후보 사진 중 운영자가 고른다. 조건은 `prd.md` 6장.
- **게시**: LLM 초안(제목·설명란·태그만 입력) → **운영자 승인 후 게시**, "AI 요약" 표시.
- **장바구니**: 사용자 탭 1회 = 쿠팡 상품 1개 ("다음 재료 연속 담기"). 다중 탭 자동 오픈·장바구니 번들 전송·쇼핑몰 최저가 비교는 **하지 않는다**.
- **쿠팡**: API는 누적 판매 15만원 + 승인 후. 그전에는 운영자가 링크 수동 등록.
- **애드센스**: 직접 검수한 글 20~30개 후 신청. 장바구니 CTA·체크리스트 주변에 광고 금지.
- **호스팅**: Vercel **Pro** (Hobby는 비상업 전용).

## UI 개발 규칙
- 스택: Next.js (App Router, TS) + Tailwind v4 + shadcn/ui (CLI v4, Base UI 기본). 다른 UI 라이브러리(Mantine, Chakra, HeroUI 등)를 섞지 않는다.
- 배치와 시각 기준은 `prd.md` 5장 + `design/mockups/`. 시안 HTML은 참고용이고 코드는 shadcn 컴포넌트로 새로 쓴다.
- 디자인 기준은 `DESIGN.md` + tweakcn 테마 토큰으로 고정했다. 구현은 이 둘을 따른다. 입력칸 테두리는 대비 때문에 시안 `#D9C9BD` 대신 `#9C8576`.
- 한글: Pretendard(dynamic subset), `word-break: keep-all`, 제목 `text-wrap: balance`. 시안·구현 모두 실제 한국어 문구 사용.
- 이미지: 플랫폼 썸네일 저장·재사용 금지. AI 생성 이미지는 "AI 이미지" 표시.
- 검증: 화면 작업 후 Playwright로 모바일(390px)·PC 스크린샷 확인, axe 접근성 검사.
  - 이 PC의 Playwright MCP 브라우저는 배율이 0.5로 잡혀 있다. 실제 390px을 보려면 `setViewportSize({width:195})`, 1280px은 `640`으로 설정한다 (`innerWidth`로 확인).
  - Playwright MCP는 `file://`를 막는다. 로컬 HTML은 `python -m http.server`로 띄워서 연다. 스크린샷 저장 경로는 저장소 안(`.playwright-mcp/`)만 허용된다.
- 보안: MCP·스킬·shadcn 서드파티 레지스트리는 공식 출처 위주, 버전 고정, 서드파티 항목은 `shadcn add --dry-run`으로 먼저 확인.

## 개발 도구 (이 프로젝트 전용)
- `.mcp.json`: `shadcn@4.23.0 mcp`, `@playwright/mcp@0.0.84` (Windows용 `cmd /c npx`). 새 세션 시작 시 승인 필요. 두 서버 모두 연결·동작 확인 완료(2026-11-04).
- `web/` 명령: `npm run dev` · `npm run lint` · `npm run typecheck` · `npm run test:e2e` (빌드 후 3100 포트에서 390px·1280px 검사 + axe, 이어서 관리자 테스트. 테스트는 `web/.e2e-data`·테스트용 비밀번호를 따로 씀. 스크린샷은 `web/test-results/`).
- Next 16 주의: Cache Components라 `params`는 `<Suspense>` 안에서 읽는다, 없는 상세 주소 404는 `src/proxy.ts`가 처리, 화면 이동 후에도 이전 페이지가 숨겨진 채 DOM에 남으므로 테스트는 `getByRole`(보이는 것만)로 찾는다.
- shadcn: `npx shadcn@4.23.0` 고정, `--base base`(Base UI; `base-ui`는 잘못된 값). `init`/`add`가 `globals.css`에 `:root`·`@theme`를 다시 넣으면 지운다.
- 설치된 스킬 활용: `frontend-design`, `vercel:shadcn`, `vercel:nextjs`.

## 다음 할 일 (순서)
1. ~~`DESIGN.md` + 테마 토큰 작성~~ (완료 2026-11-04. 미정: 다크 모드·아이콘 세트, `DESIGN.md` 9장)
2. ~~Next.js 프로젝트 생성 + shadcn init + 테마 + Pretendard + Playwright·axe~~ (완료 2026-11-04)
3. 2026-11-05 팀·교수님 검토 반영.
4. 남은 로드맵(`prd.md` 8장): Supabase 연동(저장소·관리자 인증 교체) → 관리자 사진 선택·후보 승인 시 상세 작성 → 트렌드 자동화(Vercel Cron) → 실제 사진·쿠팡 파트너스 링크·애드센스 → 오픈 → Phase 2(후기·평점).
5. 병행: 도메인 구입, 쿠팡 파트너스 가입, 네이버 API HUB·검색광고·YouTube API 키 발급, Supabase·Vercel 계정.

## 팀 결정 대기
- **아이콘 세트**: 임시 `lucide-react`. 2026-11-05 팀·교수님 검토에서 확정 (`DESIGN.md` 9장).
- **칩 높이 42px**(시안) vs 터치 영역 44px 원칙.
- Phase 1에서 LLM **무료 티어** 사용 여부 (입력이 공개 데이터뿐이라 위험이 작다는 의견, PRD 6장·10장).
- 사진 출처 기본값 (자체 촬영 / AI 생성 / 무료 사진 비중).

## 미확인 항목
- 쿠팡 API 호출 한도(분당 50회 vs 시간당 10회), 식품 공식 수수료율.
- 네이버 API HUB 유료 전환 시점·단가.
- 사업자등록·통신판매업·부가통신사업 신고 필요 여부.
- AI 기본법 표시 의무 세부 범위, AI 이미지 생성 API 공식 가격.
- LLM 무료 티어 한도·학습 사용·상업 이용 조항 (공식 문서로 재확인).
- Pexels·Pixabay API 공식 약관, Instagram 앱 심사 통과 가능성.
- v0·Claude Design·Stitch 출력물 상업 이용 조건 (사용 시 확인).
