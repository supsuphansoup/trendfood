# 트렌드 키워드 데이터 소스 (TrendFood 급상승 레시피 키워드 파이프라인용)

조사일: 2026-10-29. developers.naver.com 과 naver.github.io/searchad-apidoc 본문은 이 환경에서 직접 가져오지 못했다(fetch 차단/빈 페이지). 따라서 네이버 관련 수치는 NCP(네이버클라우드) 공식 문서와 2026년 국내 실무 블로그를 기준으로 정리했다. "[미확인]" 표시는 1차 출처로 확인하지 못한 내용이다.

## 1. Naver DataLab Open API (검색어 트렌드, 쇼핑인사이트)

### Takeaway
DataLab은 실제 검색 횟수가 아니라 상대 지수(ratio, 요청 내 최댓값=100)를 준다. 중요한 변경이 있다. 2026-07-31부터 신규 신청은 NAVER API HUB(NCP)로만 받는다. 한도는 API별 월 50,000건이고, 지금은 한시 무료지만 나중에 종량제로 바뀐다. 기존 개발자센터 키는 2027-06-30까지만 쓸 수 있다.

### Cited Findings
- 2026-07-31부터 검색어 트렌드와 쇼핑인사이트 신규 신청은 NAVER API HUB로 옮겨졌고, 개발자센터는 신규 신청을 받지 않는다. 기존 개발자센터 키는 2027-06-30까지 지원되며, 기존 키와 HUB 키는 서로 호환되지 않는다. (글 수정일 2026-10-04) — [digitalmarketer.co.kr](https://www.digitalmarketer.co.kr/insights/naver-datalab-api-data-for-non-developers)
- 엔드포인트
  - 기존: `POST https://openapi.naver.com/v1/datalab/search` (헤더 `X-Naver-Client-Id`/`Secret`)
  - HUB: `POST https://naverapihub.apigw.ntruss.com/search-trend/v1/search` (헤더 `X-NCP-APIGW-API-KEY-ID`/`KEY`)
  - 쇼핑인사이트 HUB: `/shopping/v1/categories`(분야별), `/shopping/v1/category/keywords`(키워드별). 기기·성별·연령별은 별도 API가 있다.
  - 출처: [digitalmarketer.co.kr](https://www.digitalmarketer.co.kr/insights/naver-datalab-api-data-for-non-developers)
- 요청 파라미터: `startDate`, `endDate`, `timeUnit`(date/week/month), `keywordGroups`(groupName + keywords)가 필수다. 선택 필터는 `device`, `gender`, `ages`이고, 데이터는 2016-01-01부터 있다. — [digitalmarketer.co.kr](https://www.digitalmarketer.co.kr/insights/naver-datalab-api-data-for-non-developers); [NCP API HUB 개요](https://guide.ncloud-docs.com/docs/apihub-overview)
- keywordGroups는 최대 5개, 그룹당 키워드는 최대 20개다. 다만 한 자료는 사용 가이드 FAQ에 5개로 적혀 있어 문서끼리 다르다고 지적한다(레퍼런스는 20개). — [digitalmarketer AI 클래스](https://www.digitalmarketer.co.kr/class/ai-marketing-in-practice/search-trend-research-with-ai); [NCP search-trend 문서](https://api.ncloud-docs.com/docs/naver-api-hub-search-trend.md)
- 쇼핑인사이트 제약: 분야별은 categories를 최대 3개 넣을 수 있다. 키워드별은 묶음 최대 5개, 묶음당 검색어 1개다. 분야 코드는 네이버쇼핑 URL의 `cat_id`로 확인한다. — [digitalmarketer.co.kr](https://www.digitalmarketer.co.kr/insights/naver-datalab-api-data-for-non-developers)
- ratio의 성격
  - 한 요청 안에서 최댓값을 100으로 둔 상대 지수다. 검색 횟수, 매출, 점유율이 아니다.
  - 기간, 키워드 구성, 필터가 다른 요청끼리는 직접 비교하거나 이어 붙일 수 없다.
  - 검색어 트렌드는 네이버 통합검색만, 쇼핑인사이트는 네이버쇼핑 클릭만 반영한다.
  - 출처: [digitalmarketer.co.kr](https://www.digitalmarketer.co.kr/insights/naver-datalab-api-data-for-non-developers)
- 연령 코드는 두 API가 다르다. 검색어 트렌드 19~29세는 코드 3+4, 쇼핑인사이트 20대는 코드 20이다. — 동일 출처
- 호출 한도(HUB)
  - 검색어 트렌드와 쇼핑인사이트는 각각 월 최대 50,000건이며 따로 집계한다. 같은 키를 쓰는 서비스의 사용량은 합산된다.
  - 키당 50 RPS, Data Lab 플랫폼 전체 500 RPS이며, 넘으면 429를 받는다.
  - 월 한도의 50/80/100%에서 메일 알림이 오고, 100%에 이르면 자동 차단된다. 무료 기간에는 한도를 늘릴 수 없다.
  - 출처: [NCP API HUB 개요 (2026-09-17 갱신)](https://guide.ncloud-docs.com/docs/apihub-overview)
- 요금: "NAVER API HUB 서비스는 한시적으로 무료로 제공되며, 유료 전환 시 사전에 별도 공지로 안내될 예정"이다. 구조는 종량제이며, 무료 종료일은 명시되어 있지 않다. — [NCP API HUB 개요](https://guide.ncloud-docs.com/docs/apihub-overview)
- 구 개발자센터 기준 "일 1,000회" 한도가 블로그에 언급되지만, HUB는 월 한도 체계라 서로 맞지 않는다. — [digitalmarketer AI 클래스](https://www.digitalmarketer.co.kr/class/ai-marketing-in-practice/search-trend-research-with-ai) vs [NCP API HUB 개요](https://guide.ncloud-docs.com/docs/apihub-overview)
- 상업적 이용 조건: HUB 개요 문서에는 따로 적혀 있지 않고 "상표 및 BI 사용 가이드"만 링크되어 있다. — [NCP API HUB 개요](https://guide.ncloud-docs.com/docs/apihub-overview)

### Inferences
- 월 50,000건이면 하루 약 1,600건이다. 요청당 최대 5그룹이므로 하루 후보 키워드 수천 개를 일 단위로 추적할 수 있다. 단, 지수가 요청마다 정규화되므로 "앵커 키워드"(예: "레시피" 또는 안정적인 기준 메뉴)를 모든 요청에 하나씩 넣어 요청 간 스케일을 맞춰야 한다.
- 신규 구축은 처음부터 HUB 엔드포인트로 짜야 한다. 구 키에 의존하면 2027-06 이후 깨진다.
- 유료 전환 시점이 정해져 있지 않으므로, 비용 상한을 설계에 반영해야 한다.

### Gaps
- developers.naver.com 원문(이용약관, 일 한도)은 이 환경에서 접근할 수 없어 직접 확인하지 못했다.
- HUB 유료 전환 단가는 "사용 준비" 페이지에 있으나 확인하지 못했다.
- 데이터 지연(당일/전일 반영 여부)과 상업 서비스에서 지수를 화면에 노출해도 되는지에 대한 약관 조항은 [미확인]이다.

## 2. Naver 검색광고 API (keywordstool / 연관키워드 조회)

### Takeaway
검색광고 API의 `/keywordstool`(GET, `hintKeywords`)은 월간 PC/모바일 절대 검색수(monthlyPcQcCnt, monthlyMobileQcCnt)와 연관키워드를 주는 유일한 네이버 공식 경로다. 접근하려면 검색광고 광고주 계정에서 API 라이선스를 발급받아야 한다. 호출 한도와 "광고 외 목적 사용" 약관 조항은 이번 조사에서 1차 출처로 확인하지 못했다.

### Cited Findings
- 발급 절차: searchad.naver.com에 가입한 뒤 manage.searchad.naver.com의 도구 > API 매니저(API 사용 관리)에서 API 라이선스(Access License)와 Secret Key를 만든다. — [naver/searchad-apidoc README](https://github.com/naver/searchad-apidoc)
- 요청에는 검색광고 CUSTOMER_ID가 필요하며, 이는 통합광고 ID(adAccountNo)와 다르다. — [digitalmarketer.co.kr 검색광고 API](https://www.digitalmarketer.co.kr/insights/naver-search-ad-api-data-for-non-developers)
- 별도 심사 없이 약관 동의만으로 즉시 발급된다는 블로그 설명이 있다. — [i-boss](https://www.i-boss.co.kr/ab-6141-56412) (2차 출처)
- 엔드포인트는 `GET /keywordstool?hintKeywords=a,b&showDetail=1`이다. 인증은 HMAC 서명이며 `X-Timestamp`, `X-API-KEY`, `X-Customer`, `X-Signature` 헤더를 쓴다. 응답에는 relKeyword, monthlyPcQcCnt, monthlyMobileQcCnt, compIdx 등이 들어 있다(서드파티 래퍼 예시 기준). — [PyPI naver-search-ad](https://pypi.org/project/naver-search-ad); [HF 예제 코드](https://huggingface.co/spaces/Kims12/na_ver-1/blob/a18982fa93c6af6a2707875cb240072a5324c4f6/app.py)
- 429를 받으면 백오프한 뒤 재시도하는 것이 권장 패턴이다. 공식 한도 수치는 해당 글에도 없다. — [digitalmarketer.co.kr 검색광고 API](https://www.digitalmarketer.co.kr/insights/naver-search-ad-api-data-for-non-developers)

### Inferences
- 절대 검색량은 "최근 30일 롤링" 월간 값이다 [미확인, 일반적으로 알려진 사양]. 일 단위 급상승 감지보다는 후보 키워드의 볼륨 필터(예: 월 1,000 이상)와 연관어 확장에 쓰는 것이 적합하다.
- 업계에 알려진 사양은 hintKeywords 요청당 최대 5개, 공백 불가, 볼륨이 작으면 "< 10" 문자열 반환이다. 모두 [미확인]이라 구현 시 문자열 처리가 필요할 수 있다.
- 검색광고 API는 광고 운영 목적으로 제공된다. 데이터를 비광고 서비스의 사용자 노출 지표로 쓰는 것은 약관 위반 소지가 있으므로 내부 랭킹 신호로만 쓰는 것이 안전하다 [추론, 약관 원문 미확인].

### Gaps
- 공식 rate limit, hintKeywords 최대 개수, 약관상 2차 이용 제한은 searchad-apidoc 본문을 렌더링하지 못해 확인하지 못했다.

## 3. Google Trends (공식 API alpha / pytrends)

### Takeaway
공식 Google Trends API는 2025-07-24에 alpha로 발표되었다. 2026-08 기준으로도 신청 후 허용 목록(allowlist)에 오른 개발자만 쓸 수 있고, GA 일정과 가격은 미발표다. 비공식 pytrends는 2025-04-17에 아카이브되었고 429가 일상적으로 발생해 운영용으로는 부적합하다.

### Cited Findings
- 2025-07 Google Search Central 블로그에서 "Introducing the Google Trends API (alpha)"를 발표했다. 소수 개발자에게 순차적으로 접근을 열어 주는 방식이다. — [Google Search Central Blog](https://developers.google.com/search/blog/2025/07/trends-api); [Search Engine Journal](https://www.searchenginejournal.com/google-trends-api-alpha-launching-breaking-news/551935/); [PPC Land](https://ppc.land/google-opens-alpha-testing-for-new-trends-api-targeting-developers-and-journalists/)
- 제공 데이터
  - 5년(1,800일) 롤링 윈도우, 일·주·월·연 집계, 지역·하위지역 단위다.
  - 일관되게 스케일된(consistently scaled) 값을 주므로 요청 간 결합이 가능하다(UI의 0~100 정규화와 다르다).
  - 비교 키워드는 수십 개로, UI의 최대 8개보다 많다.
  - 출처: [konabayev.com (2026-07-10 감수)](https://konabayev.com/blog/google-trends-api-landscape-2026/); [PPC Land](https://ppc.land/google-opens-alpha-testing-for-new-trends-api-targeting-developers-and-journalists/)
- 2026-08 기준 여전히 alpha이며 신청서와 allowlist로 운영되고, GA나 상용 가격은 발표되지 않았다. — [scrapebadger](https://scrapebadger.com/blog/does-google-trends-have-an-api-what-to-use-in-2026); [dev.to](https://dev.to/esteban_ortega/pytrends-is-dead-heres-how-to-get-google-trends-data-in-2026-1a18) (벤더 블로그)
- pytrends 저장소는 2025-04-17에 아카이브(읽기 전용)되었다. 적은 호출량에서도 429가 반복 보고된다. 대안으로 trendspy, trendspyg 같은 커뮤니티 라이브러리나 SerpAPI, DataForSEO 같은 유료 스크레이핑 API가 있다. — [apiserpent](https://apiserpent.com/blog/pytrends-dead-google-trends-data-2026); [scrapebadger](https://scrapebadger.com/blog/best-google-trends-scraper-in-2026-every-tool-compared-honestly); [trendspyg GitHub](https://github.com/flack0x/trendspyg)

### Inferences
- 한국 음식 검색은 네이버 비중이 높다. Google Trends는 보조 신호(특히 유튜브·해외발 바이럴 감지)로 두고, alpha 신청은 해 두되 파이프라인이 여기에 의존하지 않게 설계해야 한다.
- 비공식 스크레이핑은 Google 약관상 자동화 접근 금지 조항에 걸릴 위험이 있다 [약관 원문 미확인].

### Gaps
- alpha의 쿼터, 한국 하위지역 지원 여부, 2026-09 이후 상태 변화(GA 여부)는 확인하지 못했다.

## 4. TikTok Creative Center 트렌딩 해시태그

### Takeaway
Creative Center Trends는 공식 공개 API가 없는 브라우저 UI이고, 내부 API를 쓰는 것은 서드파티 스크레이퍼뿐이다. TikTok Research API는 승인된 학술·비영리 연구자 전용(비상업)이라 TrendFood에는 쓸 수 없다.

### Cited Findings
- Creative Center 트렌드 페이지는 내부 API로 동작하는 브라우저 UI이며, 문서화된 공개 API 제품이 아니다. — [Apify webdata_labs](https://apify.com/webdata_labs/tiktok-hashtag-trends-scraper)
- 비로그인 상태에서는 요청당 해시태그 3개로 제한된다는 보고와, 전체 목록을 보려면 세션 쿠키가 필요하다는 보고가 있다(벤더). 2026-06 개편으로 Videos/Creators/Songs 공개 피드가 제거되고 해시태그만 남았다는 주장도 있다 [미확인]. — [Apify 리스팅들](https://apify.com/crawlerbros/tiktok-hashtag-trends-scraper)
- 지원 국가 수는 27개국과 47개국으로 주장이 엇갈린다. 한국 포함 여부는 이번 결과에서 확인되지 않았다. — [Apify automation-lab](https://apify.com/automation-lab/tiktok-trends-scraper); [Apify api-empire](https://apify.com/api-empire/tiktok-trending-hashtags-scraper)
- Research API는 자격을 갖춘 학술·비영리 기관의 승인된 연구자 전용이며 비상업 용도로만 쓸 수 있다. — [Apify 리스팅 인용](https://apify.com/eunit/tiktok-trends-scraper) (2차)

### Inferences
- 상업 서비스에서 Creative Center를 자동 수집하는 것은 약관 위반 위험이 크다. 운영자가 수동으로 참고하는 신호로만 쓰는 것을 권장한다.

### Gaps
- TikTok 공식 ToS의 스크레이핑 조항과 Creative Center 한국 지원 여부는 1차 출처로 확인하지 못했다.

## 5. 국내 소셜리스닝·키워드 툴 (썸트렌드, 블랙키위, 키워드사운드, 판다랭크)

### Takeaway
네 서비스 모두 이번 조사에서 공개 API나 정확한 요금표를 1차 출처로 확인하지 못했다. 판다랭크와 블랙키위는 네이버 검색량 기반 키워드 분석 SaaS로 기능이 비슷하다고 소개된다.

### Cited Findings
- 판다랭크와 블랙키위는 온라인 마케팅과 콘텐츠 제작용 데이터 분석 도구로, 기능이 유사하다. — [AMPM 인사이트](https://inside.ampm.co.kr/insight/9348)
- 썸트렌드는 마케터용 트렌드 참고 사이트로 소개된다(요금과 API 정보는 없음). — [i-boss](https://www.i-boss.co.kr/ab-qletter-564388)

### Inferences
- 썸트렌드(바이브컴퍼니)는 블로그·커뮤니티·X 등 SNS 언급량과 감성 분석을 제공한다고 알려져 있다. 기업용 데이터 공급은 영업 문의(견적) 형태일 가능성이 높다 [미확인].
- 블랙키위, 판다랭크, 키워드사운드 수치의 원천은 네이버 검색광고 API 볼륨일 가능성이 높다. 직접 검색광고 API를 쓰면 같은 데이터를 무료로 얻을 수 있다 [추론].

### Gaps
- 각 사의 요금제, API 제공 여부, 재배포 약관은 공식 요금 페이지에 직접 접근해 확인해야 한다(이번 검색에서 결과 없음).

## 6. 기타 음식 특화 신호 (만개의레시피, 네이버 블로그/카페 검색 API, YouTube, Instagram)

### Takeaway
- **YouTube**: 2025-07에 Trending 페이지가 폐지되고 카테고리별 Charts로 바뀌었다. 음식 카테고리 차트는 확인되지 않았다.
- **Instagram**: 해시태그 검색은 계정당 7일 롤링 30개 해시태그로 제한되고 App Review가 필요하다. 대량 트렌드 감지에는 맞지 않는다.
- **네이버 검색 API(블로그·카페)**: HUB에서 월 775,000건까지 쓸 수 있어 포스트 수 기반 신호로 가장 현실적이다.

### Cited Findings
- YouTube는 2025-07-10에 Trending 페이지와 Trending Now 목록을 폐지한다고 발표했다. 대신 YouTube Charts에 카테고리별 차트를 두며, 첫 차트는 Trending Music Videos, Weekly Top Podcast Shows, Trending Movie Trailers다. — [TechCrunch](https://techcrunch.com/2025/07/10/youtube-is-getting-rid-of-its-trending-page-and-trending-now-list); [9to5Google](https://9to5google.com/2025/07/10/youtube-trending-page-removal/)
- Instagram Hashtag Search는 IG 비즈니스·크리에이터 계정당 7일 롤링 기간에 고유 해시태그 30개까지 조회할 수 있다. Instagram Public Content Access 기능에 대한 App Review가 필요하다. — [Meta 개발자 문서](https://developers.facebook.com/documentation/instagram-platform/instagram-api-with-facebook-login/hashtag-search); [recently_searched_hashtags](https://developers.facebook.com/documentation/instagram-platform/instagram-graph-api/reference/ig-user/recently_searched_hashtags)
- NAVER 검색 API(블로그, 카페, 뉴스, 웹, 지식iN 등)는 API HUB에서 카테고리 공유로 월 최대 775,000건까지 호출할 수 있다. 키당 50 RPS, 플랫폼 1,000 RPS다. — [NCP API HUB 개요](https://guide.ncloud-docs.com/docs/apihub-overview)

### Inferences
- 네이버 블로그·카페 검색 응답에는 `total`(검색 결과 총 건수)과 각 글의 `postdate` 필드가 있다 [미확인, 기존 개발자센터 사양 기준]. 이를 쓰는 방법은 두 가지다.
  - 키워드별 `total`의 일별 스냅샷 차분
  - `sort=date`로 최근 7일 신규 포스트 수 집계
- 이렇게 하면 "SNS에서 실제로 만들어 먹는" 신호를 얻을 수 있다.
- YouTube Data API v3의 `videos.list?chart=mostPopular&regionCode=KR&videoCategoryId=26`(Howto & Style)은 Trending 페이지 폐지와 별개로 동작할 수 있다 [미확인]. 대안은 `search.list`로 "레시피" 관련 최근 업로드의 조회수 증가를 추적하는 것이다(검색 1회당 쿼터 100 유닛 [미확인]).
- 만개의레시피 랭킹은 공식 API가 확인되지 않았다. 크롤링하려면 robots.txt와 약관 검토가 필요하다 [미확인].

### Gaps
- 만개의레시피의 랭킹 페이지 구조, API, 약관은 조사하지 못했다.
- YouTube mostPopular 차트가 2025년 이후에도 동작하는지는 확인하지 못했다.

## 7. "급상승" 점수 계산과 요리 매핑 방법

### Takeaway
여러 소스의 상대·절대 지표를 같은 척도로 맞추려면 키워드별 자기 기준선 대비 변화(로그 비율, z-score)를 쓰고, 볼륨 하한 필터를 함께 거는 방식이 실무적으로 합리적이다(아래는 설계 제안이며 외부 출처가 아니다).

### Cited Findings
- DataLab ratio는 요청 내에서만 비교할 수 있다. 같은 요청 안에서의 기간별 증감 비교는 유효하다. — [digitalmarketer.co.kr](https://www.digitalmarketer.co.kr/insights/naver-datalab-api-data-for-non-developers)
- Google Trends API alpha는 요청 간 결합이 가능한 일관 스케일 값을 준다. — [konabayev.com](https://konabayev.com/blog/google-trends-api-landscape-2026/)

### Inferences (설계 제안)
- **수집**: DataLab에서 키워드별 최근 8~12주 일 단위(timeUnit=date) 시계열을 매일 받는다. 요청마다 앵커 키워드 1개를 넣고, 값을 앵커로 나눠 정규화한다.
- **WoW 비율**: `r = (최근7일 평균 + ε) / (직전7일 평균 + ε)`로 계산하고 `log2(r)`를 쓴다. ε로 저볼륨 노이즈를 억제한다.
- **z-score**: `z = (최근7일 평균 − 직전28일 평균) / 직전28일 표준편차`. 요일 효과를 없애려면 7일 이동평균을 먼저 적용한다.
- **복합 점수**: `score = w1·z_naver + w2·log2(r_naver) + w3·z_blogposts + w4·z_google(가용 시)`.
  - 검색광고 API 월간 검색수가 하한(예: 1,000/월)보다 낮으면 제외한다.
  - 장기 추세(직전 90일 대비)가 이미 높으면 "상시 인기"로 분류해 급상승과 구분한다.
- **신규 키워드 발견**
  - 검색광고 `keywordstool`에 시드("레시피", "만들기", 인기 재료명)를 넣어 연관어를 확장한다.
  - 네이버 블로그·카페 검색 결과 제목에서 n-gram을 추출한다.
  - DataLab으로 후보를 검증한다.
- **요리 매핑**
  - 키워드를 정규화한다: "~레시피", "~만들기", "~황금레시피" 접미사 제거, 띄어쓰기 통일.
  - 내부 요리 사전(요리명 → 대표 재료 → 쿠팡 상품 검색어)과 정확 일치하거나 유사도로 매칭한다.
  - 매칭되지 않는 키워드(예: 밈성 이름 "두바이 쫀득쿠키")는 블로그 상위 N개 글의 본문이나 재료 목록을 LLM으로 요약해 표준 요리명과 재료 리스트를 만든 뒤, 운영자 승인 큐로 보낸다.
  - 재료 키워드는 쇼핑인사이트의 식품 카테고리 키워드 클릭 추이로 교차 확인한다.

### Gaps
- 가중치(w1~w4)와 임계값은 실제 데이터로 백테스트해 정해야 한다. 외부 벤치마크는 찾지 못했다.
