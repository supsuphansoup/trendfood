# docs

"AI 에이전트와 개발하는 법: intent → spec → plan" 가이드에 맞춘 문서 모음.
원본 아이디어: `../유행레시피_커미션_아이디어정리.pdf` — 가이드의 STEP 1-a 인터뷰는 이 메모로 대신했고, 남은 인터뷰 항목은 `questions.md`로 옮겼다.

| 문서 | 단계 | 상태 |
| --- | --- | --- |
| [intent.md](intent.md) | 1 기획 — 무엇을, 왜 | draft |
| [spec.md](spec.md) | 2 설계 — 어떻게 보이고 동작하는가 | draft (AI 임시값 포함) |
| [plan.md](plan.md) | 3 구현 계획 | 초안 · 구현 보류 |
| [questions.md](questions.md) | 결정 대기 질문 Q1~Q16 | 진행 중 |
| [../AGENTS.md](../AGENTS.md) | AI가 매번 읽는 프로젝트 설명서 | 초안 |

## 체크리스트 (가이드 4장)
- 시작 전: [ ] 프로젝트 초기화·첫 커밋 (Q15·Q16 결정 후) · [x] 문서 위치를 `docs/`로 정함
- 기획 후: [ ] intent.md를 직접 읽고 내 의도와 맞는지 확인 · [ ] 커밋
- 설계 후: [ ] Areas of concern 전부 결정 · [ ] Open questions 결정/이월 · [ ] 커밋
- 구현 전: [ ] 계획에서 가장 위험한 부분 물어보기 · [ ] 단계별 확인 방법 있음
- 구현 후: [ ] 빌드/테스트 출력 직접 확인 · [ ] 반복된 실수는 AGENTS.md에 기록
- 문제 발생: 코드부터 고치지 말고 새 intent.md로 1단계부터 다시
