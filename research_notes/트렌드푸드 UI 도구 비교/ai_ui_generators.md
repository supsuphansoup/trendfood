# AI UI 생성 도구 비교 (TrendFood: Next.js App Router + TS + Tailwind + shadcn/ui), 2026-11-04 기준

> 조사 범위 메모: 공식 페이지는 v0, Lovable, Bolt, Subframe 가격 페이지, Anthropic Claude Design 발표, Figma AI Terms, Figma MCP 문서를 직접 읽었다. 나머지(Stitch 한도, Magic Patterns, Relume, Banani, Uizard 가격 등)는 서드파티 블로그와 애그리게이터에만 의존하며 **미검증**이다. 대부분의 비교 블로그는 경쟁 벤더가 운영한다(예: banani.co). Polymet, UX Pilot은 신뢰할 만한 최신 자료를 찾지 못했다.

## 1. 각 도구의 출력물과 Next.js + shadcn 코드베이스·Claude Code로의 이전 경로

### Takeaway
shadcn 코드베이스에 그대로 이식되는 것은 v0(shadcn/Tailwind 네이티브, GitHub sync, 커스텀 shadcn registry)가 가장 직접적이다. Claude Code 사용자에게는 Claude Design(handoff bundle)과 Figma MCP(Code Connect, 캔버스 쓰기)가 MCP/번들 경로로 가장 잘 붙는다. Stitch, Magic Patterns, Subframe도 MCP를 제공하지만 출력이 HTML이거나 자체 컴포넌트 체계여서 shadcn으로 다시 매핑하는 작업이 필요하다.

### Cited Findings
- **v0 (Vercel):** GitHub sync가 Free 플랜에 포함된다 — [v0 pricing](https://v0.app/pricing). 커스텀 shadcn registry와 "Open in v0" 버튼으로 자체 디자인 시스템을 주입한다. 엔드포인트는 `https://v0.dev/chat/api/open?url=[URL]`이고, 토큰은 `tokens.css`로 덮어쓴다 — [shadcn docs: Open in v0](https://v3.shadcn.com/docs/registry/open-in-v0), [v0 design systems (legacy)](https://v0.app/docs/design-systems-legacy). 주의할 점은 "v0 is specifically trained on the default implementations of the shadcn/ui components and may struggle with any customizations"이다(legacy 문서 기준이며 현행은 "Design Systems 2.0") — [v0 docs](https://v0.app/docs/design-systems-legacy), [v0 design systems](https://v0.app/docs/design-systems).
- **Claude Design (Anthropic Labs):** 2026-04-17에 출시됐고 Opus 4.7 기반이다. Pro/Max/Team/Enterprise 대상 research preview다. 내보내기는 Canva, PDF, PPTX, standalone HTML과 내부 URL을 지원하고, "handoff bundle"을 Claude Code에 한 번의 지시로 넘긴다. 온보딩 단계에서 코드베이스와 디자인 파일을 읽어 디자인 시스템(색, 타이포, 컴포넌트)을 구성한다 — [Anthropic 발표](https://www.anthropic.com/news/claude-design-anthropic-labs). 번들에는 components, styles, assets, copy가 포함된다고 하며, 2026년 6월 업데이트에서 토큰 비용과 브랜드 일관성을 개선했다고 한다(2차 보도, 미검증) — [technobezz](https://www.technobezz.com/news/anthropic-launches-claude-design-update-with-direct-pipeline-to-claude-code), [windowsreport](https://windowsreport.com/claude-design-workspace-launches-with-ai-ui-prototyping-and-code-handoff/).
- **Figma Make + Figma MCP server:** Make는 .tsx 파일로 React 앱을 구성하는 코드 에디터와 프리뷰를 제공한다 — [Figma developer docs](https://developers.figma.com/docs/code). MCP server는 remote(권장)와 desktop 방식이 있다. Claude Code는 desktop, remote, write-to-canvas를 모두 지원한다. Code Connect는 "keeps generated code consistent with your codebase"한다. 캔버스 쓰기는 remote 서버와 Full seat가 필요하며, "free during the beta period" 이후 usage-based 유료로 바뀔 예정이다. desktop 서버는 Professional 이상 플랜의 Dev/Full seat가 필요하다 — [Figma MCP docs](https://developers.figma.com/docs/figma-mcp-server/). Make 공식 GitHub export/sync는 확인하지 못했다(Gaps 참조).
- **Google Stitch:** Figma로 원클릭 복사(code.to.design 연동)를 지원한다 — [divRiots](https://divriots.com/blog/divriots-powers-google-stitch-export-feature). MCP server/SDK, DESIGN.md 내보내기, AI Studio/Antigravity 내보내기가 있다고 하나 2차 출처다 — [findskill](https://findskill.ai/blog/google-stitch-2-march-2026-update), [aireiter](https://aireiter.com/tr/blog/google-stitch-review), [Pillitteri (Claude Code 연동 사례)](https://pasqualepillitteri.it/en/news/647/google-stitch-mcp-export-claude-code-design-to-code). 코드 내보내기 포맷은 출처마다 엇갈린다. HTML/CSS만 지원한다는 자료와 Tailwind/Vue/Flutter 등을 지원한다는 자료가 있다 — [guvi, uithings 등 검색 요약](https://uithings.com/what-is-google-stitch). 한 리뷰어(2026-04-15)는 "MCP 연결 세팅에 엔지니어가 몇 시간 걸렸다"고 했다 — [designproject.io](https://designproject.io/blog/google-stitch-review/).
- **Lovable:** 사용자가 코드와 AI output을 소유한다(가격 페이지 FAQ) — [Lovable pricing](https://lovable.dev/pricing). 모든 플랜에서 양방향 GitHub sync를 지원한다는 것은 2차 출처다 — [automationatlas](https://automationatlas.io/guides/lovable-vs-bolt-new-2026-comparison/). Lovable 기본 스택은 Vite+React 기반으로 알려져 있어 Next.js App Router와는 맞지 않을 수 있다(미검증, 이번 조사에서 공식 확인 못 함).
- **Bolt.new:** 가격 페이지에는 GitHub/export 언급이 없다 — [Bolt pricing](https://bolt.new/pricing). ZIP 다운로드 외에 최근 GitHub sync가 추가됐다는 것은 2차 출처다 — [automationatlas](https://automationatlas.io/answers/lovable-vs-bolt-new-2026/).
- **Magic Patterns:** 공식 문서상 내보내기는 MCP server(Cursor, Claude Code 대상이며 "most common handoff workflow"), copy-as-prompt, 코드 패키지 다운로드, GitHub sync, Figma export다 — [Magic Patterns docs](https://www.magicpatterns.com/docs/documentation/exporting/overview). shadcn 출력을 지원하는 커뮤니티 MCP(ryanleecode, MIT)가 있다 — [LobeHub](https://lobehub.com/en/mcp/ryanleecode-magic-patterns-mcp). React, Vue, Tailwind로 출력한다(2차) — [toolworthy](https://www.toolworthy.ai/tool/magicpatterns).
- **Subframe:** 캔버스가 HTML/React 기반이고 Tailwind 스타일 코드를 낸다. "Subframe MCP to bring design context to your external agents"를 제공하며, 자신의 Claude/Codex 구독을 내장 에이전트로 연결할 수 있다. shadcn은 언급되지 않는다 — [Subframe pricing](https://www.subframe.com/pricing).
- **Relume:** Figma, Webflow, React로 내보낸다(2차, 사이트맵/와이어프레임 중심) — [forasoft](https://www.forasoft.com/blog/article/ai-wireframe-tools-comparison). **Banani:** HTML/CSS와 Figma(유료)로 내보내며 프레임워크 코드는 없다(2차, 다만 출처가 경쟁사 블로그) — [flowstep](https://flowstep.ai/blog/banani-alternative/). **Uizard:** 전체 HTML이나 Figma export가 없고, Handoff 모드에서 컴포넌트 단위 React/CSS 복사만 된다(2차) — [aidesigner](https://www.aidesigner.ai/blog/uizard-alternatives). **UX Pilot:** HTML/CSS를 내보낸다(2차) — [banani blog](https://www.banani.co/blog/uxpilot-alternatives).

### Inferences
- TrendFood 스택에서 "코드 그대로 이식" 우선순위는 v0, Claude Code 직접 생성(+Claude Design 번들), Magic Patterns(MCP), Subframe 순이다. Stitch, Figma Make, Banani, UX Pilot, Uizard, Relume은 시각 탐색용으로 쓰고 코드는 Claude Code가 shadcn으로 재작성하는 흐름이 현실적이다.
- v0가 default shadcn에 최적화돼 있다는 점은 "템플릿 룩"과 직결된다. 차별화는 토큰(색, 반경, 폰트)과 레이아웃 단계에서 하는 편이 낫다. 컴포넌트 내부 구현은 손대지 않는 것이 v0와 충돌이 적다.

### Gaps
- Figma Make 공식 GitHub 내보내기/동기화 여부는 확인하지 못했다(포럼에는 복사/내보내기가 안 된다는 미답변 질문만 있다 — [Figma forum](https://forum.figma.com/report-a-problem-6/figma-make-figma-ai-56802)).
- Polymet은 출력 형식, 가격, 현재 운영 상태 모두 신뢰할 출처를 찾지 못했다.
- Stitch의 정확한 현재 코드 export 포맷과 공식 MCP 문서(stitch.withgoogle.com)는 직접 확인하지 못했다.

## 2. 가격과 무료 한도 (2026년 말)

### Takeaway
무료로 가장 많이 쓸 수 있는 것은 Stitch(Labs 실험 단계, 무료, 월 생성 한도)와 Figma Starter AI credits다. 코드 생성기는 대체로 월 $20~30이 진입선이다. Claude Design은 기존 Claude 구독 한도 안에서 쓴다.

### Cited Findings
- **v0 (공식 페이지 확인):** Free $0는 하루 7 메시지 제한과 GitHub sync가 있고, 신규 가입자에게 1회성 $5 크레딧을 준다. Plus는 $30/user/월로 월 $30 크레딧과 로그인 시 하루 $2 크레딧을 준다(페이지에 "$30$90" 표기가 혼재). Business는 $100/user/월로 학습 opt-out이 기본이다. Enterprise는 별도 협의다 — [v0 pricing](https://v0.app/pricing). 2026년 10월에 무료 크레딧이 1회성 $5로 바뀌었고, 7월에 Team 플랜이 Plus로 개명됐으며, 8월에 Mini/Pro 모델 토큰 단가가 인하됐다(애그리게이터, 미검증) — [usagepricing](https://usagepricing.com/blueprint/v0). 월 크레딧 만료 기간은 65일이다(2026-01, 2차) — [usagepricing](https://www.usagepricing.com/blueprint/activity/v0-2026-10-05-free-credits-one-time).
- **Lovable (공식):** Free는 하루 5 build credits(월 최대 30), 월 20 Cloud credits를 준다. 월 크레딧은 2개월 후, top-up은 12개월 후 만료된다. 플랜 가격은 페이지에서 확인하지 못했다 — [Lovable pricing](https://lovable.dev/pricing). Pro 진입가는 2차 출처에서 $20~25로 엇갈린다 — [automationatlas](https://automationatlas.io/answers/lovable-vs-bolt-new-2026/), [nxcode](https://www.nxcode.io/resources/news/bolt-new-vs-lovable-2026).
- **Bolt.new (공식):** Free는 월 1M 토큰에 일 300K 한도, Bolt 브랜딩이 붙는다. Pro는 $25/월(월결제)로 10M 토큰부터 시작하고 이월된다. Teams는 $30/member/월이다. 연결제는 최대 28% 할인된다 — [Bolt pricing](https://bolt.new/pricing).
- **Subframe (공식):** Free는 프로젝트 1개와 제한된 AI 크레딧을 주고 자신의 Claude/Codex 구독을 쓸 수 있다. Pro는 $20/editor/월로 크레딧 6배와 멀티 테마를 제공한다. 크레딧은 웹 버전에서 쓰거나 자기 구독 대신 쓸 때만 소모된다 — [Subframe pricing](https://www.subframe.com/pricing).
- **Figma:** Organization Full seat는 $55/월이며 MCP Server가 포함된다(공식 페이지 스니펫) — [Figma pricing](https://www.figma.com/pricing/). Starter는 하루 150, 월 최대 500 AI credits이고, Professional Full seat는 월 +3,000 크레딧에 약 $16/월이다(애그리게이터, 미검증) — [toolradar](https://toolradar.com/tools/figma-mcp/pricing), [banani](https://www.banani.co/blog/figma-pricing-and-credits). Make는 같은 크레딧 풀을 쓰고, 에이전시 규모에서는 크레딧 구조가 불편하다는 사용자 불만이 있다 — [Figma forum](https://forum.figma.com/share-your-feedback-26/ai-credit-structure-not-feasible-for-an-agency-52627). MCP 캔버스 쓰기는 베타 기간 무료이고 이후 usage-based다 — [Figma MCP docs](https://developers.figma.com/docs/figma-mcp-server/).
- **Google Stitch:** 무료(Google Labs)이고 유료 티어가 없다. Standard 모드는 월 350회 생성이고, Experimental/Pro 모드는 50~400회로 출처마다 다르다(전부 2차, 미검증) — [uithings](https://uithings.com/what-is-google-stitch), [justinmckelvey](https://justinmckelvey.com/blog/google-stitch-review).
- **Claude Design:** 별도 요금 없이 구독 한도를 사용하며 extra usage로 초과 사용할 수 있다. 수치 한도는 공개되지 않았다 — [Anthropic](https://www.anthropic.com/news/claude-design-anthropic-labs).
- **기타(모두 2차, 미검증):** Magic Patterns는 약 $15~20/월(Starter $17/seat 연결제, 1,000 크레딧)이다. Banani는 약 $12/월(연결제)이다. Uizard Pro는 약 $12/월(연결제)이다. Relume Starter는 $18 또는 $26로 출처가 상충한다 — [banani 블로그 등 검색 요약](https://www.banani.co/blog/best-ai-prototyping-tools), [forasoft](https://www.forasoft.com/blog/article/ai-wireframe-tools-comparison).

### Inferences
- 1인 개발자의 최소 비용 조합은 Stitch(무료)와 Figma Starter(무료)로 탐색하고, Claude 구독(Claude Design + Claude Code)으로 구현하는 것이다. 여기에 필요할 때만 v0 Free(하루 7메시지)를 더하면 추가 고정비가 거의 없다.

### Gaps
- Magic Patterns 공식 가격 페이지는 렌더링되지 않아 확인하지 못했다. UX Pilot과 Polymet 가격도 찾지 못했다. Lovable 플랜 금액은 공식 페이지에 표기되지 않았다.

## 3. 실사용자 평가: 강점과 약점 (AI 룩, 접근성, 반응형)

### Takeaway
가장 일관된 불만은 모든 도구가 "보라 그라디언트 + Inter + 3열 아이콘 카드 + Next/Tailwind/shadcn 기본값"으로 수렴한다는 점이다. Stitch는 탐색에는 좋지만 프로덕션과 디자인 시스템 준수에는 약하다는 평이 많다. 접근성과 반응형 품질에 대한 정량 비교 자료는 찾지 못했다.

### Cited Findings
- Reddit "All vibecoded apps look the same" 스레드(2026-01, 미러로만 확인)에서는 다크 테마, 타자기 효과, 두꺼운 폰트, 그라디언트가 공통 패턴으로 지적됐다 — [reddit 미러](https://reddit.sentinel-team.org/posts/1qccb1g/snapshots/2026-01-15T02%3A51%3A22.564978Z).
- 전형적인 징후는 보라 그라디언트, Inter, 3열 아이콘 카드, 동일한 Next.js/Tailwind/shadcn 스타터다. 원인으로 Tailwind UI의 `bg-indigo-500` 기본값이 자주 거론되지만 인과는 검증되지 않았다 — [dev.to (alanwest)](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p), [prg.sh](https://scour.ing/@emschwartz/p/https://prg.sh/ramblings/Why-Your-AI-Keeps-Building-the-Same-Purple-Gradient-Website). 처방으로는 레퍼런스 스크린샷 사용, primary 색·radius·폰트 변경, 그라디언트를 최대 1개로 제한하는 방법이 제시된다 — [dev.to (alanwest)](https://dev.to/alanwest/how-to-fix-the-ai-generated-look-in-your-frontend-1ahh).
- Stitch 리뷰(2026-04-15)는 탐색과 히어로 일러스트용으로 좋다고 평가했다. 반면 레퍼런스 팔레트 무시, 업퍼케이스 금지 규칙 위반, 일반적인 corner radius가 지적됐다. 프리뷰는 사실상 read-only라 수정이 프롬프트로만 가능하고, 화면당 약 20분이 든다. 프로덕션용으로는 Figma Make, v0, Lovable, Claude Code를 추천했다 — [designproject.io](https://designproject.io/blog/google-stitch-review/). Figma export 레이어 품질이 기대에 못 미친다는 평도 있다(단일 출처) — [vantaige](https://vantaige.io/ai-tool/stitch-google).
- v0는 default shadcn 구현에 맞춰 학습돼 커스터마이즈된 컴포넌트에서 결과가 흔들릴 수 있다(공식 문서의 경고) — [v0 docs](https://v0.app/docs/design-systems-legacy).
- Lovable은 복잡한 앱 한 세션에서 $50을 넘길 수 있다. Bolt 코드가 엔지니어 스타일에 더 가깝다는 의견도 있다(비교 사이트 의견) — [automationatlas](https://automationatlas.io/answers/lovable-vs-bolt-new-2026/).
- Claude Design의 6월 업데이트는 "runaway token costs and brand-inconsistent output"을 주요 결함으로 인정하고 이를 개선했다는 보도가 있다(2차) — [technobezz](https://www.technobezz.com/news/anthropic-launches-claude-design-update-with-direct-pipeline-to-claude-code).

### Inferences
- TrendFood가 "템플릿 룩"을 피하려면 도구 선택보다 입력 통제가 중요하다. 고유 토큰(색, radius, 폰트=Pretendard), 레퍼런스 이미지, DESIGN.md/디자인 시스템 문서를 먼저 정하고 어떤 도구에든 주입하는 방식이 효과적이다.
- 사이드바 필터 + 카드 그리드, sticky CTA 2단 상세 같은 구조는 모든 도구가 쉽게 생성하므로 차별화 포인트가 아니다. 타이포그래피, 이미지 처리, 마이크로 인터랙션에서 차별화해야 한다.

### Gaps
- 도구별 접근성(WCAG)과 반응형 품질을 체계적으로 비교한 실측 자료는 찾지 못했다. HN/X 원문 스레드도 직접 확인하지 못했다.

## 4. 생성물의 소유권과 상업적 이용 조건

### Takeaway
Figma와 Lovable은 공식 약관에서 출력물 소유권을 사용자에게 준다. v0와 Stitch는 공식 약관을 확인하지 못했고 비공식 답변만 있으며, v0 무료 티어의 상업 이용 제한 여부에 대해서는 상충하는 출처가 있다.

### Cited Findings
- **Figma AI Terms:** "Customer retains all right, title, and interest in Customer's Input and Output"(Output에 code 포함)이다. 다만 Output은 unique/exclusive하지 않을 수 있고, 정확성을 보증하지 않으며, 사용자가 검토하고 필요한 권리 처리를 해야 한다. 상업 이용을 명시적으로 언급하지는 않는다. 학습 사용은 "Content Training" 설정에 따른다 — [Figma AI Terms](https://www.figma.com/legal/ai-terms/).
- **Lovable:** 코드, 앱, AI output은 사용자 소유이며 기반 모델의 제3자 권리에 따른다 — [Lovable pricing FAQ](https://lovable.dev/pricing).
- **v0:** Vercel 스태프가 커뮤니티에서 "no ownership… do not restrict you from using it for commercial purposes"라고 답했다(비공식). 같은 스레드에는 AI 사용 정책이 개인/내부 업무용이라는 반론이 있다 — [Vercel community](https://community.vercel.com/t/use-of-v0-dev-for-commercial-purposes/14999). Apache 재단 검토는 v0 Free/Hobby를 비상업 제한(Category X)으로 분류했다 — [Apache](https://apache.org/legal/generative-tooling-terms-reviewed.html). 별개로, Vercel Hobby 호스팅은 상업 이용이 제한된다(같은 스레드). AdSense와 쿠팡 제휴 수익이 있는 TrendFood는 Hobby 배포 대상이 아닐 수 있다.
- **Stitch:** Google 포럼 응답자가 "full freedom to download and use your designs"라고 했다(비공식). 공식 약관은 확인하지 못했다 — [Google AI forum](https://discuss.ai.google.dev/t/using-stitch-and-its-features/142128).
- **Claude Design / Claude Code:** 이번 조사에서는 출력 소유권 조항을 직접 확인하지 못했다(Gaps).

### Inferences
- 수익형 사이트라면 최종 코드가 Claude Code로 작성되고 사용자 레포에 커밋되는 구조가 라이선스 리스크를 가장 줄인다. 생성 도구 출력은 참고용으로만 쓰는 것이다. v0를 쓴다면 유료 플랜이 무난하다.

### Gaps
- v0 공식 ToS/AI Policy 원문, Google Labs Stitch 약관, Anthropic 소비자/상업 약관의 출력 조항, Magic Patterns/Subframe 약관은 이번 조사에서 확인하지 못했다.

## 5. 한국어 관련 참고사항 (Pretendard, word-break: keep-all)

### Takeaway
어떤 도구도 한국어 타이포그래피 기본값을 공식적으로 다루지 않는다(확인된 자료 없음). 따라서 Pretendard와 `word-break: keep-all`은 프로젝트 전역 설정(layout/globals.css, 디자인 시스템 문서)으로 강제하고 생성 도구 입력에 명시해야 한다.

### Cited Findings
- `word-break: keep-all`은 CJK 글자 사이 줄바꿈 기회를 억제하고, 라틴 단어는 여전히 공백에서 줄바꿈된다 — [예시 페이지](https://easymaking-site.pages.dev/pretext-lab/07-word-break.html). W3C 논의에서는 한국어에 `:lang(ko) { word-break: keep-all }` 패턴이 제시됐고, 입력 필드 등에서는 주의가 필요하다는 점도 언급됐다 — [W3C www-international](https://lists.w3.org/Archives/Public/www-international/2015JanMar/0113.html), [csswg issue 4285](https://github.com/w3c/csswg-drafts/issues/4285).
- 생성 UI가 기본으로 Inter를 쓰는 경향은 "AI 룩"의 징후로 꼽힌다 — [dev.to](https://dev.to/alanwest/why-every-ai-built-website-looks-the-same-blame-tailwinds-indigo-500-3h2p).

### Inferences
- Inter 기본값에서는 한글이 시스템 폰트로 폴백돼 플랫폼마다 렌더링이 달라질 가능성이 크다. `next/font/local`로 Pretendard(가변/서브셋)를 로드하고 Tailwind `font-sans`에 연결하는 것이 좋다. 여기에 `html:lang(ko)`에 `word-break: keep-all; overflow-wrap: anywhere`(긴 URL/영문 대비)를 전역으로 지정한다. 이 설정을 Claude Design 디자인 시스템이나 Stitch DESIGN.md에 넣어 두면 생성물에 일관되게 반영될 것으로 추정된다(미검증).
- 한글은 라틴보다 글리프 폭이 넓고 정보 밀도가 높다. 그래서 영어 프롬프트로 생성한 카드 그리드나 사이드바는 줄바꿈과 truncate에서 깨지기 쉽다. 생성할 때부터 실제 한국어 카피(레시피명, 재료명)를 넣어 검증해야 한다.

### Gaps
- v0, Stitch, Claude Design 등 각 도구의 한글 렌더링과 한국어 프롬프트 처리 품질을 비교한 자료는 찾지 못했다. Pretendard 라이선스(SIL OFL로 알려짐)는 이번에 출처를 확인하지 않았다.

## 6. 2026년 인디 개발자 워크플로 조합

### Takeaway
실사용 사례와 리뷰에서 반복되는 패턴은 "탐색 도구(Stitch/Claude Design/Figma)로 방향을 정하고, MCP나 번들로 Claude Code·Cursor에 전달한 뒤, shadcn 코드베이스에서 마감"하는 것이다. TrendFood에는 Claude Design(또는 Stitch) → Claude Code + shadcn registry/토큰 → 필요 시 v0로 개별 블록 생성하는 조합이 적합하다.

### Cited Findings
- Stitch MCP와 Claude Code를 연동해 "23분 만에 디자인을 코드로" 옮긴 사례가 있고, DESIGN.md로 토큰을 이식했다 — [Pillitteri](https://pasqualepillitteri.it/en/news/647/google-stitch-mcp-export-claude-code-design-to-code).
- "Design in Stitch, build in Bolt" 류의 조합 사례가 있다(Bolt 호스팅 블로그, 2026-05-20) — [bolt.host blog](https://amlr-compliance-soft-j7n7.bolt.host/blog/design-in-stitch-build-in-bolt).
- Claude Design → handoff bundle → Claude Code(로컬 또는 Web) 흐름이 있다 — [Anthropic](https://www.anthropic.com/news/claude-design-anthropic-labs), [dev.to 가이드](https://dev.to/jangwook_kim_e31e7291ad98/claude-design-developer-guide-to-anthropics-prototyping-tool-1nc2).
- Figma 캔버스 ↔ Claude Code는 MCP(읽기, Code Connect, 캔버스 쓰기)로 양방향 연결된다 — [Figma MCP docs](https://developers.figma.com/docs/figma-mcp-server/). Magic Patterns → MCP → Cursor/Claude Code 흐름이 "most common handoff"다 — [Magic Patterns docs](https://www.magicpatterns.com/docs/documentation/exporting/overview).
- Claude Code에서 "UI slop"을 줄이는 커뮤니티 skill과 CLI가 나오고 있다(예: unslop-ui skill) — [skillsmp](https://skillsmp.com/creators/iamneilroberts/claude-skills/skills-unslop-ui), [dev.to](https://dev.to/alexander_mia_9/i-got-sick-of-my-claude-code-ui-slop-so-i-crystallized-it-into-a-go-cli-2hni).

### Inferences
- TrendFood 권장안(추정)은 다음과 같다.
  1. 시각 방향 탐색은 Stitch(무료)나 Claude Design으로 2~3개 무드를 비교한다. Pretendard, 실제 한국어 카피, 음식 사진 레퍼런스를 입력한다.
  2. 고른 방향을 `globals.css` 토큰(shadcn CSS 변수), radius, 폰트, DESIGN.md로 고정한다.
  3. 구현은 Claude Code가 기존 레포에서 shadcn 컴포넌트로 진행한다. 이미 설치된 `frontend-design`, `vercel:shadcn` skill을 활용한다.
  4. 개별 블록(필터 사이드바, sticky CTA 등)은 필요할 때 v0 Free로 시안을 뽑아 GitHub/코드 복사로 반입한다.
  Lovable과 Bolt는 자체 스택과 호스팅 중심이라 기존 Next.js 레포 작업에는 이점이 적다.
- Figma 유료 seat는 디자이너 협업이 없다면 비용 대비 효용이 낮다. MCP 캔버스 쓰기도 Full seat가 필요하다.

### Gaps
- 인디 개발자 워크플로 사용 빈도에 대한 정량 데이터(설문 등)는 찾지 못했다. 사례는 개별 블로그 수준이다.
