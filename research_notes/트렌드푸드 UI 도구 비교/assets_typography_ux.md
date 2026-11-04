# TrendFood 비주얼 에셋 · 타이포그래피 · UX 레퍼런스 (조사일 2026-11-04)

> 표기: **[미검증]** = 이번 조사에서 1차 출처로 확인하지 못함(학습 지식 또는 2차 출처만). 가격은 USD, 조사 시점 기준.

## 1. 음식 이미지 소스 (AI 생성 / 스톡 / 자체 촬영) 및 SEO·AdSense·AI기본법

### Takeaway
카드 썸네일 대량 생산은 AI 생성(Nano Banana 계열·FLUX.2·gpt-image-2, 장당 약 $0.02~0.07)이 가장 싸다. 단 한식 정확도는 사람이 검수해야 하고, IPTC `trainedAlgorithmicMedia` 메타데이터를 유지하며 화면에 "AI 생성 이미지" 표시를 자율적으로 다는 것이 안전하다. 대표 메뉴처럼 반복 노출되는 이미지는 Unsplash/Pexels나 자체 촬영으로 섞는 구성을 권한다.

### Cited Findings
**AI 이미지 생성 - 가격**
- OpenAI gpt-image-2는 이미지당 요금이 아니라 토큰 과금이다. 텍스트 입력 $5/1M, 이미지 입력 $8/1M, 이미지 출력 $30/1M이고 Batch는 절반이다(OpenAI 가격표를 옮긴 2차 출처). 1024×1024 1장은 품질에 따라 약 $0.006~$0.211 — [pricepertoken](https://pricepertoken.com/gpt-image-pricing), [wavespeed 2026 가이드](https://wavespeed.ai/blog/posts/gpt-image-2-pricing-2026/) **[공식 페이지 미확인]**
- OpenAI는 gpt-image-1을 2026-10-23에 종료했고, gpt-image-1.5·gpt-image-1-mini는 2026-12-01에 종료한다. 대체 모델은 gpt-image-2 — [developersdigest](https://www.developersdigest.tech/models/image-generation/openai) **[2차 출처]**. 신규 구현은 gpt-image-2로 시작해야 한다.
- Google Gemini API 이미지 가격(Google 가격 페이지를 2026-09-11에 인용한 집계 사이트 기준)은 다음과 같다 — [simplemetrics](https://simplemetrics.xyz/how-much-per-image-is-nano-banana-and-nano-banana-pro/), [anotherwrapper](https://anotherwrapper.com/tools/llm-pricing/image-models/gemini-25-flash-image-nano-banana) **[2차 출처]**
  - Nano Banana(Gemini 2.5 Flash Image): $0.039/장, Batch $0.0195
  - Nano Banana 2(Gemini 3.1 Flash Image): 0.5K $0.045, 1K $0.067, 2K $0.101, 4K $0.151
  - Nano Banana Pro(Gemini 3 Pro Image): 1K/2K $0.134, 4K $0.24
  - "Nano Banana 2.1"과 "2 Lite"가 1K $0.0336으로 언급되지만 출처마다 이름이 다르다 — [origami.sa](https://origami.sa/en/blog/nano-banana-2-1-price-per-image/) **[상충·미검증]**
- Imagen 4 Fast는 약 $0.02/장, Ultra는 $0.07~0.12로 보고된다 — [laozhang blog](https://blog.laozhang.ai/en/posts/gemini-image-cheapest-api-2026) **[2차 출처, 2026-03]**
- FLUX.2(Black Forest Labs)는 메가픽셀 단위 크레딧 과금이다(1 credit = $0.01). FLUX.2 [pro] 1장은 "from $0.03" — [BFL pricing docs](https://docs.bfl.ai/quick_start/pricing.md). 한 블로그는 Pro를 $0.05로 적어 수치가 상충한다 — [flowith](https://flowith.io/blog/flux-2-pro-pricing-2026-dev-vs-pro-vs-schnell-api)
- Midjourney는 공식 API가 없고 구독형이다. 무료 체험 생성물은 비상업 용도로만 쓸 수 있고, 연매출 $1M 초과 기업은 Pro/Mega 플랜이어야 상업 이용이 가능하다. Stealth 모드는 Pro/Mega 전용 — [terms.law 2026 가이드](https://terms.law/2026/01/15/midjourney-commercial-use-rights-complete-2026-guide/) **[2차 출처, MJ 약관 원문 미확인]**
- Ideogram·Recraft의 가격과 상업 이용 조건은 이번 조사에서 확인하지 못했다(Gaps 참조).

**스톡 사진**
- Unsplash License: 상업적 무료 사용이 가능하다. 다만 수정 없이 판매하는 것과, 사진을 모아 유사·경쟁 서비스를 만드는 것(대량 스크래핑 등)은 금지된다 — [unsplash.com/license](https://unsplash.com/license), [Unsplash Help](https://help.unsplash.com/en/articles/2612331-why-can-t-i-compile-photos-from-unsplash-to-replicate-a-similar-or-competing-service). Unsplash+는 별도 유료 라이선스다 — [Unsplash+ License](https://unsplash.com/plus/license)
- Pexels: 사진·영상을 상업 웹사이트에서 무료로 쓰고 수정할 수 있다. 저작권은 촬영자에게 남는다. 상품·서비스 홍보에 쓸 때 식별 가능한 인물이 나오면 별도 동의가 필요할 수 있다 — [Pexels ToS](https://pexels.com/terms-of-service), [Pexels Help](https://help.pexels.com/hc/en-us/articles/360042295214)
- Shutterstock Standard 10장/월은 약 $29/월로 보고된다 — [licenseorg 비교](https://licenseorg.com/compare/pexels-vs-shutterstock) **[2차 출처, 한국 원화 요금 미확인]**. 게티이미지코리아 요금도 확인하지 못했다.

**AI기본법(한국) 표시 의무**
- 「인공지능 발전과 신뢰 기반 조성 등에 관한 기본법」과 시행령은 2026-01-22부터 시행 중이다. 생성형 AI 결과물에는 가시적 표시나 워터마크·메타데이터로 표시해야 한다. 의무 주체는 **AI 사업자**(서비스 제공자)이고 이용자가 아니다. 위반 시 시정명령을 거쳐 과태료 최대 3,000만 원이며, 1년 이상의 계도기간이 운영된다 — [뉴시스 2026-01-21](https://www.newsis.com/view/NISX20260121_0003484769), [로톡 가이드라인 정리](https://www.lawtalk.co.kr/posts/161692)
- 창작도구를 활용한 이용자(예: AI 웹툰 창작자)는 표시 의무에서 제외된다는 보도가 있다 — [webtoonguide](https://www.webtoonguide.com/ko/board/news-column/25440), [newsis](https://mobile.newsis.com/view/NISX20260121_0003484769)
- 과기정통부는 '인공지능 투명성 확보 가이드라인'을 공개했다 — [로톡](https://www.lawtalk.co.kr/posts/161692)
- 2026-10 기준으로 "워터마크는 지우면 그만"이라는 지적과 함께 C2PA·비가시 워터마크 강화를 위한 시행령 개정 논의가 있다 — [ZDNet 2026-10-20](https://zdnet.co.kr/view?no=20261020095628)

**Google 이미지 SEO / Merchant / AdSense**
- Google Merchant Center는 AI 생성 상품 이미지에 IPTC `DigitalSourceType = trainedAlgorithmicMedia` 메타데이터를 유지하도록 요구하고 제거를 금지한다(2024-02-19부터) — [Google Merchant Help](https://support.google.com/merchants/answer/14743464), [Search Engine Land](https://searchengineland.com/google-wants-you-to-label-ai-generated-images-used-in-merchant-center-437645)
- Google은 이미지 메타데이터를 지우지 말라고 퍼블리셔에게 권고했다. "About this image" 기능에서 Digital Source Type이 노출된다 — [IPTC 뉴스](https://iptc.org/news/google-reminds-publishers-and-merchants-not-to-strip-metadata-from-images/)
- AdSense 정책 가운데 AI 이미지를 특정해 다루는 조항은 찾지 못했다(Gaps).

### Inferences
- TrendFood가 직접 AI로 생성한 이미지를 자사 사이트에 게시하는 경우, 법상 표시 의무는 1차적으로 모델 제공사(OpenAI·Google 등)에 있다고 보인다. 다만 TrendFood가 생성 기능을 이용자에게 제공하면 AI 사업자로 분류될 수 있다. 저비용 리스크 회피책으로 ① 카드에 작은 "AI 이미지" 배지 ② IPTC/C2PA 메타데이터 보존(Next.js·Cloudflare 변환 과정에서 메타데이터가 제거되는지 확인 필요)을 권한다. **[법률 해석 아님]**
- 카드 300개를 장당 약 $0.04로 만들면 약 $12다. 비용보다 한식 정확도 검수(떡볶이 소스 색, 반찬 구성, 젓가락·숟가락 배치)에 드는 시간이 병목이다. 1차 후보는 Nano Banana 2(1K)나 FLUX.2 pro이고, 비교 시에는 같은 프롬프트로 10종 한식 A/B 테스트를 권한다.
- "레시피 결과물과 다른 이미지"는 사용자 오인 리스크가 있으므로 "이미지는 예시입니다" 문구를 권한다.

### Gaps
- OpenAI·Google·BFL 공식 가격 페이지를 직접 열지 못해 가격은 대부분 2차 출처다. 결제 전 공식 페이지 재확인이 필요하다.
- Ideogram, Recraft의 가격과 상업 조건은 미조사다.
- AI 모델별 한식 정확도에 대한 정량 비교 자료는 찾지 못했다.
- 시행령 원문의 '표시' 기술 기준과 과태료 부과 개시일을 확인하지 못했다. [법제처](https://www.law.go.kr) 원문 확인이 필요하다.
- AdSense 프로그램 정책과 AI 이미지의 관계는 미확인이다.

## 2. 이미지 전송/최적화 (Vercel vs Supabase vs Cloudflare)

### Takeaway
초기 트래픽에서는 Vercel 기본 Image Optimization으로 충분하다. 단 Hobby는 상업 이용이 금지되므로, AdSense·쿠팡 수익화 사이트는 Pro가 전제다. Supabase 변환은 원본당 $5/1K로 가장 비싸다. 대안으로는 원본을 업로드 시점에 미리 리사이즈(WebP/AVIF)해 Supabase Storage나 R2에 두고 `unoptimized`로 서빙하거나, Cloudflare Images(무료 5K 변환/월)를 쓰는 방법이 가장 싸다.

### Cited Findings
- Vercel(문서 갱신일 2026-08-11) 단가: 변환 $0.05~0.0812/1K, 캐시 읽기 $0.40~0.64/1M, 캐시 쓰기 $4.00~6.40/1M(8KB 단위). Hobby 포함량은 변환 5K, 읽기 300K, 쓰기 100K/월이다. 변환은 cache MISS/STALE마다 과금되고, 전송에는 Fast Data Transfer·CDN Requests 요금이 별도로 붙는다 — [Vercel Docs](https://vercel.com/docs/image-optimization/limits-and-pricing)
- Vercel Hobby는 개인 비상업 용도로 제한된다. 한도를 넘으면 새 이미지는 402 에러를 받고, 기존 캐시 이미지는 계속 제공된다. 지원 원본 포맷은 jpeg/png/webp/avif, 최대 8192px — [Vercel Docs](https://vercel.com/docs/image-optimization/limits-and-pricing)
- Vercel은 이미지가 한 달 안에 바뀌지 않는다면 `max-age=2678400`(31일)로 변환·쓰기를 줄이라고 권장한다 — [Vercel KB](https://vercel.com/kb/guide/reduce-image-optimization-costs-on-vercel)
- Supabase Image Transformations는 Pro 플랜 이상에서만 쓸 수 있다. 원본 이미지 100장/월이 포함되고 초과분은 **$5 per 1,000 origin images**다. 최대 2500px, 25MB, 50MP — [Supabase Docs](https://supabase.com/docs/guides/storage/serving/image-transformations)
- Cloudflare Images(갱신일 2026-10-19): Free 플랜은 고유 변환 5,000건/월이고, 초과 시 에러 9422가 나며 과금되지 않는다. Paid는 $0.50/1K 변환, 저장 $5/100K장/월, 전송 $1/100K장이다. R2 등 외부 원본은 Free 플랜으로도 변환할 수 있고, Images 내부 저장은 Paid 전용이다 — [Cloudflare Docs](https://developers.cloudflare.com/images/pricing/)
- 사용자 일화로 Supabase 변환 대신 썸네일을 직접 생성해 비용을 크게 절감했다는 사례가 있다 — [Reddit r/Supabase 2025-03](https://redlib.hbubli.cc/r/Supabase/comments/1j67qqt/does_anyone_feel_like_the_transformation_is_way) **[일화, 2025]**

### Inferences
- 레시피 이미지 300~1,000장 × 사이즈 4종(next/image `sizes`) 정도면 변환 수천 건 수준이다. Vercel Pro 포함량 안에 들어갈 가능성이 높다. `images.minimumCacheTTL` 확대와 `deviceSizes` 축소로 변형 수를 줄이는 것이 핵심이다.
- 가장 싸고 단순한 구성: 생성 파이프라인에서 sharp로 640/1080 WebP를 미리 만든다 → Supabase Storage public bucket(또는 R2)에 저장한다 → `<Image unoptimized>` 또는 커스텀 loader로 서빙한다. 이렇게 하면 변환 비용이 0이다.

### Gaps
- Vercel Pro 플랜의 포함량은 공식 표에 Hobby만 있어 확인하지 못했다(2차 출처는 200K 쓰기라고 함).
- Supabase Storage egress 단가도 이번에 확인하지 못했다.

## 3. 한글 타이포그래피

### Takeaway
기본 선택은 Pretendard Variable(OFL)을 dynamic subset 또는 `next/font/local`로 셀프호스팅하는 것이다. 대안은 SUIT(OFL)다. 본문에는 `word-break: keep-all`, 헤드라인에는 `text-wrap: balance`, 문단에는 `pretty`를 점진적 향상으로 적용한다.

### Cited Findings
- Pretendard는 SIL OFL 1.1이다. 상업 사용·수정·재배포가 자유롭고, 폰트 단독 판매만 금지된다 — [npm pretendard](https://npmjs.com/package/pretendard), [README(jsDelivr)](https://cdn.jsdelivr.net/npm/pretendard@1.3.9/docs/en/README.md)
- Pretendard는 Google Fonts 한글 방식과 같은 dynamic subset CSS를 제공한다. 예: `https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css`(경로 패턴은 출처 기준, 정확한 최신 버전 태그는 **[미검증]**). jsDelivr를 권장하고 cdnjs·UNPKG도 쓸 수 있다. 셀프호스팅 시 OFL 헤더를 유지해야 한다 — [GitHub orioncactus/pretendard](https://github.com/orioncactus/pretendard/blob/main/dist/web/static/pretendard-dynamic-subset.css)
- SUIT는 OFL이고 본고딕(Source Han Sans) 기반이다. woff2 200KB 미만으로 웹용에 맞춰 설계됐다 — [GitHub sun-typeface/SUIT](https://github.com/sun-typeface/SUIT), [freekoreanfont](https://www.freekoreanfont.com/?p=1086)
- Spoqa Han Sans Neo·Wanted Sans·Noto Sans KR은 모두 OFL로 알려져 있다. Noto Sans KR은 Google Fonts를 통해 `next/font/google`로 쓸 수 있다 — **[미검증: 이번 조사에서 라이선스 원문 미확인]**
- `text-wrap: pretty`: Chrome/Edge 117+, Safari 26+(2025-04 STP 216에서 먼저 도입) — [WebKit blog](https://webkit.org/?p=16547), [savvy.co.il](https://savvy.co.il/en/blog/css/css-text-wrap-pretty-balance/). Firefox 지원 여부는 출처마다 상충한다(134 지원이라는 출처와 미지원이라는 출처가 공존) — [camoa 가이드](https://camoa.github.io/dev-guides/css/modern-css/text-wrap)
- `word-break: keep-all`은 CJK용으로 오래 지원돼 왔다. 다만 `lang="ko"` 요소에만 적용하는 것이 관례이고, 입력 폼처럼 언어가 정해지지 않은 영역에는 한계가 있다(2015 W3C 논의) — [W3C www-style](https://lists.w3.org/Archives/Public/www-style/2015Mar/0050.html)
- `word-break: auto-phrase`는 Chrome 119+에서 BudouX 기반으로 **일본어에만** 적용되고 한국어에는 효과가 없다고 알고 있다 — **[미검증, 학습 지식]**

### Inferences
- 권장 CSS: `:lang(ko){word-break:keep-all; overflow-wrap:anywhere}`, `h1,h2,.card-title{text-wrap:balance}`, `p{text-wrap:pretty}`. 미지원 브라우저에서는 무시되므로 안전하다.
- `next/font/local`에 PretendardVariable.woff2(약 2MB급) 전체를 넣으면 LCP에 불리하다. dynamic subset CDN을 `<link>`로 쓰거나 KS X 1001 2,350자 서브셋을 직접 만드는 쪽이 낫다. **[용량 수치 미검증]**

### Gaps
- Pretendard 최신 릴리스 버전과 2026 업데이트 여부를 확인하지 못했다.
- Wanted Sans·Spoqa Han Sans Neo의 라이선스 원문을 확인하지 못했다.
- `text-wrap`에 대해 caniuse 최신 표를 직접 확인하지 못했다.

## 4. 아이콘 · 일러스트 · 이모지

### Takeaway
UI 아이콘은 Lucide(shadcn 기본값)를 쓰고, 음식 카테고리 칩에는 Tossface 이모지(재배포 시 고지만 하면 웹 사용 가능)나 Fluent Emoji를 쓰는 것이 가장 저비용이다.

### Cited Findings
- Tossface 라이선스: 자유로운 사용·연구·재배포가 허용된다. 금지 사항은 단독 판매, 부적절한 목적의 사용, **무단 변형판 제작**, 저작권자 이름을 쓴 홍보다. 재배포 시 저작권 고지와 라이선스 전문을 함께 넣어야 하고, 위반 시 사용 권한이 소멸한다 — [GitHub toss/tossface LICENSE](https://raw.githubusercontent.com/toss/tossface/main/LICENSE)
- Tossface는 Unicode 14.0 이모지 전체를 ttf/otf/woff/woff2로 제공하며, 마지막 push는 2024-01이다 — [awesome.ecosyste.ms](https://awesome.ecosyste.ms/projects/github.com%2Ftoss%2Ftossface)
- Lucide(ISC), Phosphor(MIT), Tabler Icons(MIT), Microsoft Fluent Emoji(MIT, 3D/Flat/High Contrast 제공) — **[미검증: 이번 조사에서 라이선스 페이지 미확인. 각 GitHub LICENSE 확인 필요]**

### Inferences
- Tossface의 "무단 변형 금지" 조항 때문에 SVG를 재채색하거나 합성하는 용도에는 Fluent Emoji(MIT로 알려짐)가 더 안전하다.
- Tossface는 Unicode 14까지만 포함한다(2024 이후 갱신 없음). 신규 이모지가 필요하면 다른 폰트로 대체(fallback)해야 한다.

### Gaps
- Lucide/Phosphor/Tabler/Fluent 라이선스 원문, 3D 아이콘 세트(예: 3dicons.co 등)의 조건을 확인하지 못했다.

## 5. 디자인 레퍼런스 소스와 레시피 UX 패턴

### Takeaway
Mobbin(Pro 약 $10~14/월, 수치 상충)으로 배민·컬리·오늘의집 등의 실제 화면을 수집하고, 레시피 상세에는 ① 하단 고정 "재료 장바구니 담기" CTA ② Screen Wake Lock 기반 요리 모드 ③ 인분 조절을 기본 패턴으로 삼는다.

### Cited Findings
- Mobbin 요금제는 Free/Pro/Team/Enterprise로 구성된다. Pro는 $10/월(연간 결제)이라는 출처와 $14라는 출처가 상충한다. Team은 2026-07에 $12에서 $16/인/월(연간)로 인상됐다는 보고가 있다 — [pricingsaas W28 2026](https://pricingsaas.com/companies/mobbin/diffs/2026W28), [toolradar](https://toolradar.com/tools/mobbin/pricing) **[공식 페이지 미확인]**
- Mobbin의 한국 앱 수록 범위, Page Flows 가격, TDS 공개 자료, 우아한형제들·컬리·오늘의집 블로그의 구체 글은 이번 조사에서 확인하지 못했다(Gaps). 참고용 URL은 [toss.tech](https://toss.tech), [techblog.woowahan.com](https://techblog.woowahan.com), [helloworld.kurly.com](https://helloworld.kurly.com) — **[개별 글 미검증]**
- Screen Wake Lock API는 Baseline 2025(Newly available, 2025-03부터 주요 최신 브라우저 지원)다. HTTPS에서만 동작하고, 탭이 숨겨지면 자동 해제되므로 `visibilitychange`에서 다시 요청해야 한다. `release` 이벤트로 UI를 갱신한다 — [MDN Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API). iOS Safari는 16.4부터 지원된다는 것은 **[미검증]**이다.

### Inferences
- 레시피 상세 UX 체크리스트:
  - 재료 섹션이 화면 밖으로 나가면 하단 sticky CTA("재료 n개 쿠팡에서 담기")를 띄운다. 쿠팡 파트너스 고지 문구도 함께 둔다.
  - 요리 모드 토글은 Wake Lock을 쓰고, 미지원 브라우저에서는 토글을 숨긴다.
  - 단계별 타이머는 `setInterval`과 남은 시간 계산(백그라운드 탭 지연 보정)으로 구현하고, 종료 알림은 진동 또는 사운드로 준다.
  - 인분 조절은 재료 수량을 분수 단위로 반올림한다(예: 1.5큰술).
- AI 이미지 배지와 쿠팡 파트너스 고지가 한 카드에 겹치지 않도록 레이아웃 슬롯을 미리 설계한다.

### Gaps
- Mobbin 한국 앱(배민·컬리·토스·오늘의집) 수록 여부, Page Flows 요금, TDS 공개 범위(디자인 가이드나 Figma 공개 여부)를 이번 도구 호출 예산 안에서 확인하지 못했다. 후속 조사가 필요하다.
- 한국 레시피 앱(만개의레시피, 쿡패드 KR 등)의 sticky CTA 사례 캡처는 확보하지 못했다.
