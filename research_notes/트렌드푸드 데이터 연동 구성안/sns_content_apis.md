# SNS 레시피 영상 공식 API 조사 (YouTube / Instagram / TikTok) — 2026-10-29 기준

표기: [확인] = 이번 세션에서 공식 문서를 직접 가져와 확인함. [미확인] = 검색 요약이나 사전 지식에만 근거하므로 다시 확인해야 함.

## Q1. YouTube Data API v3: 탐색, 쿼터, 자막, 약관

### 핵심 요약
2026-06-01부터 search.list는 별도 쿼터 버킷으로 분리됐다. 호출당 1단위, 기본 하루 100회다(예전에는 공용 쿼터에서 호출당 100단위). videos.list는 공용 10,000단위 버킷에서 호출당 1단위이고, 신규 `videos.batchGetStats`는 별도 버킷(하루 10,000)에서 1단위다. 그래서 검색은 귀하고 메트릭 갱신은 저렴하다. 남의 영상 자막은 공식 API로 받을 수 없다(captions.download는 편집 권한 필요). 비인가 데이터와 공개 통계는 30일 안에 삭제하거나 갱신해야 하며, "파생 데이터·메트릭 생성"을 금지하는 조항이 있다.

### 확인된 내용 (출처 포함)
- [확인] 기본 할당량은 search.list 100회, videos.insert 100회, 그 외 모든 엔드포인트 합산 하루 10,000단위다. "The search.list and videos.insert methods have their own quota buckets… The quota cost is 1 per call." 쿼터는 태평양시 자정에 초기화된다. — [Quota calculator](https://developers.google.com/youtube/v3/determine_quota_cost) (last updated 2026-10-15)
- [확인] 호출당 비용: videos.list 1, channels.list 1, playlistItems.list 1, videoCategories.list 1, captions.list 50 — [Quota calculator](https://developers.google.com/youtube/v3/determine_quota_cost)
- [확인] 2026-06-01 변경 내역: "API calls to the videos.insert and search.list methods will be charged to their own respective quota buckets." — [Revision history](https://developers.google.com/youtube/v3/revision_history)
- [확인] 2026-06-03 신규 메서드 `videos.batchGetStats`: 호출당 1단위, 별도 버킷, 기본 하루 10,000단위 — [Revision history](https://developers.google.com/youtube/v3/revision_history)
- [확인] 2025-07-10 공지(7/21 시행): YouTube 인기 급상승(Trending) 페이지가 폐지되면서 `chart=mostPopular`는 이제 Trending Music, Movies, Gaming 차트에서 결과를 가져온다. 따라서 음식 분야 "인기 영상" 신호로는 쓸모가 크게 줄었다. — [Revision history](https://developers.google.com/youtube/v3/revision_history)
- [확인] `chart=mostPopular`는 `regionCode`(ISO 3166-1 alpha-2)와 `videoCategoryId`를 함께 쓸 수 있다. maxResults는 최대 50이다. 지원하지 않는 조합이면 400 `videoChartNotFound`가 반환된다. — [videos.list](https://developers.google.com/youtube/v3/docs/videos/list)
- [확인] 2025-03-31부터 Shorts 조회수는 시청 시작이나 재생마다 집계된다("no minimum watch time"). 2026-08-27부터는 롱폼·Live·Shorts 모두 "count public views the moment a video begins to play"로 기준이 통일됐다. Shorts와 롱폼 조회수를 비교할 때 이 변경을 감안해야 한다. — [Revision history](https://developers.google.com/youtube/v3/revision_history)
- [확인] captions.download는 200단위이며 "requires the user to have permission to edit the video"이다(scope: youtube.force-ssl 또는 youtubepartner). 따라서 타인 영상의 자막 다운로드는 불가능하다. — [captions.download](https://developers.google.com/youtube/v3/docs/captions/download)
- [확인] 저장 제한(Developer Policies)
  - 비인가 데이터는 최대 30일까지만 보관할 수 있고, 이후 삭제하거나 갱신해야 한다(III.E.4.d).
  - 비인가 데이터로 받은 공개 통계는 30일을 넘겨 저장하면 안 된다(III.E.4.b).
  - 저장한 데이터는 최신 상태로 유지해야 한다(III.E.4.e/f).
  - 출처: [Developer Policies](https://developers.google.com/youtube/terms/developer-policies)
- [확인] 독자 메트릭 관련 조항(III.E.4.h)
  - "must not access or use API Data to create new or derived data or metrics."
  - 독자적으로 계산한 수치로 YouTube 데이터를 대체하면 안 된다.
  - YouTube에서 나오지 않은 메트릭은 그렇다고 명확히 표시해야 한다.
  - 2026-06-01부터 감사를 통과한 analytics 개발자에게만 추가 메트릭·저장 권한이 주어진다(III.L, 세부 내용은 별도 문서).
  - 출처: [Developer Policies](https://developers.google.com/youtube/terms/developer-policies)
- [확인] 기타 Developer Policies 조항
  - 스크래핑 금지: "must not, directly or indirectly, scrape YouTube Applications" (III.E.6). API 외의 기술로 API 데이터를 얻는 것도 금지된다(III.I.14).
  - 시청각 콘텐츠 사본 저장 금지: 사전 서면 승인 없이는 불가(III.E.1).
  - 출처 표시: YouTube가 출처임을 명확히 보여야 하고, 플레이어의 표시를 가리면 안 된다(III.F.2).
  - 임베드 조건: 플레이어 수정·차단 금지(III.I.6), 백그라운드 재생 금지(III.I.9), Made For Kids 영상은 추적을 꺼야 한다(III.E.4.j).
  - 쿼터 증설: API Compliance Audit이 필요하고, 승인받은 용도로만 써야 하며, 용도가 바뀌면 재감사를 받아야 한다(III.D.3). 90일간 활동이 없으면 접근이 제한될 수 있다(III.D.4).
  - 출처: [Developer Policies](https://developers.google.com/youtube/terms/developer-policies)
- [확인] Developer Policies 페이지 자체에는 AI/ML 학습을 직접 언급하는 조항이 없다. 가장 가까운 것은 위의 파생 데이터 금지(III.E.4.h)와 복사 금지(III.E.1)다. — [Developer Policies](https://developers.google.com/youtube/terms/developer-policies)
- [확인·비공식] 공식 Data API에서 Shorts 여부를 알려주는 필드는 검색 결과로는 확인하지 못했다. 커뮤니티에서는 `youtube.com/shorts/{id}`에 HEAD 요청을 보내 200이면 Shorts, 303이면 롱폼으로 판별한다. — [TubeArchivist commit](https://git.tubearchivist.com/tubearchivist/tubearchivist/commit/ce4288ff66cd40dc185289f255e9c4f810ddb726); [NewsBlur forum](https://forum.newsblur.com/t/detect-and-tag-shorts-in-youtube-feeds/9711). 단, 이 방식은 III.E.6 스크래핑 금지 조항과 충돌할 소지가 있다.

### 추론
- 하루 search.list 100회가 탐색 예산의 상한이다. 예를 들어 "레시피", "요리", "#shorts 레시피", "자취 요리" 같은 한국어 키워드 20~30개를 `publishedAfter=최근 48h`, `regionCode=KR`, `relevanceLanguage=ko`, `type=video`, `order=viewCount`로 하루 3~4회 돌리는 식이다.
- 후보 ID는 videos.list나 batchGetStats(ID 50개당 1단위)로 통계를 받는다. 그다음 업로드 후 경과 시간 대비 조회수 증가율로 바이럴 점수를 매기는 구조가 쿼터상 가능하다.
- 다만 자체 "바이럴 점수"를 YouTube 메트릭처럼 표시하면 III.E.4.h 위반 소지가 있다. 내부 랭킹에만 쓰고, 화면에는 YouTube 원본 수치를 출처와 함께 표시하는 편이 안전하다.
- 감사 없이 쓸 수 있는 채널 범위를 넓히려면 search 대신 큐레이션한 한국 요리 채널의 uploads 플레이리스트를 쓰는 방법이 있다. playlistItems.list는 1단위이고 공용 버킷이다(검색 버킷을 아낄 수 있다).
- 타인 영상의 공식 텍스트 소스는 `snippet.title`, `snippet.description`, `snippet.tags`(videos.list)뿐이다. 한국 요리 영상은 설명란에 재료 목록이 있는 경우가 많아 이를 LLM으로 구조화하는 것이 정석 경로다.
- 자막이나 오디오를 비공식 도구(youtube-transcript-api, yt-dlp 등)로 가져오는 것은 III.E.6과 III.I.14 위반이다.
- 저장한 설명란이나 LLM 파생 레시피를 30일 넘게 보관하면 III.E.4.d와 III.E.4.h에 저촉될 위험이 있다. 레시피를 "독립 저작물"로 재작성하고 원본 데이터는 30일마다 갱신하거나 삭제하는 설계를 법무 검토로 확인할 필요가 있다.

### 남은 공백
- search.list 파라미터(`publishedAfter`, `regionCode`, `relevanceLanguage`, `videoDuration=short`) 동작은 사전 지식에만 근거하며, 이번에는 문서를 직접 가져오지 않았다. [미확인] 참고: https://developers.google.com/youtube/v3/docs/search/list
- Howto & Style 카테고리 ID(26으로 알려짐)가 KR에서 mostPopular를 지원하는지 확인하지 못했다. Trending 폐지 이후로는 videoChartNotFound가 날 가능성이 있다. [미확인]
- YouTube API Services Terms of Service 본문의 AI 관련 조항, 그리고 III.L 별도 문서(derived metrics)의 세부 내용은 가져오지 못했다.
- 쿼터 증설 신청 양식 URL과 소요 기간도 확인하지 못했다. [미확인: https://support.google.com/youtube/contact/yt_api_form]
- `videos.batchGetStats`가 반환하는 필드 목록을 확인하지 못했다.

## Q2. Instagram Graph API (2026)

### 핵심 요약
타인 콘텐츠를 찾는 공식 경로는 두 가지뿐이다. 하나는 Hashtag Search(7일당 고유 해시태그 30개)이고, 다른 하나는 Business Discovery(사용자명을 아는 비즈니스·크리에이터 계정만)다. 둘 다 "Instagram Public Content Access" 기능에 대한 App Review가 필요하고, 페이지와 연결된 자사 Business/Creator 계정이 있어야 한다. 임베드는 Meta oEmbed Read(App Review와 비즈니스 인증 필요)를 쓰며, 사용은 표시 목적으로 제한된다.

### 확인된 내용 (출처 포함)
- [확인] ig_hashtag_search 조건
  - "You can query a maximum of 30 unique hashtags" (7일 기준).
  - 민감한 해시태그는 일반 오류를 반환한다.
  - Instagram Public Content Access 기능과 `instagram_basic` 권한이 필요하다(Business Manager로 부여된 역할이면 `pages_read_engagement` 등도 필요).
  - 연결된 Page의 작업 권한이 있는 사용자의 User access token이 필요하다.
  - 출처: [IG Hashtag Search](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag-search)
- [확인] top_media 엣지 동작
  - 공개 사진과 영상만 반환하고, 광고와 프로모션 게시물은 제외한다.
  - 페이지당 최대 50개이며 `after` 커서만 제공한다.
  - 해시태그 ID를 이미 알고 있어도 30개 한도에 포함된다.
  - `username` 필드는 요청할 수 없다.
  - user_id는 Business 또는 Creator 계정이어야 한다.
  - 출처: [IG Hashtag top_media](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag/top-media)
- [확인] top_media에서 받을 수 있는 필드: caption, children, comments_count, id, like_count, media_type, media_url, permalink, timestamp. 소유자가 좋아요 수를 숨기면 like_count가 빠진다. 저작권 음원 영상이나 다운로드가 꺼진 릴스는 media_url이 빠진다. 조회수 필드는 목록에 없다. — [IG Hashtag top_media](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag/top-media)
- [미확인] recent_media는 최근 24시간 게시물만 반환한다고 알려져 있으나, 이번에는 해당 페이지를 가져오지 않았다. 참고: https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-hashtag/recent-media
- [확인] Business Discovery 조건
  - 타 Business/Creator 계정의 공개 데이터를 읽기 전용으로 조회하며, `username`으로 대상을 지정한다.
  - `instagram_basic`, `instagram_manage_insights`, `pages_read_engagement` 권한이 필요하다.
  - 예시 요청에서 `comments_count`, `like_count`, `view_count`를 사용한다.
  - 연령 제한 계정은 반환되지 않는다.
  - 저작권 음원 영상이나 다운로드가 꺼진 릴스는 media_url이 생략된다.
  - 출처: [Business Discovery](https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/reference/ig-user/business_discovery)
- [확인] oEmbed 조건
  - 시간당 1,000건까지 요청할 수 있다.
  - 응답의 `html`로 임베드한다.
  - 메타데이터와 콘텐츠를 표시 외 용도(분석 등)로 쓰는 것은 금지된다.
  - 출처: [Instagram oEmbed](https://developers.facebook.com/docs/instagram-platform/oembed)
- [확인] Meta oEmbed Read 기능 조건
  - App Review가 필요하고 비즈니스 인증 전용이다. 추가 계약이 필요할 수 있다.
  - 주 용도는 "공개된 Facebook 및 Instagram 페이지, 게시물 및 동영상의 프론트엔드 보기 제공"이다.
  - 출처: [Meta oEmbed Read](https://developers.facebook.com/docs/features-reference/meta-oembed-read)
- [상충] 일본어판 oEmbed 레퍼런스 검색 결과에는 "2026-06-15에 모든 Meta oEmbed API의 access token 요구가 해제되었고 App Review가 더 이상 필요 없다"는 문구가 있다. 그러나 이번에 확인한 Meta oEmbed Read 페이지에는 해당 공지가 없고 여전히 App Review가 필요하다고 되어 있다. — [oEmbedVideo (ja_JP)](https://developers.facebook.com/docs/graph-api/reference/oembedvideo/?locale=ja_JP) vs [Meta oEmbed Read](https://developers.facebook.com/docs/features-reference/meta-oembed-read)
- [확인·검색 요약] 2025-04-08 Meta 블로그 공지: oEmbed에서 thumbnail_url, thumbnail_width/height, author_name, author_url이 반환되지 않게 된다. Instagram 엔드포인트의 제거 시점은 2025-11-03이다(포럼 기준). 썸네일을 자체 저장하거나 표시하는 설계는 불가하다. — [Meta dev blog: oEmbed updates](https://developers.facebook.com/blog/post/2025/04/08/oembed-updates/); [Discourse](https://meta.discourse.org/t/configure-an-app-token-for-instagram-oneboxes/223548)
- [미확인] Instagram Basic Display API는 2024-12-04에 종료됐다(사전 지식 기준). 이번 세션에서는 공지 원문을 가져오지 않았다. 참고: https://developers.facebook.com/blog/post/2024/09/04/update-on-instagram-basic-display-api/

### 추론
- 해시태그 30개/7일 한도이므로 #레시피, #자취요리, #집밥, #요리스타그램, #간단요리 등 5~10개를 고정 해시태그로 두고, 나머지 슬롯을 주간 트렌드 키워드에 배정하는 운영이 가능하다.
- 조회수가 없으므로 바이럴 신호는 like_count, comments_count, 게시 후 경과 시간으로 추정해야 한다.
- Business Discovery로는 인기 한국 요리 크리에이터 화이트리스트를 주기적으로 폴링해 view_count를 보완할 수 있다.
- oEmbed의 "표시 외 용도 금지" 때문에 oEmbed 메타데이터나 캡션을 LLM 레시피 변환 입력으로 쓰는 것은 위반 소지가 크다. Graph API로 받은 caption을 쓰는 경우도 Meta Platform Terms의 데이터 사용 제한 검토가 필요하다. [미확인: Platform Terms 본문은 이번에 확인하지 않음]
- App Review 시 "타인 콘텐츠를 큐레이션해 상업 서비스에 노출"하는 용도가 승인될지는 불확실하다. 크리에이터의 명시적 동의나 제휴 모델이 가장 안전하다.

### 남은 공백
- 2026년 기준 Instagram Public Content Access App Review의 승인 기준과 사례를 찾지 못했다.
- Hashtag top_media가 Reels 조회수(`views`/`plays`)를 반환하는지 확인하지 못했다(문서 필드 목록에는 없음).
- Meta Platform Terms에 AI 학습 또는 파생 콘텐츠 제한 조항이 있는지 확인하지 못했다.

## Q3. TikTok 공식 API

### 핵심 요약
상업 서비스가 TikTok의 트렌드 영상을 탐색할 수 있는 공식 API는 없다. Research API는 학술·비영리 전용이고("independent of commercial interests"), Display API는 로그인한 사용자 본인의 영상만 다룬다. Commercial Content API는 EU 광고와 상업 콘텐츠 라이브러리다. 허용되는 것은 URL을 알고 있는 영상의 oEmbed나 Embed Player 임베드다.

### 확인된 내용 (출처 포함)
- [확인] Research API 조건
  - 미국·EEA·영국·캐나다·스위스 학술기관과 일부 비영리 단체가 대상이다.
  - 신청자는 "Be independent of commercial interests and able to conduct research on a not-for-profit or non-commercial basis"여야 한다.
  - 출처: [Research API](https://developers.tiktok.com/products/research-api/)
- [확인] Display API: `/v2/user/info/`, `/v2/video/list/`, `/v2/video/query/`를 제공한다. scope `video.list`는 "Read a user's public videos"이며 인가한 사용자 기준이다. 검색이나 탐색 기능은 없다. — [Display API overview](https://developers.tiktok.com/doc/display-api-overview)
- [확인] Commercial Content API: 광고와 광고주, 상업 콘텐츠를 광고주명이나 키워드로 검색한다. 현재 EU 국가 데이터만 포함하고, 오가닉 트렌드 영상은 언급이 없다. — [Commercial Content API](https://developers.tiktok.com/products/commercial-content-api/)
- [확인] 임베드
  - `GET https://www.tiktok.com/oembed?url=...`가 html(iframe)을 반환하며, 예시 요청에 인증이 없다.
  - 신규 Embed Player는 `https://www.tiktok.com/player/v1/{video_id}`이고 autoplay, muted 등의 파라미터를 받는다.
  - 문서에 "Embed Videos will be deprecated soon"이라고 되어 있어 Embed Player 사용을 권장한다.
  - 앱에서 삭제된 영상은 임베드도 불가하다.
  - 출처: [Embed Videos](https://developers.tiktok.com/doc/embed-videos/)
- [미확인] Content Posting API는 자사 계정의 게시용이라 탐색과는 관계없다(사전 지식 기준, 이번에 가져오지 않음).

### 추론
- TikTok은 사람 또는 사용자 제보로 URL을 수집하고 Embed Player로 표시하는 방식만 현실적이다. 예: 운영자 큐레이션, 사용자의 "링크 붙여넣기", 크리에이터 제휴.
- TikTok Creative Center의 트렌드 해시태그 화면을 자동 수집하는 것은 공식 API가 아니므로 스크래핑에 해당한다.
- 레시피 텍스트는 크리에이터 동의를 받거나 운영자가 직접 작성해야 한다.

### 남은 공백
- TikTok 개발자 ToS에 임베드 페이지 옆에 AI 요약을 표시하는 것을 제한하는 조항이 있는지 확인하지 못했다.
- TikTok Creative Center(트렌드)에 공식 API가 있는지 확인하지 못했다.

## Q4. 스크래핑 vs 공식 API의 법적·약관 리스크, 권장 아키텍처

### 핵심 요약
YouTube는 Developer Policies에서 스크래핑과 스크래핑된 데이터 사용을 명시적으로 금지하고(III.E.6), API 외 수단도 금지한다(III.I.14). 이를 어기면 API 키와 쿼터 회수 위험이 있다. 권장 구조는 다음과 같다: YouTube 공식 API를 주 탐색원으로 쓰고, Instagram은 App Review 후 해시태그와 화이트리스트로 보조한다. TikTok은 임베드 전용으로 둔다. 원본 메타데이터는 30일 TTL로 갱신하고, 화면에는 원본을 임베드하고 출처를 표시한다.

### 확인된 내용 (출처 포함)
- [확인] YouTube: "must not, directly or indirectly, scrape YouTube Applications… or obtain scraped YouTube data". 감사와 모니터링 권한도 있다(III.H). — [Developer Policies](https://developers.google.com/youtube/terms/developer-policies)
- [확인] Instagram oEmbed: 표시 목적 외 사용을 금지한다. — [Instagram oEmbed](https://developers.facebook.com/docs/instagram-platform/oembed)
- [확인] TikTok Research API는 상업적 이용이 불가하다. — [Research API](https://developers.tiktok.com/products/research-api/)

### 추론 (권장 파이프라인)
1. 탐색 (YouTube)
   - 매일 search.list 약 80회(20회는 예비)를 쓴다. 한국어 키워드, publishedAfter, regionCode=KR, relevanceLanguage=ko 조합이다.
   - 큐레이션 채널 수백 개의 uploads 플레이리스트는 playlistItems.list로 폴링한다(1단위).
2. 메트릭 갱신
   - videos.list나 batchGetStats로 ID 50개 단위로 갱신한다. 하루 10,000단위면 이론상 50만 영상-회 수준이다.
   - 후보 영상은 6~24시간 간격으로 갱신해 증가율을 계산한다.
   - 30일이 지나면 메타데이터와 통계를 갱신하거나 삭제한다(III.E.4.d, 4.b).
3. Shorts 판별
   - contentDetails.duration ≤ 180초를 근사 기준으로 쓴다. 2024년 Shorts 최대 길이 확대 기준이며 [미확인]이다.
   - shorts URL HEAD 요청은 스크래핑 소지가 있어 피한다.
4. 레시피 추출
   - 공식 텍스트(제목, 설명, 태그)만 LLM에 입력한다. 자막과 오디오는 쓰지 않는다.
   - 산출 레시피는 출처 링크를 붙이고 임베드 플레이어와 함께 표시한다.
   - 파생 데이터 금지 조항(III.E.4.h)과 저작권(레시피 표현물)은 법무 검토가 필요하다.
   - 크리에이터 옵트아웃이나 동의 프로세스를 두는 것을 권장한다.
5. Instagram
   - App Review(Public Content Access, oEmbed Read)와 비즈니스 인증을 받은 뒤 진행한다.
   - 해시태그 30개/7일 슬롯을 운영하고, 화이트리스트 크리에이터는 Business Discovery로 조회한다.
   - 표시는 oEmbed html로만 한다.
6. TikTok
   - 운영자나 사용자가 URL을 등록하고 Embed Player로만 표시한다.
   - 자동 탐색은 하지 않는다.
7. 노출 점수
   - 내부 랭킹용으로만 쓴다.
   - UI의 수치는 플랫폼 원본 수치를 출처와 함께 표시하고, 자체 지표는 "TrendFood 자체 지표"로 명시한다(III.E.4.h).

### 남은 공백
- 한국 법(저작권법, 부정경쟁방지법 데이터 조항) 아래에서 레시피 재구성의 적법성은 이번 조사 범위 밖이다.
- 스크래핑 관련 해외 판례(예: hiQ v. LinkedIn, Meta v. Bright Data)는 이번에 출처를 확보하지 못했다.
