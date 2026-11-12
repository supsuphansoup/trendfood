# OpenAI 수집 토큰 사용량 측정

- 날짜: 2026-11-12
- 누가: Codex
- 관련: docs/spec.md R17

## 한 것
- OpenAI 응답의 입력·캐시 입력·출력 토큰 수를 수집 실행 로그에 기록한다.
- 토큰 수로 실제 요청의 표준 요금 기준 비용을 계산할 수 있다.

## 바뀐 파일
- `web/scripts/pipeline/llm.ts` — 모델과 토큰 수만 기록.
- `web/scripts/pipeline/llm.test.ts` — 응답 파싱과 로그 필드 검사.

## 검사 결과
```text
> eslint
✓ Types generated successfully
ℹ tests 66
ℹ pass 66
ℹ fail 0
120 passed (29.2s)
```

## 정한 것·남은 것
- OpenAI 응답에 사용량이 없으면 null로 기록한다. 요율은 바뀔 수 있으므로 코드에 고정하지 않는다.
- 저장소에 등록된 키를 사용하는 실제 실행에서 토큰 수를 확인한다. 계정 잔액은 실행 로그에서 확인할 수 없다.
