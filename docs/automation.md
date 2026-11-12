# 트렌드 음식 자동 반영

2026-11-12 팀장의 요청으로 음식 수집 뒤 검증·페이지 반영·배포와 사진 검색·적용을 연결했다. 출처 확인 콘텐츠는 기존 10개 주소를 포함한 음식 30개(레시피 27개·완제품 안내 3개)에서 시작한다. 사진은 검토 사진 10개와 준비 중 20개에서 시작하며, 자동 검색으로 준비 중 사진을 채운다. 개수는 자동 반영으로 바뀐다.

## 실행과 반영 조건

GitHub Actions `pipeline`이 한국 시간 06:00·14:00·22:00에 실행된다. GitHub 예약은 지연될 수 있으며 공개 저장소가 60일 무커밋이면 중지될 수 있다. Actions의 `Run workflow`로 즉시 실행할 수도 있다.

1. YouTube 공식 API에서 최근 7일 인기 영상과 최근 48시간 최신 영상을 검색하고 음식 이름을 추출한다.
2. 네이버 API HUB의 실제 검색 추이로 최근 3일 평균 / 앞선 11일 평균을 계산한다. 예시 데이터는 저장·반영하지 않는다.
3. 이미 공개한 음식과 별칭을 제외하고, 배수 1.3 이상인 음식 중 점수 상위 3개까지 확인한다. 같은 제작자의 반복 영상을 제외하고 최근 서로 다른 제작자 2명 이상의 영상이 필요하다.
4. 공식 `videos.list`의 설명란에서 전체 조리 시간·분량·재료별 사용량·조리 단계가 확인되는 원문 하나를 선택한다. AI의 추출 결과를 실제 설명란과 대조한다. 재료명·사용량·시간·분량·단계 근거가 없거나 숫자가 달라지면 보류한다. 서로 다른 레시피를 합치거나 조리법을 추측하지 않는다.
5. 통과한 새 레시피를 `web/src/data/content/foods.json`에 추가한다. 기존 글·주소·사진·확인 날짜는 바꾸지 않는다. 새 글에는 확인 날짜·출처·확인한 연도·자동 대조 및 개별 미검수 안내를 붙인다. 연도는 수집으로 확인한 시기이며 최초 유행 연도를 확정하지 않는다.
6. 사진 검색 뒤 콘텐츠 검사·lint·typecheck·단위 테스트·모바일/PC 브라우저 검사를 모두 통과해야 음식 JSON·사진 파일·크레딧·번들 목록을 함께 자동 커밋한다. 같은 실행에서 재사용 `deploy` 워크플로를 직접 호출해 그 커밋을 Cloudflare Pages에 배포한다. `GITHUB_TOKEN`의 push는 다른 push 워크플로를 실행하지 않으므로 push만으로 배포를 기대하지 않는다.

근거가 부족한 음식은 자동 게시하지 않고 기존 관리자 후보 큐와 실행 보고서에 남긴다. 다음 실행에서 다시 확인한다. 완제품 제조법은 자동 생성하지 않는다. 자동 반영은 최대 1000개까지 추가하며 한도에 이르면 기존 글을 지우지 않고 보류한다.

## 사진

새 음식은 `pending`으로 시작하고, 같은 예약 작업에서 `npm run photos:auto`가 새 음식과 기존 준비 중 사진을 찾는다. 기본 5개씩 8시간 단위로 순환한다. Actions 수동 실행의 `photos_only=true`, `photo_limit=20`으로 음식 수집 없이 최대 20개를 한 번에 확인할 수 있다.

Commons 공식 검색·이미지 정보 API에서 한국어·영어·통용 이름으로 찾는다. 코드가 CC0·퍼블릭 도메인·CC BY 4.0·CC BY-SA 4.0 표시와 해당 라이선스의 공식 URL·작가·출처·별도 제한 없음·해상도를 먼저 확인한다. 비영리·변경 금지 조건이나 알 수 없는 라이선스는 자동 사용하지 않는다. 기존 모델에 실제 사진 바이트와 음식·파일 설명을 함께 보내, 같은 메뉴·실제 사진·가림 없음·메타데이터 일치가 모두 참이고 모델의 신뢰 응답이 0.95 이상일 때만 적용한다. 이 값은 정확도 보장이 아니다. AI 판별 오류가 있을 수 있으므로 자동 대조·개별 미검수 안내와 원문 링크를 표시한다. 다른 속재료·브랜드·제품·그림·AI 생성·간판·확신할 수 없는 사진은 보류한다.

통과한 사진은 크기·형식을 WebP로 바꾸어 저장한다. 제목·원문·작가·이용 조건·라이선스 링크·추가 저작자 표시·확인 날짜·Commons 문서 ID·원본 SHA1을 `web/src/data/content/auto-photo-credits.json`에 보존하고 실제 콘텐츠와 번들 import 목록을 함께 바꾼다. 상세 페이지에 제목·작가·원본·라이선스 링크·변환 안내를 표시하고, CC BY-SA 변환본은 원본과 같은 라이선스로 제공한다. 사이트 자체 글의 복사 제한을 이 사진들에 적용하지 않는다. 원본 SHA1은 Commons 원본의 식별값이며 변환본의 해시는 아니다. 기존 사진·조리법·출처 확인 날짜는 바꾸지 않고, 같은 사진을 다른 음식에 재사용하지 않는다. 검색·다운로드·판별 실패와 적합한 사진이 없는 경우는 준비 중으로 남겨 다음 실행에서 다시 확인한다. AI 한도 오류는 새 사진 파일을 쓰기 전에 전체 실패로 처리한다. 플랫폼 썸네일·스크래핑·생성 사진을 쓰지 않는다.

사람이 검토한 사진은 기존처럼 `web/src/data/photo-credits.ts`에 등록할 수 있다. `npm run photos:sync`는 자동 등록분을 포함한 전체 등록 사진과 번들 목록을 다시 내려받는다.

출처 표시·라이선스 링크·변경 안내는 [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), 동일 라이선스로 변환본을 제공하는 조건은 [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) 안내를 기준으로 구현했다.

## 설정과 중지

GitHub Secrets: `YOUTUBE_API_KEY`, `NAVER_API_HUB_KEY_ID`, `NAVER_API_HUB_KEY`, 선택한 AI 공급자의 키, 기존 Supabase·Cloudflare 키. 값은 채팅·문서·코드에 쓰지 않는다. GitHub Variables는 다음과 같다.

| 이름 | 값·역할 |
| --- | --- |
| `AI_PROVIDER`, `AI_MODEL` | 기존에 선택한 공급자·모델 유지. 자동화에서 모델을 임의 변경하지 않는다. |
| `PIPELINE_AUTO_PUBLISH` | `true`는 자동 대조·반영. `false`면 기존 후보 수집만 계속한다. |
| `PIPELINE_AUTO_PHOTOS` | 기본 활성. `false`면 사진 자동 검색·적용만 중지한다. |
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
npm run lint
npm run typecheck
npm run test:unit
npm run test:e2e
npm run test:content
```

`test:e2e`는 기존 관리자·예시 데이터 기능, `test:content`는 실제 JSON 전체와 연도 필터·사진·출처를 검사한다. 두 브라우저 검사는 같은 `out/`을 사용하므로 순서대로 실행한다. 데이터 개수를 고정하지 않아 새 음식이 추가돼도 검사한다. `test:content`를 마지막에 실행하면 공개 콘텐츠의 정적 빌드가 남는다.

근거: [YouTube videos.list](https://developers.google.com/youtube/v3/docs/videos/list), [네이버 HUB 검색어 트렌드](https://api.ncloud-docs.com/docs/naver-api-hub-search-trend), [GitHub 토큰의 워크플로 실행 제약](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow), [Commons 이미지 정보](https://www.mediawiki.org/wiki/API:Imageinfo), [공식 OpenAI 이미지 입력](https://developers.openai.com/api/docs/guides/images-vision), [Gemini 이미지 입력](https://ai.google.dev/gemini-api/docs/generate-content/image-understanding).
