# 같은 영상 제목으로 Mini와 Astra 비교

- 날짜: 2026-11-12
- 누가: Codex
- 관련: docs/spec.md R17

## 한 것
- 수동 수집의 `compare_models` 옵션을 켜면 최신·인기 검색 결과를 한 번 모은다. 중복 제거한 제목을 두 OpenAI 모델에 같은 프롬프트로 보낸다.
- 추출 결과, 제목에 그대로 포함된 음식명 개수와 토큰 사용량을 기록한다. 비교 실행은 Supabase에 연결하지 않는다.

## 바뀐 파일
- `.github/workflows/pipeline.yml` — 수동 비교 옵션.
- `web/scripts/pipeline/run.ts`, `llm.ts` — 같은 입력으로 비교하고 모델별 응답 토큰 상한을 적용한다.
- `web/scripts/pipeline/compare.test.ts` — 같은 요청 입력·중복 제거·저장소 미접속 확인.

## 검사 결과
```text
> eslint
✓ Types generated successfully
ℹ tests 67
ℹ pass 67
ℹ fail 0
122 passed (31.1s)
```

## 정한 것·남은 것
- 비교는 모델마다 한 번 호출하며 출력은 최대 4,096토큰으로 제한한다.
- 제목에 같은 문자열이 있으면 후보의 근거를 찾기 쉽다. 이 숫자로 음식의 정확도를 판정할 수는 없다.
- 실제 키를 사용하는 비교는 main 반영 후 실행한다.
