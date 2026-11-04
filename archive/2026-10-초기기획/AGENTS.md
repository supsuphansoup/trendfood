# AGENTS.md

유행 레시피 × 재료 커미션 서비스. 유행하는 레시피의 조리법·재료를 보여 주고, 필요한 재료를 제휴 쇼핑몰 장바구니에 한 번에 담게 해서 구매 수수료를 받는다.

**현재 단계: 기획·설계 문서만 있음. 사용자가 지시하기 전에는 코드를 만들지 않는다.**

## Commands
아직 없음 — 기술 스택 미정 (`docs/questions.md` Q15). STEP 0 이후 빌드·테스트·실행 명령을 여기에 적는다.

## Conventions
- 문서는 `docs/`에 둔다. 순서: intent.md → spec.md → plan.md → 코드. 다음 단계는 항상 앞 단계 문서를 읽고 시작한다.
- 결정이 필요한 것은 임의로 정하지 말고 `docs/questions.md`에 추가한다. 결정되면 그 파일의 `결정:`을 채우고 관련 문서에 반영한다.
- AI가 임의로 정한 수치·규칙은 spec.md의 Areas of concern에 적는다.
- 문서와 응답은 한국어로 쓴다. 커밋 = 승인이므로 사용자가 확인한 뒤 커밋한다.

## Architecture
미정. 현재 저장소 구성:
- `docs/` — 기획·설계 문서 (`docs/README.md`에 문서 지도와 체크리스트)
- `index.html` — 이전 커밋의 데모 UI (단일 HTML + Tailwind CDN). 참고용이며 유지 여부는 Q16
- `유행레시피_커미션_아이디어정리.pdf` — 원본 아이디어 메모

## Verifying your work
완료 보고 전 `<빌드/테스트 명령>`(스택 확정 후 기입)을 실행하고 출력을 그대로 보여줄 것, 실패하면 코드를 고칠 것.
문서만 바꾼 경우: 가이드의 섹션 구조(intent/spec/plan)가 유지되는지, questions.md의 질문 번호와 다른 문서의 참조가 맞는지 확인한다.

## Things the agent gets wrong
