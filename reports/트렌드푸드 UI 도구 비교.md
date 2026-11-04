# 도구보다 토큰과 검증 루프를 먼저 고정하라

결론부터 말하면, TrendFood UI 품질을 좌우하는 것은 어떤 생성 도구를 쓰느냐가 아닙니다. **Claude Code가 읽는 디자인 입력(토큰, DESIGN.md, 실제 한국어 카피)과 모바일 화면 검증 루프**를 먼저 고정하는 것이 핵심입니다. 그래서 핵심 도구는 모두 무료이거나 이미 설치된 것으로 충분합니다. 이미 설치된 `frontend-design`과 `vercel:shadcn` 스킬, 공식 shadcn CLI v4와 MCP(2026-07부터 Base UI 기본), tweakcn으로 만든 OKLCH 토큰, Pretendard, 그리고 Playwright 스크린샷·axe·Chrome DevTools MCP로 구성한 검증 루프입니다. 이 조합의 추가 월 비용은 **$0**입니다. PRD에 이미 들어 있는 Vercel Pro $20와 Claude 구독은 별도입니다. 시각 방향 탐색에는 Claude Design(구독 포함)이나 Google Stitch(무료)를 선택적으로 쓰고, 최종 코드는 항상 Claude Code가 레포 안에서 shadcn으로 작성합니다. 이 방식이 품질과 라이선스 리스크를 함께 줄입니다. TrendFood는 AdSense와 쿠팡 파트너스로 수익을 내는 상업 사이트이므로 **v0 무료 티어, Vercel Hobby, Midjourney 무료 체험처럼 비상업 제한이 걸릴 수 있는 티어는 쓰지 않습니다.** 음식 이미지는 플랫폼 썸네일을 쓰지 않고 자체 이미지(AI 생성과 사람 검수, 스톡, 자체 촬영)로 확보합니다. Google 레시피 리치 결과의 필수 속성인 `image`도 이 이미지로 채웁니다. 근거의 한계도 분명합니다. 생성 도구별 한글 품질이나 접근성을 실측으로 비교한 자료는 없었고, 여러 가격과 약관은 2차 출처에만 의존합니다. 그래서 결제 전 확인 목록을 마지막에 따로 두었습니다.

## 핵심 도구 5개는 무료이고, 유료 생성기는 선택 사항이다

모든 AI UI 생성기에 공통으로 나오는 불만이 있습니다. 결과물이 "보라 그라디언트 + Inter + 3열 아이콘 카드 + Next/Tailwind/shadcn 기본값"으로 수렴한다는 것입니다 ([dev.to](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p)). v0 공식 문서도 v0가 **shadcn 기본 구현에 맞춰 학습돼 커스터마이즈에 약할 수 있다**고 인정합니다 ([v0 docs](https://v0.app/docs/design-systems-legacy)). 따라서 차별화는 생성기를 바꿔서 얻을 수 없습니다. 색·radius·폰트 같은 토큰, 이미지 처리, 타이포그래피를 고정하고 그 입력을 어느 도구에든 주입해야 합니다. 같은 이유로 PRD의 사이드바 필터 + 카드 그리드나 sticky CTA 상세 화면은 모든 도구가 쉽게 만들기 때문에 차별화 요소가 되지 못합니다.

컴포넌트 기반은 shadcn 한 가지로 통일합니다. shadcn은 2026년 현재 CLI v4(`shadcn@4.23.0`, 2026-10-27)를 쓰며, **2026-07부터 Base UI가 기본 primitive**입니다. Radix도 계속 지원되고 React Aria가 세 번째 선택지로 추가됐습니다 ([Base UI default](https://ui.shadcn.com/docs/changelog/2026-07-base-ui-default)). Drawer는 Vaul 대신 Base UI로 바뀌었고 ([Drawer](https://ui.shadcn.com/docs/components/drawer)), Base UI 기반 Toast도 추가됐습니다 ([Toast](https://ui.shadcn.com/docs/changelog/2026-07-toast)). 공식 MCP는 `pnpm dlx shadcn@latest mcp init --client claude` 한 줄로 설치하며 키가 필요 없습니다 ([shadcn MCP](https://ui.shadcn.com/docs/mcp)). 검증 쪽에서는 Playwright MCP가 `--device "iPhone 15"`로 모바일을 에뮬레이션합니다. 다만 README는 코딩 에이전트에게 토큰이 덜 드는 **Playwright CLI + 스킬** 경로를 먼저 권합니다 ([playwright-mcp](https://github.com/microsoft/playwright-mcp)).

| 구분 | 도구 | 판단 이유 |
|---|---|---|
| **핵심** | `frontend-design` 스킬 (설치됨) | Anthropic 1st-party이며 템플릿 룩을 피하는 방향 설정에 쓴다 |
| **핵심** | `vercel:shadcn` 스킬 (설치됨) + shadcn CLI v4 + 공식 shadcn MCP, Base UI 기반 | 코드를 레포에 소유하고, MIT, 무료, 레지스트리 검색·설치를 에이전트가 직접 한다 |
| **핵심** | tweakcn (테마 에디터, Apache-2.0) | OKLCH 토큰 CSS를 생성해 `globals.css`에 붙인다. MCP는 필요 없다 ([tweakcn](https://github.com/jnsahaj/tweakcn)) |
| **핵심** | Playwright(CLI 또는 MCP) + `toHaveScreenshot` + `@axe-core/playwright` | 모바일 스크린샷, 회귀 테스트, WCAG AA를 무료로 레포 안에서 검사한다 ([Playwright a11y](https://playwright.dev/docs/accessibility-testing)) |
| **핵심** | Chrome DevTools MCP(`--slim`) 또는 이미 있는 claude-in-chrome | 콘솔, 하이드레이션, 성능 트레이스 디버깅에 쓴다 ([chrome-devtools-mcp](https://github.com/ChromeDevTools/chrome-devtools-mcp)) |
| **핵심(설치 승인 필요)** | `vercel-labs/agent-skills`의 `web-design-guidelines` | 접근성·폼·타이포·i18n 100+ 규칙 리뷰 패스. 설치된 Vercel 플러그인과 겹치지 않는 부분은 이것뿐이다 ([agent-skills](https://github.com/vercel-labs/agent-skills)) |
| 선택 | Claude Design | 구독 한도 안에서 시각 방향을 탐색하고 handoff bundle로 Claude Code에 넘긴다 ([Anthropic](https://www.anthropic.com/news/claude-design-anthropic-labs)). 출력 소유권 조항은 미확인 |
| 선택 | Google Stitch | 무료 탐색용. 팔레트·규칙 무시와 일반적인 radius로 프로덕션에는 약하다는 평이 있다 ([designproject.io](https://designproject.io/blog/google-stitch-review/)). MCP는 커뮤니티 패키지뿐이다 |
| 선택 | v0 **Plus** ($30) | 개별 블록 시안이 필요할 때만 쓴다. Free는 상업 이용이 논란이므로 쓰지 않는다 |
| 선택 | Mobbin Pro 1개월 | 실제 앱 화면 레퍼런스를 수집한다. 한국 앱 수록 여부는 미확인 |
| 선택 | Magic UI 무료(MIT) 1~2개, coss ui(MIT, 별점·입력), Kibo/ReUI(관리자 표), Motion 14(LazyMotion) | 필요한 항목만 `--dry-run`으로 검토한 뒤 반입한다 |
| **회피** | Lovable, Bolt | 자체 스택·호스팅 중심이라 기존 Next.js 레포에서 얻는 이점이 적다(Lovable은 Vite 기반으로 알려짐, 미검증) |
| **회피** | Mantine, Chakra, HeroUI 혼용 | 스타일 체계와 토큰이 중복되고 RSC 우선 구조와 충돌한다 |
| **회피** | Tremor | npm 마지막 릴리스가 2025-01이다 ([tremor-npm](https://github.com/tremorlabs/tremor-npm)). 차트는 shadcn Charts(Recharts 3)를 쓴다 |
| **회피** | Aceternity 무거운 효과, 21st.dev Magic, Figma 유료 seat, Chromatic | 각각 LCP/INP 악화, 일반적인 미감과 유료 크레딧, 디자이너 부재, Storybook 전제라는 문제가 있다 |
| **회피** | shadcn.io 유료 MCP, `antigravity` 판 frontend-design | 공식 프로젝트와 무관한 유사품이다 ([shadcn.io](https://www.shadcn.io/mcp/claude-code), [claudemarketplaces](https://claudemarketplaces.com/skills/sickn33/antigravity-awesome-skills/frontend-design)) |

컴포넌트별로 고르면 다음과 같습니다. 모바일 필터와 시트는 shadcn Drawer(Base UI), 알림은 shadcn Toast, 캐러셀은 shadcn Carousel(Embla)을 씁니다. 하단 "재료 담기" CTA는 Drawer가 아니라 **CSS sticky와 `env(safe-area-inset-bottom)`**로 구현합니다. 별점은 radio group이나 coss ui로 만들고, 조리 타이머는 의존성 없는 커스텀 훅과 `aria-live`로 만듭니다. 애니메이션은 기본적으로 CSS(`motion-safe:`)로 처리합니다. Motion을 쓸 때는 `LazyMotion`으로 초기 비용을 약 43KB에서 약 5KB로 줄이고 `MotionConfig reducedMotion="user"`를 적용합니다 ([Motion](https://motion.dev/docs/react-reduce-bundle-size), [Motion a11y](https://motion.dev/docs/react-accessibility)). 영상 임베드는 클릭 시 로드되는 facade로 처리해 AdSense 페이지의 LCP를 보호합니다.

## 방향, 토큰, 구현, 검증의 4단계로 Claude Code를 묶는다

워크플로의 원칙은 단순합니다. **생성 도구 출력은 참고용으로만 쓰고, 레포에 들어가는 코드는 Claude Code가 shadcn으로 다시 씁니다.** 토큰은 텍스트로 레포에 있어야 에이전트가 일관되게 지킵니다. 에이전트는 `globals.css`와 `components.json`을 읽으므로 테마 도구에 MCP가 따로 필요 없습니다. 기존 `index.html` 데모는 PRD 원칙대로 배치 참고용으로만 씁니다.

| 단계 | 할 일 | 도구 | 산출물 / 완료 기준 |
|---|---|---|---|
| 0. 셋업 | `shadcn init`(Base UI, CLI 버전 고정), shadcn MCP, Playwright, DevTools MCP(`--slim`, `--isolated`), web-design-guidelines 설치 | shadcn CLI v4, `/mcp` 확인 | `.mcp.json`, `components.json` 커밋. 키는 user-scope env에 둔다 |
| 1. 시각 방향 | 레퍼런스 10~20장을 모은다(배민·컬리·오늘의집 등). 무드 2~3개를 실제 한국어 레시피명·재료명, Pretendard, 음식 사진으로 생성해 비교하고 하나를 고른다 | `frontend-design`, Claude Design 또는 Stitch, (선택) Mobbin | 선택한 무드의 시안 3화면(홈 피드, 레시피 상세, 장바구니) |
| 2. 토큰·DESIGN.md | tweakcn에서 OKLCH 팔레트와 radius를 정해 `globals.css`(`@theme inline`)에 반영한다. DESIGN.md에 팔레트 역할, 타입 스케일, 간격 리듬, 모션 규칙, 이미지 비율, **AI 이미지 배지와 쿠팡 고지 슬롯**을 적는다. CLAUDE.md에는 "시맨틱 토큰만, raw hex 금지, Inter·보라 그라디언트 금지, Pretendard·keep-all 필수"를 명시한다 | tweakcn, `vercel:shadcn` | `globals.css`, `DESIGN.md`, CLAUDE.md 디자인 섹션 |
| 3. 구현 | 컴포넌트는 MCP와 레지스트리로 추가하고 손으로 복사하지 않는다. 서드파티 항목은 `add --dry-run/--diff`로 검토한다. 카드는 서버 렌더링하고 필터 상태만 클라이언트로 둔다 | Claude Code, shadcn MCP, (선택) v0 Plus 블록 시안 | 화면별 PR |
| 4a. 내부 루프 | 375~390px에서 스크린샷을 찍고 자기 비평한다. web-design-guidelines 리뷰 패스를 돌리고, 오류는 DevTools MCP로 추적한다 | Playwright, DevTools MCP | 수정 반영 |
| 4b. 외부 루프 | 핵심 3~5화면에 `toHaveScreenshot` 기준선을 두고 axe WCAG 2.1 AA 0건을 확인한다. Lighthouse CI로 성능 예산을 검사한다 | `npx playwright test`, `lhci autorun` | 통과 로그를 남겨야 "완료"로 본다 |

외부 루프에서 주의할 점이 두 가지 있습니다. 첫째, 픽셀 비교 기준선은 OS별 폰트 렌더링 차이에 민감합니다. Windows에서 만든 기준선을 Linux CI에서 비교하면 깨지므로, 기준선은 한 환경(로컬 Windows 또는 CI의 Playwright Docker 중 하나)에 고정해야 합니다. 이는 일반적인 관행이며 이번 조사에서 출처로 확인하지는 않았습니다. 둘째, axe 같은 자동 검사는 일부 문제만 잡으므로 수동 확인이 함께 필요합니다 ([Playwright a11y](https://playwright.dev/docs/accessibility-testing)). 한글 줄바꿈이나 폰트 폴백이 깨지는 문제는 DOM 검사로는 놓치고 스크린샷으로만 잡히는 회귀입니다. 그래서 작은 모바일 기준선 세트가 비용 대비 효과가 가장 큽니다.

## 한국어 설정은 생성 도구가 아니라 프로젝트 전역에서 강제한다

한국어 타이포그래피 기본값을 공식적으로 다루는 생성 도구는 확인되지 않았습니다. 따라서 Pretendard와 줄바꿈 규칙은 `layout.tsx`/`globals.css`와 DESIGN.md에서 강제하고, 생성 프롬프트에도 매번 명시해야 합니다. Pretendard는 **SIL OFL 1.1**이어서 상업 사용·수정·재배포가 자유롭고 폰트 단독 판매만 금지됩니다. 셀프호스팅할 때는 OFL 헤더를 유지해야 합니다 ([npm pretendard](https://npmjs.com/package/pretendard), [GitHub](https://github.com/orioncactus/pretendard/blob/main/dist/web/static/pretendard-dynamic-subset.css)). 가변 폰트 전체를 `next/font/local`에 넣으면 LCP에 불리합니다. 그래서 jsDelivr의 **dynamic subset CSS**를 쓰거나 KS X 1001 2,350자 서브셋을 직접 만들어 `next/font/local`로 로드하는 쪽을 권합니다(용량 수치는 미검증). 대안 폰트로는 SUIT(OFL, woff2 200KB 미만)가 있습니다 ([SUIT](https://github.com/sun-typeface/SUIT)).

| 항목 | 설정 | 근거·주의 |
|---|---|---|
| 본문 줄바꿈 | `:lang(ko){word-break:keep-all; overflow-wrap:anywhere}` | 어절 단위로 줄바꿈하고, 긴 URL이나 영문은 강제로 끊는다. 입력 필드에서는 주의한다 ([W3C](https://lists.w3.org/Archives/Public/www-style/2015Mar/0050.html)) |
| 제목·문단 | `h1,h2,.card-title{text-wrap:balance}`, `p{text-wrap:pretty}` | Chrome 117+, Safari 26+에서 동작하고, 미지원 브라우저는 무시하므로 안전하다 ([WebKit](https://webkit.org/?p=16547)) |
| 폰트 연결 | Tailwind `font-sans`에 Pretendard를 연결하고 Inter 기본값을 제거한다 | Inter 기본값은 "AI 룩"의 징후이며 한글은 시스템 폰트로 폴백된다 |
| 아이콘 | Lucide(shadcn 기본). 카테고리 칩은 Fluent Emoji 또는 Tossface | Tossface는 **무단 변형판 제작 금지**와 고지 의무가 있고 Unicode 14까지만 포함한다 ([Tossface LICENSE](https://raw.githubusercontent.com/toss/tossface/main/LICENSE)). 재채색이 필요하면 Fluent(MIT로 알려짐)를 쓴다 |
| 카피 | 생성할 때부터 실제 레시피명·재료명을 넣는다 | 한글은 글자 폭과 정보 밀도가 커서 영어 더미 텍스트로 만든 카드는 truncate에서 깨진다 |
| 요리 모드 | Screen Wake Lock 토글. 미지원 브라우저에서는 숨기고 `visibilitychange` 때 다시 요청한다 | Baseline 2025, HTTPS 전용 ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API)) |

남은 불확실성은 두 가지입니다. `word-break: auto-phrase`는 일본어 전용으로 알려져 있어 한국어에 효과가 없을 가능성이 높습니다. Base UI combobox나 cmdk의 한글 IME 조합 입력 동작은 조사하지 못했으므로, 검색창을 구현할 때 실기기에서 직접 확인해야 합니다.

## 음식 이미지는 AI 생성, 스톡, 자체 촬영을 섞어 직접 소유한다

플랫폼 썸네일은 선택지가 아닙니다. Instagram oEmbed는 2025년에 썸네일 필드를 응답에서 제거했고 ([Meta](https://developers.facebook.com/blog/post/2025/04/08/oembed-updates/)), YouTube 썸네일을 JSON-LD `image`에 복제하는 것은 저작권과 약관을 따로 검토해야 하는 사안입니다 ([Google Recipe docs](https://developers.google.com/search/docs/appearance/structured-data/recipe)). 그래서 결정안은 세 갈래입니다. **카드 썸네일 대량 생산은 AI 생성으로 하고 사람이 검수합니다.** 일반 재료나 분위기 컷은 Unsplash/Pexels를 씁니다. 반복 노출되는 상위 메뉴는 자체 촬영으로 점진적으로 교체합니다. 비용은 병목이 아닙니다. Nano Banana(Gemini 2.5 Flash Image)는 장당 $0.039, Nano Banana 2(1K)는 $0.067이고 ([simplemetrics](https://simplemetrics.xyz/how-much-per-image-is-nano-banana-and-nano-banana-pro/)), FLUX.2 [pro]는 장당 $0.03부터입니다 ([BFL](https://docs.bfl.ai/quick_start/pricing.md)). 300장이면 약 $12 수준입니다. 진짜 병목은 떡볶이 소스 색, 반찬 구성, 수저 배치 같은 **한식 정확도 검수 시간**입니다. 그래서 같은 프롬프트로 한식 10종을 만들어 모델별로 A/B 비교한 뒤 모델을 정합니다. OpenAI를 쓸 경우 gpt-image-1.5와 mini가 2026-12-01에 종료되므로 gpt-image-2로 시작해야 합니다 ([developersdigest](https://www.developersdigest.tech/models/image-generation/openai), 2차 출처).

표시와 메타데이터 규칙도 함께 정합니다. AI기본법은 2026-01-22부터 시행 중이고 생성물 표시 의무는 AI 사업자에게 있습니다. 과태료는 최대 3,000만원이며 1년 이상 계도기간이 있습니다 ([뉴시스](https://www.newsis.com/view/NISX20260121_0003484769)). 직접 생성한 이미지를 게시하는 TrendFood가 의무 대상인지는 해석이 갈립니다. 다만 비용이 거의 들지 않는 회피책이 있으므로 카드에 작은 "AI 이미지" 배지와 "이미지는 예시입니다" 문구를 다는 것을 권합니다(법률 해석 아님). Google은 이미지 메타데이터를 지우지 말라고 권고하며, Merchant Center는 AI 이미지의 IPTC `trainedAlgorithmicMedia` 제거를 금지합니다 ([IPTC](https://iptc.org/news/google-reminds-publishers-and-merchants-not-to-strip-metadata-from-images/), [Merchant Help](https://support.google.com/merchants/answer/14743464)). 따라서 리사이즈 과정에서 메타데이터가 보존되는지 확인해야 합니다.

전송 방식은 가장 싼 경로로 갑니다. 생성 파이프라인에서 sharp로 640/1080px WebP를 미리 만들어 Supabase Storage public bucket이나 R2에 두고, `<Image unoptimized>` 또는 커스텀 loader로 서빙하면 변환 비용이 0입니다. Supabase 변환은 원본 1,000장당 $5로 가장 비싸므로 피합니다 ([Supabase](https://supabase.com/docs/guides/storage/serving/image-transformations)). Vercel 기본 최적화를 쓴다면 `minimumCacheTTL`을 31일로 늘리고 `deviceSizes`를 줄입니다 ([Vercel KB](https://vercel.com/kb/guide/reduce-image-optimization-costs-on-vercel)). Unsplash는 상업 사용이 무료지만 **사진을 모아 유사·경쟁 서비스를 만드는 것**은 금지하므로 대량 수집은 하지 않습니다 ([Unsplash](https://help.unsplash.com/en/articles/2612331-why-can-t-i-compile-photos-from-unsplash-to-replicate-a-similar-or-competing-service)). Pexels는 식별 가능한 인물이 나오는 사진을 홍보에 쓸 때 별도 동의가 필요할 수 있습니다 ([Pexels](https://help.pexels.com/hc/en-us/articles/360042295214)).

## 비용, 라이선스, 보안이 도구 선택의 실제 제약이다

### 월 비용: 핵심 조합은 추가 고정비 0원

| 항목 | 무료 범위 | 유료(월) | TrendFood 판단 |
|---|---|---|---|
| shadcn, tweakcn, Playwright, axe, Lighthouse CI, DevTools MCP | 전부 무료(오픈소스) | $0 | 핵심 |
| Claude Design | Claude 구독 한도 내, 초과분은 extra usage | 기존 구독 | 선택(Pro 이상 필요) |
| Google Stitch | 무료, 월 약 350회 생성(2차) | 유료 티어 없음 | 선택 |
| v0 | Free: 하루 7메시지, 1회성 $5 크레딧 | Plus **$30**/user | 필요할 때만 Plus ([v0](https://v0.app/pricing)) |
| Vercel 호스팅 | Hobby는 비상업 전용 | Pro **$20** (PRD 반영됨) | 필수 ([Vercel](https://vercel.com/docs/image-optimization/limits-and-pricing)) |
| Cloudflare Images | 고유 변환 5,000건/월, 초과 시 과금 없이 에러 | $0.50/1K 변환 | 대안 ([Cloudflare](https://developers.cloudflare.com/images/pricing/)) |
| AI 이미지 API | – | 장당 $0.03~0.07, 300장 약 $12(1회성) | 권장 |
| Mobbin | Free 제한 | Pro 약 $10~14(상충) | 1개월만 ([toolradar](https://toolradar.com/tools/mobbin/pricing)) |
| Subframe / Bolt / Magic Patterns | 제한 무료 | $20 / $25 / 약 $15~20 | 회피 또는 보류 ([Subframe](https://www.subframe.com/pricing), [Bolt](https://bolt.new/pricing)) |
| Figma | Starter AI 크레딧 | Professional Full 약 $16(미검증), Org $55 | 디자이너가 없으면 회피 ([Figma](https://www.figma.com/pricing/)) |
| 21st.dev Magic | 약 10크레딧(미검증) | 약 $11~14(미검증) | 회피 |
| Chromatic | 5,000 스냅샷, Chrome만 | $149~399(상충) | Storybook을 쓰지 않으므로 회피 |

추천 조합의 월 고정비는 **기존 Vercel Pro $20 외에 $0**입니다. 탐색 단계에서 Mobbin을 1개월 쓰고 v0 Plus를 한 달 쓰더라도 일시적으로 약 $40~45가 추가되는 수준입니다.

### 라이선스: 수익형 사이트에서 걸리는 조항

TrendFood는 AdSense와 쿠팡 커미션을 받는 상업 사이트이므로 비상업 티어를 조심해야 합니다. v0는 Vercel 직원이 커뮤니티에서 상업 이용을 제한하지 않는다고 답했지만 이는 비공식 답변입니다. Apache 재단 검토는 **v0 Free/Hobby를 비상업 제한(Category X)**으로 분류했습니다 ([Vercel community](https://community.vercel.com/t/use-of-v0-dev-for-commercial-purposes/14999), [Apache](https://apache.org/legal/generative-tooling-terms-reviewed.html)). Midjourney 무료 체험 생성물은 비상업 전용입니다(2차 출처) ([terms.law](https://terms.law/2026/01/15/midjourney-commercial-use-rights-complete-2026-guide/)). Figma AI 출력은 사용자 소유지만 독점성과 정확성은 보장하지 않습니다 ([Figma AI Terms](https://www.figma.com/legal/ai-terms/)). Lovable도 출력 소유를 명시합니다 ([Lovable](https://lovable.dev/pricing)). Claude Design과 Stitch의 출력 조항은 이번 조사에서 확인하지 못했습니다. 컴포넌트 쪽에서는 Animate UI가 **MIT + Commons Clause**여서 사이트에 쓰는 것은 괜찮지만 컴포넌트를 재판매할 수는 없습니다 ([LICENSE](https://github.com/imskyleen/animate-ui/blob/main/LICENSE)). Aceternity Pro, Magic UI Pro, Shadcnblocks는 유료이며 원본 재배포와 템플릿 재판매를 금지합니다 ([Aceternity](https://ui.aceternity.com/licence), [Magic UI Pro](https://pro.magicui.design/license)). 결국 **최종 코드를 Claude Code가 레포에 작성하고 생성 도구 출력은 참고로만 쓰는 구조**가 라이선스 리스크를 가장 줄입니다.

### 보안: MCP와 스킬은 npm 패키지처럼 다룬다

2026년에는 공급망 사고가 반복됐습니다. ClawHub에서는 악성 스킬 341개가 발견됐고 ([mcpblog](https://mcpblog-dev.pages.dev/blog/2026-04-20-341-malicious-skills-zero-registry-checks)), Snyk "ToxicSkills"는 **skills.sh를 포함한** 3,984개 스킬 중 76개에서 실제 페이로드를 확인했습니다(2차 출처) ([obot.ai](https://obot.ai/blog/mcp-security-agent-skills-supply-chain/)). 가짜 스타로 등재된 MCP 복제 서버(SmartLoader, [Straiker](https://www.straiker.ai/blog/smartloader-clones-oura-ring-mcp-to-deploy-supply-chain-attack))도 있었고, 세 번 정상 동작한 뒤 도구 설명을 바꿔 SSH·AWS 키를 노린 서버도 보고됐습니다(Deadbugz, 2차 출처). shadcn 레지스트리 역시 PoC에서 **서드파티 항목이 devDependency를 추가하고 설정 파일을 덮어써 dev 서버 시작 시 코드를 실행**할 수 있음이 드러났습니다 ([DEV](https://dev.to/ademkouki/the-risk-of-registry-injection-attacks-with-shadcn-4cjl)). Playwright MCP README는 스스로 "보안 경계가 아니다"라고 밝히고, `browser_run_code_unsafe`를 RCE와 동급으로 봅니다 ([playwright-mcp](https://github.com/microsoft/playwright-mcp)).

실무 규칙은 다음과 같습니다. 1st-party 조직(shadcn, Microsoft, Google ChromeDevTools, Anthropic, Vercel)의 서버만 설치합니다. 안정화된 뒤에는 `.mcp.json`에서 `@latest`를 버전 고정으로 바꿉니다. 서드파티 레지스트리는 항상 `add --dry-run/--diff`로 먼저 보고, 신뢰하지 않는 출처에는 `--overwrite`를 쓰지 않으며, `package.json` diff를 PR에서 검토합니다. 브라우저 MCP는 로그인된 개인 Chrome이 아니라 `--isolated` 프로필로 실행합니다. API 키는 커밋되는 `.mcp.json`이 아니라 user-scope 환경변수에 둡니다. 성능 트레이스를 돌릴 때는 `--no-performance-crux`로 URL이 Google로 전송되지 않게 합니다. 전역 규칙의 `npx skills find`도 skills.sh를 조회하므로, 설치를 제안하기 전에 SKILL.md 원문과 소유자를 확인하는 단계를 추가해야 합니다.

### 결제 전 확인 목록

| 확인 항목 | 왜 필요한가 |
|---|---|
| v0 ToS·AI 정책 원문에서 Free/Plus의 상업 이용 허용 여부 | 비공식 답변과 Apache 분류가 상충한다 |
| Claude Design 출력물 소유권 조항과 현재 플랜의 사용 한도 | 수치 한도가 공개되지 않았고 약관을 확인하지 못했다 |
| AI 이미지 API(OpenAI·Google·BFL) 공식 가격과 상업 이용 조건, 한식 10종 A/B 결과 | 가격 대부분이 2차 출처이고 모델별 한식 정확도 자료가 없다 |
| Vercel Pro의 이미지 최적화 포함량 | 공식 표에는 Hobby 포함량만 나와 있다 |
| sharp/Vercel/Cloudflare 변환 시 IPTC·C2PA 메타데이터 보존 여부 | Google이 메타데이터 제거를 금지·비권장한다 |
| AI기본법 시행령의 '표시' 기술 기준과 과태료 부과 개시일 | 직접 생성 이미지 게시자가 의무 대상인지 해석이 갈린다 |
| Mobbin의 한국 앱(배민·컬리·오늘의집·토스) 수록 여부와 실제 가격 | 수록 범위를 확인하지 못했고 가격 출처가 상충한다 |
| Figma MCP 캔버스 쓰기의 seat 요건(Dev vs Full)과 베타 종료 후 과금 | 공식 도움말과 포럼 답변이 다르다 |
| Stitch 공식 MCP 존재 여부와 Google Labs 약관 | 현재 확인된 것은 커뮤니티 패키지뿐이다 |
| 21st.dev, Chromatic, Magic UI Pro, Shadcnblocks의 공식 가격과 라이선스 | 애그리게이터 수치만 있다 |
| Lucide·Fluent Emoji 라이선스 원문, Pretendard 최신 버전 태그 | 이번 조사에서 원문을 확인하지 못했다 |
| TanStack Table v9과 shadcn Data Table 예제의 호환성, shadcn Command가 여전히 cmdk를 쓰는지 | 관리자 화면 구현 시 API가 다를 수 있다 |

## Conclusion

이번 조사로 "어떤 AI 디자인 도구를 살까"라는 질문의 무게가 달라졌습니다. 2026년에는 생성기들이 같은 shadcn 기본값으로 수렴하기 때문에, 품질 차이는 도구 구독이 아니라 **레포에 텍스트로 박힌 디자인 입력과 결과를 기계적으로 확인하는 루프**에서 나옵니다. 그래서 TrendFood의 UI 투자는 돈보다 한 번의 셋업 시간에 가깝습니다. DESIGN.md, CLAUDE.md 규칙, 모바일 스크린샷 기준선 3~5장이 생기면 이후 모든 화면이 자동으로 같은 기준을 통과하게 되고, 이 기준선은 사용자의 "검증해야 완료" 규칙을 UI 작업에도 그대로 적용하는 장치가 됩니다.

두 번째 시사점은 리스크가 도구 쪽으로 옮겨 왔다는 것입니다. 수익형 사이트에서는 무료 티어의 비상업 조항이, 에이전트 개발에서는 MCP와 스킬의 공급망이 실제 위협입니다. 그래서 1st-party 도구 몇 개로 범위를 좁히는 결정은 비용 절감이면서 동시에 보안·법무 결정이기도 합니다. 음식 이미지도 같은 논리를 따릅니다. 자체 이미지를 소유하면 저작권 문제를 피하고, 레시피 리치 결과의 `image` 요건을 채우고, 브랜드 일관성을 확보하는 세 가지를 한 번에 해결합니다.
