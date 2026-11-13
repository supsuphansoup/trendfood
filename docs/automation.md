# 트렌드 음식 자동 반영

2026-11-12 팀장의 요청으로 음식 수집 뒤 검증·페이지 반영·배포와 사진 검색·적용을 연결했다. 출처 확인 콘텐츠는 기존 10개 주소를 포함한 음식 30개(레시피 27개·완제품 안내 3개)에서 시작한다. 사진은 검토 사진 10개와 준비 중 20개에서 시작하며, 자동 검색으로 준비 중 사진을 채운다. 개수는 자동 반영으로 바뀐다.

## 실행과 반영 조건

GitHub Actions `pipeline`이 한국 시간 매일 10:17에 한 번 실행된다(`17 1 * * *`, UTC). 음식 수집·사진 확인·검사·배포를 같은 실행에서 처리한다. GitHub 예약은 지연될 수 있으며 공개 저장소가 60일 무커밋이면 중지될 수 있다. Actions의 `Run workflow`로 즉시 실행할 수도 있다.

이 시간은 방문자 통계로 입증한 최적값이 아니라 현재 수집 구조에 맞춘 운영 선택이다. 검색 추이 종료 날짜를 UTC 기준 전날로 계산하므로 한국 시간 09:00 이후에 실행해야 한국 달력의 전날을 요청한다. 오전 10시대에 시작해 점심 전 검증·배포 여유를 두며, [GitHub 공식 안내](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)에 따라 매시 정각을 피한다. 네이버 공식 API 문서는 정확한 일별 데이터 갱신 시간을 보장하지 않으므로 이 시각에 전날 데이터가 모두 제공된다고 단정하지 않는다.

1. YouTube 공식 API에서 최근 7일 인기 영상과 최근 48시간 최신 영상을 검색하고 음식 이름을 추출한다.
2. 네이버 API HUB의 실제 검색 추이로 최근 3일 평균 / 앞선 11일 평균을 계산한다. 예시 데이터는 저장·반영하지 않는다.
3. 이미 공개한 음식과 별칭을 제외하고, 배수 1.3 이상인 음식 중 점수 상위 3개까지 확인한다. 같은 제작자의 반복 영상을 제외하고 최근 서로 다른 제작자 2명 이상의 영상이 필요하다.
4. 공식 `videos.list`의 설명란에서 전체 조리 시간·분량·재료별 사용량·조리 단계가 확인되는 원문 하나를 선택한다. AI의 추출 결과를 실제 설명란과 대조한다. 재료명·사용량·시간·분량·단계 근거가 없거나 숫자가 달라지면 보류한다. 서로 다른 레시피를 합치거나 조리법을 추측하지 않는다.
5. 통과한 새 레시피를 `web/src/data/content/foods.json`에 추가한다. 기존 글·주소·사진·확인 날짜는 바꾸지 않는다. 새 글에는 확인 날짜·출처·확인한 연도·자동 대조 및 개별 미검수 안내를 붙인다. 연도는 수집으로 확인한 시기이며 최초 유행 연도를 확정하지 않는다.
6. 사진 검색 뒤 콘텐츠 검사·lint·typecheck·단위 테스트·모바일/PC 브라우저 검사를 모두 통과해야 음식 JSON·사진 파일·크레딧·번들 목록을 함께 자동 커밋한다. 같은 실행에서 재사용 `deploy` 워크플로를 직접 호출해 그 커밋을 Cloudflare Pages에 배포한다. `GITHUB_TOKEN`의 push는 다른 push 워크플로를 실행하지 않으므로 push만으로 배포를 기대하지 않는다.

근거가 부족한 음식은 자동 게시하지 않고 기존 관리자 후보 큐와 실행 보고서에 남긴다. 다음 실행에서 다시 확인한다. 완제품 제조법은 자동 생성하지 않는다. 자동 반영은 최대 1000개까지 추가하며 한도에 이르면 기존 글을 지우지 않고 보류한다.

## 사진

2026-11-13 팀장 요청으로 Commons에 Openverse·Pexels 공식 검색 API를 추가했다. Openverse는 현재 Flickr의 원문·이미지 CDN으로 확인되는 사진만 처리하며 CC0·퍼블릭 도메인·CC BY 4.0·CC BY-SA 4.0 조건을 유지한다. 색인의 라이선스 이름·버전·URL·작가·원문/파일 ID·해상도·성인물 여부를 검사하고, 임의 호스트는 내려받지 않는다. Openverse 색인이 원작자의 현재 이용 조건까지 보장하는 것은 아니다. Pexels는 별도의 Pexels License로 처리하며 원문·파일 ID·작가를 보존하고, 푸터의 Pexels 링크와 상세의 사진·작가·라이선스 링크로 출처를 표시한다. Pexels 사진을 CC 라이선스로 바꾸어 표시하지 않는다.

`PEXELS_API_KEY`를 저장소의 GitHub Actions Secret에 등록하면 예약 작업에서도 Pexels를 사용한다. 키가 없으면 Commons·Openverse만 검색하며, 키는 Pexels 검색 API에만 전송하고 파일 다운로드·AI 입력·실행 보고서에 넣지 않는다. 한 검색처의 연결/한도 오류는 다른 검색처를 막지 않으며 `data/photo-report.json`의 `sources`는 설정 여부, `searchWarnings`는 검색 실패 출처를 기록한다. 키가 없거나 실제 호출이 실패한 출처를 연결 완료로 판단하지 않는다.

검색어는 음식별 최대 3개, 출처·검색어 후보를 번갈아 선택해 최대 6장의 실제 이미지만 대조한다. 기존 최대 3장보다 판별 호출이 늘 수 있다. 검토에서 내린 자동 사진도 출처는 재사용하지 않으며, 다른 적합 사진을 확보하면 `photo-auto-<slug>-2`처럼 새 키로 저장해 제외 이력을 덮어쓰지 않는다.

2026-11-13 추가 요청으로 현재 음식은 텍스트 카드 대신 실사 또는 생성 이미지를 보여준다. 적합한 실사 4개를 유지하고, 준비 중이던 26개는 대화의 내장 `image_gen`으로 개별 생성해 연결했다. `web/src/data/content/generated-images.json`에 음식 주소·도구·생성일·최종 프롬프트·안내를, `web/src/assets/generated/`에 1200×800 WebP 파일을 보존한다. `web/src/lib/generated-photos.ts`는 실사 번들과 분리하므로 `photos:sync`가 생성 파일 연결을 덮어쓰지 않는다. 카드·상세·alt에 AI 생성 예시를 표시하고 실제 제품 또는 직접 조리 사진으로 표시하지 않는다. 실제 사진의 CC 라이선스를 생성 이미지에 부여하지 않는다.

이번 생성은 대화에서 수행했으며 GitHub 예약 생성 API를 추가하거나 연결한 것은 아니다. 2026-11-13 팀장이 실사 우선 방식을 승인해, 생성 예시가 연결된 음식도 실사 검색 대상으로 바꿨다. 등록부의 음식 주소와 일치하는 생성 이미지만 대상으로 삼고, 기존 실사나 운영자 업로드 사진이 본문·히어로에 있으면 보존한다. 실사가 모든 검증을 통과하면 본문 사진을 교체하고 이전 생성 히어로를 해제한다. 검색·다운로드·판별에 실패하거나 적합한 실사가 없으면 생성 이미지와 안내를 그대로 유지한다. 교체 후에도 생성 파일·프롬프트 기록은 보존한다. 실행 보고서의 `accepted[].replacedGenerated`와 `deferred[].retainedGenerated`로 실제 교체와 기존 예시 유지를 구분한다.

전체 이미지 검사는 `pending`이 있는 변경의 게시를 막으므로, 새 음식에 실사도 생성 예시도 없으면 자동 반영은 보류된다. 모든 새 음식에 생성 이미지까지 자동 공급하려면 별도 예약 생성 API·비용 한도·결과 검사를 연결해야 한다. 예외 데이터의 사진 없는 텍스트 표시 코드는 남아 있지만 현재 공개 JSON에는 대상이 없다.

새 음식은 `pending`으로 시작하고, 같은 예약 작업에서 `npm run photos:auto`가 새 음식·기존 준비 중 사진·생성 예시의 실사를 찾는다. 기본 5개씩 UTC 날짜 단위로 순환하며, 매일 같은 시간에 실행해도 다음 묶음을 확인한다. 생성 이미지 교체를 위해 일일 검색 개수나 음식별 최대 6장 판별 한도를 늘리지는 않는다. Actions 수동 실행의 `photos_only=true`, `photo_limit=20`으로 음식 수집 없이 최대 20개를 한 번에 확인할 수 있다.

Commons 공식 검색·이미지 정보 API에서 한국어·영어·통용 이름으로 찾는다. 코드가 CC0·퍼블릭 도메인·CC BY 4.0·CC BY-SA 4.0 표시와 해당 라이선스의 공식 URL·작가·출처·별도 제한 없음·해상도를 먼저 확인한다. 비영리·변경 금지 조건이나 알 수 없는 라이선스는 자동 사용하지 않는다. 기존 모델에 실제 사진 바이트와 음식·파일 설명을 함께 보내, 같은 메뉴·실제 사진·가림 없음·메타데이터 일치가 모두 참이고 모델의 신뢰 응답이 0.95 이상일 때만 적용한다. 이 값은 정확도 보장이 아니다. AI 판별 오류가 있을 수 있으므로 자동 대조·개별 미검수 안내와 원문 링크를 표시한다. 다른 속재료·브랜드·제품·그림·AI 생성·간판·확신할 수 없는 사진은 보류한다.

통과한 사진은 크기·형식을 WebP로 바꾸어 저장한다. 제목·원문·작가·이용 조건·라이선스 링크·추가 저작자 표시·확인 날짜·Commons 문서 ID·원본 SHA1을 `web/src/data/content/auto-photo-credits.json`에 보존하고 실제 콘텐츠와 번들 import 목록을 함께 바꾼다. 상세 페이지에 제목·작가·원본·라이선스 링크·변환 안내를 표시하고, CC BY-SA 변환본은 원본과 같은 라이선스로 제공한다. 사이트 자체 글의 복사 제한을 이 사진들에 적용하지 않는다. 원본 SHA1은 Commons 원본의 식별값이며 변환본의 해시는 아니다. 기존 실사·조리법·출처 확인 날짜는 바꾸지 않고, 같은 사진을 다른 음식에 재사용하지 않는다. 검색·다운로드·판별 실패와 적합한 사진이 없는 경우는 기존 생성 예시 또는 준비 중 상태를 보존해 다음 실행에서 다시 확인한다. AI 한도 오류는 새 사진 파일을 쓰기 전에 전체 실패로 처리한다. 실사 검색 단계에서는 플랫폼 썸네일·스크래핑·생성 사진을 쓰지 않는다.

2026-11-13 사진 품질 재검토에서 기존 사진 9개를 내렸다. 따뜻한 말차 라떼에 다른 아이스 음료 두 잔을 쓰거나, 기본 크로플에 오레오 크림 사진을 붙이는 등 레시피와 다른 사진과 책상·매대 중심 사진을 제외했다. 사용자 추가 검토에 따라 포장 용기와 주변 여백이 두드러지는 두바이 쫀득쿠키 자동 사진도 제외했다. 이후 위 생성 이미지 요청 당시 로컬 공개 콘텐츠는 실사 4개·생성 예시 26개·준비 중 0개였다. 제외 사유는 등록부의 `rejectedReason`에 보존하며, 해당 키는 공개 콘텐츠 본문·히어로에 다시 사용할 수 없다. 원본 파일·출처·라이선스 기록은 보존한다.

자동 판별에는 레시피의 조리 단계도 제공한다. 주요 재료·토핑·소스·음료 온도·조리 형태가 맞는 `recipeMatches`와 음식 중심의 구도·식별 가능성을 확인하는 `presentationSuitable`가 모두 참이어야 한다. 전체 사진·3:2 음식 카드·PC 상세(1280×520)·모바일 상세(390×440)의 네 구도를 같은 판별 요청에서 검사한다. 세로·정사각 실사의 상세는 원본 비율을 보존하며, 검사 미리보기의 투명 여백은 실제 화면에서 같은 사진의 흐린 배경으로 채운다. 다른 음료가 함께 주인공이거나 책상·가격표·조리 중인 매대가 두드러진 사진, 거품만 남고 잔·우유가 사라지는 크롭, 반사·색 번짐·부적절한 조명으로 먹음직스럽지 않은 사진은 보류한다. 하루 5개·음식당 후보 6개와 예약 시각은 그대로다. 새 항목이 없는 이전 형식 응답도 승인하지 않는다. 이 보완으로도 AI의 실제 판별 정확도가 보장되지는 않는다.

사람이 검토한 사진은 기존처럼 `web/src/data/photo-credits.ts`에 등록할 수 있다. `npm run photos:sync`는 자동 등록분을 포함한 전체 등록 사진과 번들 목록을 다시 내려받는다. 재검토에서 내린 사진은 이 명령으로 파일이 내려받아져도 공개 글에 다시 연결되지 않는다.

출처 표시·라이선스 링크·변경 안내는 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), 동일 라이선스로 변환본을 제공하는 조건은 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 안내를 기준으로 구현했다.

추가 검색처의 기준은 [Openverse 공식 API](https://api.openverse.org/v1/), [Openverse 매체 필드](https://github.com/WordPress/openverse/blob/main/documentation/meta/media_properties/api.md), [Pexels 공식 API](https://www.pexels.com/api/documentation/), [Pexels License](https://www.pexels.com/license/)를 확인했다. 실제 검색·다운로드·AI 판별의 성공과 사진 확보율은 각 실행 보고서로 확인해야 한다.

2026-11-13 추가 실사 확보: 생성 이미지가 대부분이라는 사용자 의견에 따라 Codex가 Commons 공식 API 후보의 원본과 설명·라이선스를 열어 대조했다. 두바이 쫀득쿠키 단면·소금빵·달고나 커피·따뜻한 말차 라떼·달고나 뽑기 5개를 새 실사로 교체해 현재 연결은 실사 9개·생성 예시 21개·준비 중 0개다. 이번 일회성 검토는 예약 실행의 자동 판별 통과 건수와 구분한다. `auto-photo-credits.json`의 `photo-reviewed-*` 키는 `automatic: false`이며 Codex 대조·운영자 개별 미검수·직접 조리 사진 아님·원본과 같은 CC BY-SA 4.0 변환 조건을 표시한다. 기존 제외 사진을 재사용하지 않았으며 생성 원본·프롬프트와 하루 5개 예약 검색 한도를 보존했다. 남은 음식은 같은 메뉴와 이용 조건을 확인할 실사가 더 필요하다.

## 쿠팡 재료 링크

같은 매일 10:17 KST 작업에서 `PIPELINE_AUTO_COUPANG=true`이면 공식 파트너스 검색 API의 실제 상품별 제휴 링크를 재료에 연결한다. 설정·조건·한도·미설정 처리·실제 계정 검증은 [쿠팡 링크 자동화](coupang-automation.md)를 따른다. API 키와 등록 채널 ID가 없으면 건너뛰고 기존 검색 연결을 유지한다. 사진만 실행하는 `photos_only=true`에서는 쿠팡 검색을 하지 않으며, `links_only=true`로 음식·사진 수집 없이 링크만 확인할 수 있다.

## 설정과 중지

GitHub Secrets: `YOUTUBE_API_KEY`, `NAVER_API_HUB_KEY_ID`, `NAVER_API_HUB_KEY`, 선택한 AI 공급자의 키, 기존 Supabase·Cloudflare 키. 값은 채팅·문서·코드에 쓰지 않는다. GitHub Variables는 다음과 같다.

| 이름 | 값·역할 |
| --- | --- |
| `AI_PROVIDER`, `AI_MODEL` | 기존에 선택한 공급자·모델 유지. 자동화에서 모델을 임의 변경하지 않는다. |
| `PIPELINE_AUTO_PUBLISH` | `true`는 자동 대조·반영. `false`면 기존 후보 수집만 계속한다. |
| `PIPELINE_AUTO_PHOTOS` | 기본 활성. `false`면 사진 자동 검색·적용만 중지한다. |
| `PIPELINE_AUTO_COUPANG` | `true`이면 쿠팡 링크 자동 연결. 키·등록 채널 ID 미설정 시 건너뛴다. `false`면 링크 자동화만 중지한다. |
| `COUPANG_SUB_ID` | 파트너스 계정에 미리 등록한 채널 ID. 음식 slug를 임의로 사용하지 않는다. |
| `TF_CONTENT_ONLY` | `1`이면 출처 확인 JSON이 공개 페이지의 원본이다. |

공개 JSON 모드에서는 관리자 화면의 Supabase 글 편집이 JSON 글을 바꾸지 않는다. 출처 확인 글은 JSON 또는 아래 `content:import`로 수정한다. 기존 Supabase 관리·로그인·사진 업로드 기능은 보존했다. `TF_CONTENT_ONLY=0`이면 기존 DB 공개 모드로 돌아가며, JSON 자동 반영을 공개하려면 `1`을 유지한다.

`pipeline` 실행 요약과 14일 보관 `automation-report` 아티팩트의 `automation-report.json`·`photo-report.json`에 적용 가능 항목·사진 출처·보류 이유가 나온다. 설명란 원문·내부 근거 인용·이미지 바이트는 보고서에 저장하지 않는다. 개별 음식의 설명란 조회·근거 검증 실패는 그 음식을 보류한다. 수집 전체·AI 한도·검사 실패 시 새 커밋을 만들지 않는다. 배포 실패 시 기존 사이트는 유지되고 새 데이터 커밋은 남으므로 Actions의 `deploy`를 다시 실행한다. 수집 중 main이 바뀌면 반영을 중지하고 다음 실행에서 다시 시도한다.

## 로컬 명령 (web 폴더)

```bash
npm run pipeline -- --auto-publish --dry-run # 실제 API 키 필요. 검증 보고서만 만들고 페이지·DB는 바꾸지 않음
npm run content:check
npm run content:import -- 수집결과.json --approve # 사람이 확인한 초안 병합
npm run photos:sync
npm run photos:auto -- --dry-run # AI 키 필요. 보고서만 저장하고 사진·페이지·등록부는 보존
npm run links:auto -- --dry-run # 쿠팡·AI 키 필요. 실제 API 호출 횟수는 기록하고 공개 콘텐츠는 보존
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run test:content
```

`test:e2e`는 기존 관리자·예시 데이터 기능, `test:content`는 실제 JSON 전체와 연도 필터·사진·출처를 검사한다. 두 브라우저 검사는 같은 `out/`을 사용하므로 순서대로 실행한다. 데이터 개수를 고정하지 않아 새 음식이 추가돼도 검사한다. `test:content`를 마지막에 실행하면 공개 콘텐츠의 정적 빌드가 남는다.

근거: [YouTube videos.list](https://developers.google.com/youtube/v3/docs/videos/list), [네이버 HUB 검색어 트렌드](https://api.ncloud-docs.com/docs/naver-api-hub-search-trend), [GitHub 토큰의 워크플로 실행 제약](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow), [Commons 이미지 정보](https://www.mediawiki.org/wiki/API:Imageinfo), [공식 OpenAI 이미지 입력](https://developers.openai.com/api/docs/guides/images-vision), [Gemini 이미지 입력](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding).
