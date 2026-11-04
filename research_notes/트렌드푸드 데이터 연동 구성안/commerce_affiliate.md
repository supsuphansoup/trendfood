# 커머스 제휴(어필리에이트) 연동 옵션 — TrendFood "부족 재료 구매" 흐름

조사일: 2026-10-29. 쿠팡파트너스 공식 도움말과 API 문서(partners.coupang.com)는 JS로만 렌더링되는 페이지라 직접 가져오지 못했습니다. 그래서 쿠팡 관련 수치 상당수는 2차 출처(블로그, SDK, 개발자 글)에 기댑니다. 신뢰도는 항목마다 따로 표시했습니다. 구현 전에 파트너스 대시보드의 "API 가이드"와 "이용약관/운영정책"을 반드시 직접 확인해야 합니다.

## 1. 쿠팡파트너스: 가입·승인, API, 수수료, 트래킹, 정책

### Takeaway
쿠팡파트너스는 가입은 바로 되지만, 누적 판매 15만원을 넘겨 최종 승인을 받아야 API가 열리고 정산도 됩니다(2차 출처 일치). API는 상품검색, 딥링크(여러 URL 일괄 변환), 골드박스, 쿠팡PL, 리포트(클릭/주문/취소/커미션, subId별)를 제공합니다. **여러 상품을 장바구니에 한 번에 담는 공식 API는 찾지 못했습니다.** 다만 24시간 쿠키 동안 같은 사용자가 산 다른 상품도 수익으로 인정된다는 설명이 일관되므로, "재료별 링크 + 24시간 내 구매 합산"이 현실적인 구조입니다.

### Cited Findings
**가입, 승인, 정산**
- 가입은 쿠팡 회원이면 무료입니다. 누적 판매액 15만원을 넘기면 쿠팡이 채널을 검토해 최종 승인하고, 그전까지는 '대기' 상태입니다. API와 정산은 최종 승인 뒤에 열린다는 설명이 있습니다(2차 출처). [choicemon](https://choicemon.com/coupang-partners-signup-guide/), [tilnote](https://tilnote.io/pages/683c144d3b88c1fc497c37f9), [yellowit](https://yellowit.co.kr/%ea%b2%80%ec%83%89%ec%97%94%ec%a7%84-%ec%b5%9c%ec%a0%81%ed%99%94/%ec%9b%8c%eb%93%9c%ed%94%84%eb%a0%88%ec%8a%a4-%ed%99%88%ed%8e%98%ec%9d%b4%ec%a7%80-%ec%a0%9c%ec%9e%91-seo-%ec%9d%b8%ed%84%b0%eb%84%b7-%ea%b2%80%ec%83%89-%ec%b5%9c%ec%a0%81%ed%99%94/%ec%bf%a0%ed%8c%a1%ed%8c%8c%ed%8a%b8%eb%84%88%ec%8a%a4-%ea%b0%80%ec%9e%85-%eb%b0%8f-%ec%88%98%ec%9d%b5%ec%a1%b0%ea%b1%b4-%ec%b6%94%ec%b2%9c%ec%9d%b8%ec%bd%94%eb%93%9c/)
- 정산은 발생 월 기준 익익월 15일이고, 최소 지급액은 1만원입니다(2차 출처). [choicemon 수익 가이드](https://choicemon.com/coupang-partners-income-guide/), [yellowit 정산](https://yellowit.co.kr/%ea%b2%80%ec%83%89%ec%97%94%ec%a7%84-%ec%b5%9c%ec%a0%81%ed%99%94/%ec%bf%a0%ed%8c%a1%ed%8c%8c%ed%8a%b8%eb%84%88%ec%8a%a4-%ec%9e%85%ea%b8%89%ec%9d%bc-%eb%b0%8f-%ec%a0%95%ec%82%b0-%ec%9d%b5%ec%9d%bc-15%ec%9d%bc-%ec%88%98%ec%9d%b5%ea%b8%88-%ec%a7%80%ea%b8%89/)
- 본인 계정으로 본인 링크를 통해 산 것은 수익으로 인정되지 않습니다. [tilnote](https://tilnote.io/pages/683c144d3b88c1fc497c37f9)

**Open API 엔드포인트(SDK README 기준)**
- 메서드는 `searchProducts(keyword, {limit, imageSize})`, `goldbox({subId, imageSize})`, `coupangPL({limit, imageSize, subId})`, `deeplink({coupangUrls, subId})`입니다. 딥링크는 URL 배열을 받아 일괄 변환합니다.
- 리포트는 `getClicksReport(startDate, endDate, subId, page)`, `getOrdersReport`, `getCommissionReport`, `getCancelsReport`입니다. 날짜 형식은 yyyyMMdd이고 조회 기간은 30일 이내입니다. 일간 리포트는 매일 15:00에 갱신됩니다. 한도를 넘기면 429를 반환합니다. [coupang-partners-sdk README](https://github.com/mooooburg-dev/coupang-partners-sdk-standalone/blob/master/README.md)
- 서드파티 MCP 문서에 따르면 골드박스 조회는 기본 10개, 최대 100개입니다. [policylayer get-coupang-goldbox](https://policylayer.com/tools/coupang-mcp-coupang/get-coupang-goldbox)
- 이번 조사에서 bestcategories 엔드포인트를 1차 출처로 확인하지 못했습니다. Gaps에 남겨 둡니다.

**호출 제한(출처끼리 충돌)**
- 과거에는 Search API가 시간당 10회였고, 이후 분당 50회로 완화됐다는 글이 있습니다. [Inflearn Q&A](https://www.inflearn.com/en/community/questions/1524872/%EC%BF%A0%ED%8C%A1-open-api%EC%97%90-%EA%B4%80%ED%95%B4%EC%84%9C)
- 한 GitHub PR은 파트너스 API 가이드 캡처를 근거로 "/products/search — 1분당 최대 50번"이라고 적었습니다. [GitHub PR #392](https://github.com/allviewkorea-byte/reelbot-pipeline/pull/392)
- 반대 사례도 있습니다. 공식 문서는 분당 50회지만 실제로는 시간당 10회로 막혔고, 넘기면 403이 나며 3회 누적 시 계정 제한 위험이 있다는 경험담입니다. [velog @shwj203](https://velog.io/@shwj203/%EC%BF%A0%ED%8C%A1%ED%8C%8C%ED%8A%B8%EB%84%88%EC%8A%A4-%EA%B2%80%EC%83%89-API-%ED%98%B8%EC%B6%9C-%EC%A0%9C%ED%95%9C-%EB%B0%8F-%EA%B0%80%EA%B2%A9-%ED%95%84%ED%84%B0%EB%A7%81-%EC%9D%B4%EC%8A%88). 이 페이지는 직접 가져오려다 504가 나서 검색 스니펫으로만 확인했습니다.
- 주의: 쿠팡 Developer Center의 2026-03-17 공지(초당 10회에서 5회로 조정)는 셀러용 Open API(WING) 공지로 보이며, 파트너스 API와는 별개일 가능성이 큽니다. [developers.coupang.com 공지](https://developers.coupang.com/ko/notices/optimization-and-adjustment-of-open-api-rate-limiteffective-march-17th2026)

**수수료율(출처끼리 충돌)**
- 거래액의 "최대 3%"이고 식품·생활용품도 약 3%, 휴대폰만 약 1%라는 설명이 있습니다. [choicemon 수익 가이드](https://choicemon.com/coupang-partners-income-guide/)
- 기본 3%에 가전 4%, 일부 뷰티 5~7%, 도서 1%, "일부 식품 1.5%"라는 계산기 사이트도 있습니다. 같은 사이트 다른 표에는 식품 5%로 적혀 있어 내부에서도 맞지 않습니다. [calcnara](https://calcnara.com/calculators/coupang-partners), [calcnara 가이드](https://calcnara.com/guides/coupang-partners-guide)
- 로켓프레시 전용 제휴 요율은 찾지 못했습니다. 검색에 나온 "로켓배송 식품 30~40%"는 셀러 입점 수수료입니다. [i-boss](https://www.i-boss.co.kr/ab-6141-58602)

**트래킹(24시간)**
- 링크를 클릭한 뒤 24시간 안에 그 상품이든 **다른 상품**이든 사면 수익으로 인정됩니다. 접속 시점부터 24시간 안의 모든 거래가 정산 대상입니다(2차 출처 여러 곳이 일치). [tilnote](https://tilnote.io/pages/683c144d3b88c1fc497c37f9), [choicemon](https://choicemon.com/coupang-partners-guide/)
- 24시간 안에 여러 파트너스 링크를 거치면 "마지막 링크 기준"이라는 커뮤니티 의견이 있으나 미확인입니다. [teamblind](https://www.teamblind.com/kr/post/쿠팡-파트너스-링크-yz8cis27)

**정책, 제재, 최근 변경**
- 2025-02-06부터 '쿠팡 방문하고 컨텐츠 더보기' 배너를 허용하지 않습니다. 본문을 가리고 클릭을 유도하는 플로팅 배너도 위반입니다. [thewordcracker](https://www.thewordcracker.com/blog/%EC%BF%A0%ED%8C%A1-%ED%8C%8C%ED%8A%B8%EB%84%88%EC%8A%A4-%EC%BF%A0%ED%8C%A1-%EB%B0%A9%EB%AC%B8%ED%95%98%EA%B3%A0-%EC%BB%A8%ED%85%90%EC%B8%A0-%EB%8D%94%EB%B3%B4%EA%B8%B0-%EB%B0%B0%EB%84%88-%EA%B8%88/)
- 2025-10: 사용자를 강제로 쿠팡으로 보내는 '납치 광고' 파트너 10여 곳을 쿠팡이 형사 고소했습니다(약관·운영정책 위반). [ZDNet Korea](https://zdnet.co.kr/view/?no=20251003142637)
- 사용자 상호작용 없이 리퍼러를 만들어 이동시키는 것은 허용되지 않습니다. 숨겨진 버튼이나 스크롤만으로 리디렉션하는 것도 위반이라는 설명이 있습니다(커뮤니티 글). [클리앙](https://www.clien.net/service/board/park/18835442)
- 2026-07 블로그가 꼽은 정지 사유 상위 5개입니다. ① 대가성 문구 누락(1위) ② 자동 클릭·실행 광고 ③ **비공식 단축 URL**(링크 클로킹·외부 단축기) ④ 자가구매·어뷰징 ⑤ 미등록 채널 홍보. 문구 예시는 "쿠팡파트너스 활동의 일환으로 수수료를 제공받습니다"입니다. [aisum 2026](https://aisum.com/ko/blog/coupang-partners-account-suspension-recovery-2026)
- 2022년부터 금지 사이트 목록을 공개하고 있습니다. 금지 사이트에서 활동하면 경고 없이 약관 제16조 2항에 따라 계약을 해지하고 수익금을 지급하지 않습니다. [네이트뉴스 2022-07](https://news.nate.com/view/20220725n12988)
- 혐오 콘텐츠 사이트에 파트너스 광고 게재를 제한한다는 보도가 있습니다(날짜 미확인). [지구인사이드](https://g9inside.com/?p=27411)

### Inferences
- **15만원 장벽 때문에 처음부터 API를 쓸 수 없습니다.** 초기에는 파트너스 웹 대시보드에서 수동으로 만든 링크나 정적 상품 매핑(재료 → 대표 상품 URL → 수동 딥링크)으로 시작해야 합니다. 15만원을 넘기면 검색·딥링크 API로 자동화하는 2단계 설계가 현실적입니다.
- 장바구니 일괄 담기 API가 없으므로, "부족 재료 N개 구매" UX는 재료마다 개별 딥링크를 걸어야 합니다. 24시간 쿠키가 다른 상품까지 합산해 주므로, **사용자가 첫 링크 하나만 클릭하고 쿠팡 안에서 나머지를 검색해 담아도 수익이 됩니다.** 그래서 "첫 재료 링크 클릭, 이후 체크리스트를 보며 쿠팡에서 담기" 흐름이 수익과 정책 양쪽에서 유리합니다. 한 번에 여러 탭을 자동으로 여는 방식은 '사용자 상호작용 없는 이동'으로 볼 소지가 있어 피해야 합니다. 클릭 1회에 탭 1개가 안전합니다(추론).
- 검색 API 한도가 시간당 10회일 가능성까지 고려하면, 실시간 사용자 요청마다 검색 API를 부르면 안 됩니다. 재료 사전 → 상품 매핑을 배치로 만들어 캐시하는 구조가 필요합니다. 가격은 바뀌므로 화면에는 "가격은 쿠팡에서 확인"이라고 표시하거나 수집 시각을 함께 보여주는 것이 안전합니다(가격 캐싱 정책은 원문으로 확인하지 못함).
- 자체 도메인 리다이렉트(/go/xxx)는 "비공식 단축 URL" 금지에 걸릴 위험이 있습니다. API가 돌려주는 link.coupang.com 링크를 그대로 쓰는 것이 안전합니다.

### Gaps
- 공식 Open API 문서 원문(엔드포인트 전체, bestcategories, 정확한 rate limit), 가격 캐싱·표시 정책, 공식 카테고리별 수수료표, AI 생성 콘텐츠 관련 2024~2026 정책 변경은 모두 1차 출처로 확인하지 못했습니다. partners.coupang.com이 SPA라 가져올 수 없었습니다.
- 공식 장바구니 일괄 담기 API는 "찾지 못함" 수준입니다. 공식적으로 없다는 확인은 아닙니다.
- 앱인앱(웹뷰) 환경에서 쿠키나 앱 전환이 트래킹되는지는 미확인입니다.

## 2. 대안과 보완: 네이버, 링크프라이스, 11번가·G마켓·컬리

### Takeaway
네이버 쇼핑 검색 API는 무료이고 하루 25,000회까지 쓸 수 있어 가격 비교나 최저가 표시에는 유용하지만, 그 자체로는 수수료가 없습니다. 네이버 '쇼핑 커넥트'(2025-07-23 정식 출시)는 스마트스토어 셀러가 정한 수수료로 크리에이터에게 링크를 발급하는 제휴 모델입니다. 다만 셀러별 캠페인 구조이고 크리에이터 자격 요건이 있어, 범용 식재료 링크 자동 생성에는 맞지 않습니다. 링크프라이스를 통한 11번가·G마켓·컬리 제휴 요율은 확인하지 못했습니다.

### Cited Findings
- 네이버 쇼핑 검색 API는 앱당 일 25,000회, display 1~100, start 최대 1000입니다. 응답에는 lprice(최저가, 문자열), mallName, brand, productId가 들어 있습니다(2차 출처. developers.naver.com은 직접 가져오지 못함). [socialcrawl 2026](https://www.socialcrawl.dev/ko/blog/naver-crawling), [glama 백과 API 문서](https://glama.ai/mcp/servers/@cola314/naver-encyc-mcp/blob/4e3e453d86479ec87802d75051cc7cf136475855/docs/api-reference.md), [glama naver-search server.py](https://glama.ai/mcp/servers/@uju777/mcp-server-naver-search/blob/f5ae4b12ac24c023aa6d0841fed9867a88eb8501/server.py)
- 네이버 쇼핑 커넥트는 2025-07-23 정식 출시됐고, 베타 때 52만개 이상의 상품이 연동됐습니다. 셀러가 할인율·수수료율·콘텐츠 발행 조건을 정합니다. [헤럴드경제](https://www.heraldk.com/article/2025072218190389988), [bizwatch](https://news.bizwatch.co.kr/article/mobile/2025/07/23/0009), [wepick](https://letter.wepick.kr/post/251)
- 커넥트 수수료 수치는 출처마다 다릅니다. "기본 5%~최대 33%"라는 블로그와 "기본 1% + 쇼핑 커넥트 사용료 5.5%(VAT 포함)"라는 셀러 쪽 설명이 서로 맞지 않습니다. [maily tiyou](https://maily.so/tiyou/posts/32z8410jrn4), [sellernow](https://sellernow.co.kr/post/499588)
- 크리에이터 자격(베타 기준)은 블로그 이웃 1천명 이상 + 전월 방문 1만 이상, 또는 인스타그램 팔로워 1만 이상 + 프로페셔널 계정입니다. 정식 출시 후 기준은 미확인입니다. [maily tiyou](https://maily.so/tiyou/posts/xyow3mq2r28)
- 2025-08-01부터 '간접 실적' 기능이 도입됐습니다. [openads](https://openads.co.kr/content/contentDetail?contsId=16943)
- 브랜드 커넥트 안의 공동구매 기능은 2026-01-05 오픈 예정으로 보도됐습니다. [ampm insight](https://inside.ampm.co.kr/insight/13705)
- 11번가·G마켓의 "수수료" 보도는 판매자 입점 수수료입니다(11번가 최대 20%, 주력 카테고리 평균 7~13%, G마켓·옥션 최대 15%). 제휴 매체 요율이 아닙니다. [newsis 2024-01](https://mobile.newsis.com/view/NISX20240116_0002593587), [이코노미스트](https://economist.co.kr/article/view/ecn202401160005)
- 컬리는 레시피 페이지에서 "레시피에 필요한 상품"으로 자사 상품을 직접 연결합니다(자체 커머스형). [kurly recipe 예시](https://www.kurly.com/recipe/678dea0985ace120f5c934e7)

### Inferences
- 현실적인 조합은 다음과 같습니다. ① 쿠팡파트너스를 주 수익원으로 둡니다. ② 네이버 쇼핑 검색 API는 가격 범위나 "다른 곳 최저가" 참고용으로 씁니다. 네이버 링크로 보내면 수수료가 없으므로 기본 동선은 쿠팡으로 둡니다. ③ 쇼핑 커넥트는 블로그나 인스타 채널 요건을 채운 뒤 특정 브랜드 협업용으로 검토합니다.
- 단일 쿠팡 의존은 계정 정지 위험이 있으므로, 링크 생성 계층을 provider 인터페이스로 추상화해 두는 것이 좋습니다(추론).

### Gaps
- 링크프라이스의 광고주 목록과 요율(11번가, G마켓, 컬리, SSG, 오아시스 등), 컬리 파트너스 프로그램이 있는지, 커넥트에 외부 API가 있는지는 모두 확인하지 못했습니다.
- 네이버 검색 API 이용약관이 결과를 상업 서비스에 표시하는 것을 어디까지 허용하는지(출처 표기 의무 등)는 원문을 확인하지 못했습니다.

## 3. 공정위 추천·보증 심사지침(2024 개정) 공개 의무

### Takeaway
2024-12-01부터 시행된 개정 지침은 "구매링크로 판매 실적에 따라 나중에 수수료를 받는 경우"를 공개 의무 대상으로 명시했습니다. 블로그 같은 문자 중심 매체에서는 제목이나 첫 부분에 표시해야 하고, "소정의 수수료를 지급받을 수 있음" 같은 조건부 문구는 쓸 수 없습니다. 2025-12-02에 Q&A 안내서 개정본이 나왔습니다.

### Cited Findings
- 시행일은 2024-12-01이고, 행정예고는 2024-08-20부터 09-09까지였습니다. [신김 뉴스레터](https://shinkim.com/kor/media/newsletter/2613), [뉴스서울](https://www.newsseoul.co.kr/news/view/1065579623819806)
- 블로그·인터넷카페 등 문자 중심 매체는 "반드시 게시물의 제목 또는 첫 부분에" 표시해야 합니다. 이전에는 끝부분 공개도 허용됐습니다. [신김](https://shinkim.com/kor/media/newsletter/2613)
- 글자를 본문보다 크게 하거나 색을 다르게 해서 눈에 띄게 해야 한다는 보도가 있습니다. 신김 요약에는 크기 기준이 없어, 지침 본문의 정확한 표현인지는 미확인입니다. [i-boss](https://www.i-boss.co.kr/ab-74668-1685), [데일리안](https://www.dailian.co.kr/news/view/899675/)
- 구매링크가 들어간 후기를 쓰고 매출 실적에 따라 나중에 대가를 받는 경우, 구매 대금을 환급받는 경우는 공개 의무가 있는 경제적 이해관계입니다. [신김](https://shinkim.com/kor/media/newsletter/2613)
- "소정의 수수료를 지급받을 수 있음"은 명확하지 않은 표시 문구의 예입니다. [신김](https://shinkim.com/kor/media/newsletter/2613)
- 2025-12-02 안내서 개정본은 4대 원칙(접근성, 인식가능성, 명확성, 언어 동일성)과 25개 Q&A, 블로그·인스타·유튜브·틱톡 예시를 담았습니다. [아주경제](https://www.ajunews.com/view/20251202085042877), [뉴스서울](https://newsseoul.co.kr/news/view/1065583816365047)

### Inferences
- TrendFood에 적용하면 다음과 같습니다. 구매 링크가 있는 레시피 상세나 재료 체크리스트 영역의 상단, 그리고 "구매하기" 버튼 근처에 확정형 문구를 넣습니다. 예: "이 페이지의 구매 링크는 쿠팡파트너스 활동의 일환으로, 구매 시 TrendFood가 일정액의 수수료를 받습니다." 글자는 본문 이상 크기나 대비색으로 하고, 푸터에만 두면 안 됩니다. 쿠팡 운영정책의 대가성 문구 요구와 공정위 요구를 동시에 충족해야 합니다.
- 큐레이션 서비스가 직접 운영하는 사이트가 "제3자 추천"에 해당하는지는 해석의 여지가 있습니다. 그래도 쿠팡이 문구 누락을 정지 사유 1위로 보고 있어 표시는 필수로 취급해야 합니다.

### Gaps
- 웹 서비스 UI(버튼, 모달)에 대한 구체적 예시와 글자 크기 기준은 공정위 원문(예규·안내서 PDF)에서 확인하지 못했습니다.

## 4. 다재료 구매 UX 사례(국내외)

### Takeaway
해외에서는 Instacart가 "레시피 재료를 원클릭으로 장바구니에" 담는 shoppable recipe와 제휴(약 3%, 7일 쿠키)를 운영합니다. 다만 API 수준 통합은 별도 Developer Platform 경로입니다. 국내에서는 컬리처럼 자체 몰에 레시피를 연결하는 사례가 대부분이고, 외부 몰과 제휴해 다재료를 일괄로 담는 사례는 확인하지 못했습니다.

### Cited Findings
- Instacart shoppable recipe는 독자가 모든 재료를 한 번의 클릭으로 장바구니에 담게 해 줍니다. 제휴 수수료는 적격 구매의 3%(파일럿)이고 쿠키는 7일입니다. 다른 곳에서는 5% + 신규 고객 보너스로 표기되며 Impact 프로모션에 따라 달라집니다. [wptasty](https://www.wptasty.com/instacart-shoppable-recipes), [instacart affiliate](https://instacart.com/affiliate), [jupiter](https://www.jupiter.co/blog/instacart-affiliate-for-food-creators), [Instacart Tastemakers](https://company.instacart.ca/updates/introducing-instacart-tastemakers-a-new-way-to-inspire-your-audience-and-monetize-your-content)
- Instacart Developer Platform(2024-03 공개)은 레시피·식단 앱용 API 통합 경로입니다. [Digital Commerce 360](https://www.digitalcommerce360.com/2024/03/27/instacart-api-idp-developer-platform/amp/)
- 만개의레시피는 장보기 메모와 '만개 스토어'(자체 스토어)를 운영합니다. [App Store](https://apps.apple.com/kr/app/id494190282)
- 컬리 레시피 페이지에는 재료 목록과 "레시피에 필요한 상품" 섹션이 있습니다. [kurly recipe](https://www.kurly.com/recipe/6720460d512b7f58a373eaa6)
- '요리조리' 앱은 레시피 재료를 장바구니(앱 내 목록)에 바로 추가하는 기능을 홍보합니다. [App Store 요리조리](https://apps.apple.com/us/app/%EC%9A%94%EB%A6%AC%EC%A1%B0%EB%A6%AC-%EB%82%98%EB%A7%8C%EC%9D%98-%EB%A0%88%EC%8B%9C%ED%94%BC%EB%B6%81/id6740079897?l=ko)

### Inferences
- 국내 외부 제휴형에서 현실적인 UX는 다음 순서입니다. "보유 재료 체크 → 부족 재료 리스트(앱 내 장보기 목록) → 재료별 '쿠팡에서 보기' 버튼(각각 딥링크) → 리스트 복사/공유". Instacart식 진짜 일괄 담기는 쿠팡 API로는 재현할 수 없습니다(쿠팡 cart API 미확인).

### Gaps
- 우리의식탁, 쿠캣, SideChef, Samsung Food(Whisk)의 구체적 구매 흐름은 이번에 확인하지 못했습니다.

## 5. 단위 경제성

### Takeaway
식재료 제휴 수익은 주문당 수백원에서 1~2천원 수준으로 매우 작아서, 트래픽 규모가 있어야 의미가 있습니다. 공개된 전환율 벤치마크는 찾지 못했습니다.

### Cited Findings
- 쿠팡 식품 요율은 출처에 따라 1.5%~3%(일부 5%)입니다. [choicemon](https://choicemon.com/coupang-partners-income-guide/), [calcnara](https://calcnara.com/calculators/coupang-partners)
- Instacart는 약 3%입니다. [jupiter](https://www.jupiter.co/blog/instacart-affiliate-for-food-creators)

### Inferences
- 예시 계산(가정값): 부족 재료 3개, 합계 3만원, 요율 3%이면 주문당 900원입니다. 1.5%이면 450원입니다. 24시간 쿠키 덕에 장바구니 전체(예: 로켓프레시 최소 주문 금액에 맞춘 5만원)가 잡히면 750~1,500원입니다. 클릭 대비 구매 전환율을 가정하는 것은 근거가 없습니다(Gap). 월 1만 클릭에 전환율을 가정한 시뮬레이션은 calcnara 계산기 수준의 참고용에 그칩니다.

### Gaps
- 레시피·식재료 제휴의 클릭→구매 전환율, 평균 주문 금액에 대한 국내 공개 벤치마크는 찾지 못했습니다.
