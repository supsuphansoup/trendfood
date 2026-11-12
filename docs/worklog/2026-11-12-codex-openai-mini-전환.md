# 자동 수집 모델을 GPT-5.4 Mini로 변경

- 날짜: 2026-11-12
- 누가: Codex
- 관련: docs/spec.md R17

## 한 것
- 음식명 추출과 상세 초안에 쓰는 GitHub Actions 변수 `AI_MODEL`을 `gpt-5.4-nano`에서 `gpt-5.4-mini`로 바꿨다.
- 실제 수집에서 영상 69개를 분석하고 음식명 20개를 추출했다. 상승률 확인 전 후보 3개를 저장했다.
- 입력 2,493·출력 418토큰을 사용했다. 초안 생성 대상이 없어서 이번 비용은 음식명 추출 1회 기준 약 $0.00375다.

## 바뀐 파일·설정
- GitHub Actions 저장소 변수 `AI_MODEL` 변경.
- 애플리케이션 코드 변경 없이 이 작업 기록을 추가했다.

## 검사 결과
```text
> eslint
✓ Types generated successfully
ℹ tests 66
ℹ pass 66
ℹ fail 0
122 passed (29.4s)
```
- 실제 수집 [43142029762](https://github.com/supsuphansoup/trendfood/actions/runs/43142029762) 성공. 로그에서 `gpt-5.4-mini` 사용을 확인했다.

## 정한 것·남은 것
- 음식명 추출과 초안 품질 개선을 목표로 Responses API 구조화 출력을 지원하는 Mini를 선택했다.
- 이번 실행에서 음식명 20개 상한을 지켰다. 같은 입력의 정답 목록과 대조한 정확도 비교와 Mini의 실제 초안 품질 확인은 남아 있다.
- 이전 실행의 전체 토큰 수에 Mini 요율을 적용하면 하루 3회 기준 30일에 약 $1.30이다. 실제 비용은 초안 수에 따라 달라진다.
