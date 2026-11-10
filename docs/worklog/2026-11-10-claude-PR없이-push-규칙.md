# PR 없이 main 에 바로 push 하도록 규칙 변경, 커뮤니티 크롤링 보류 기록

- 날짜: 2026-11-10
- 누가: 팀장 (AI 도구: Claude Code)
- 관련: docs/spec.md Open questions 8 / 커밋 (이 기록과 같은 커밋)

## 한 것
- 팀장 결정으로 PR 단계를 없애고 `main` 에 바로 push 하도록 문서 규칙을 바꿨다. push 전 `git pull --rebase` + 검사 4개.
- 바로 push 해도 화면 검사가 돌도록 `ci.yml` 이 `main` push(앱 코드·ci.yml 이 바뀐 경우)에도 실행되게 했다. 배포(`deploy.yml`)는 원래부터 lint·typecheck·unit 을 통과해야 올라가서 그대로 뒀다.
- "유행 신호용 커뮤니티 크롤링" 검토 결과를 Open questions 8 에 **보류**로 남겼다 (디시 약관 제16조 금지, 에펨코리아 봇 확인, 더쿠 미확인).

## 바뀐 파일
- `CLAUDE.md` — 원격 저장소 규칙(바로 push), 워크플로 표의 ci 설명
- `ONBOARDING.md` — 0장 3번 규칙, 작업 기록·수업 기록 안내의 "PR" → 커밋·push, 폴더 그림의 ci 설명
- `AGENTS.md` — 작업 흐름(바로 push), 작업 기록은 같은 커밋에
- `docs/worklog/README.md` — "PR" → 커밋·push
- `.github/workflows/ci.yml` — `push: main`(paths: `web/**`, ci.yml) 트리거 추가
- `docs/spec.md` — Open questions 8 (크롤링 보류)

## 검사 결과
- lint / typecheck / test:unit(7개) / test:e2e(28개): 모두 통과 (팀원 PR #1 병합본 기준)

## 정한 것·남은 것
- 문서만 바뀐 push 에서는 ci 를 돌리지 않게 paths 를 걸었다 (배포와 같은 기준).
- 연속 push 하면 앞선 ci 실행은 취소된다(`cancel-in-progress`). 마지막 실행 결과만 보면 된다.
- 수업에서 확인받을 것: PR 없이 바로 push (ONBOARDING 0장 3번).
