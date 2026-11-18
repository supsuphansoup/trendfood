# 팀원 공통 변경 통합·푸시 절차

팀원 PC에서도 최신 `main`을 받은 뒤 아래 설치를 한 번 실행한다. `AGENTS.md`·`CLAUDE.md`와 훅·검사 스크립트는 모두 GitHub에서 함께 내려온다. AI 도구가 규칙 파일을 자동으로 읽지 않는다면 작업 시작 때 `AGENTS.md`를 읽도록 지시한다.

## 처음 한 번

Node 24·Git과 저장소가 준비된 상태에서, 기존 작업은 먼저 보존하고 최신 코드를 받는다. 저장소 루트에서:

```sh
git pull --rebase origin main
cd web
npm ci
git config --get core.hooksPath
```

마지막 출력이 `.githooks`이면 활성화됐다. 의존성이 이미 설치되어 있다면 `npm run team:setup`으로 훅만 켤 수 있다. `npm ci`의 `prepare` 단계에서 설치하므로 `--ignore-scripts`를 사용했다면 별도로 `npm run team:setup`을 실행한다. Playwright 브라우저가 없는 PC는 `npx playwright install chromium`도 한 번 실행한다.

기존 `core.hooksPath` 설정이나 기본 `pre-push` 훅이 있으면 덮어쓰지 않고 설치를 중단한다. 기존 훅의 담당자와 통합한 뒤 공통 훅과 기존 검사를 모두 호출하도록 구성한다. 자동으로 기존 훅을 지우거나 설정을 바꾸지 않는다. GitHub Actions에서는 로컬 훅 설치를 건너뛰며 기존 CI 검사를 유지한다.

## 이후 작업할 때

1. 작업 시작 전 `git status --short`, `git fetch origin main`으로 내 변경과 최신 팀원 변경을 확인한다.
2. `AGENTS.md`에 따라 작업하고 `docs/worklog/`에 기록한다. 내 작업만 커밋한다.
3. 푸시 전 원격 diff와 팀원 작업 기록을 읽고 `git pull --rebase origin main`으로 통합한다. 충돌은 양쪽 의도를 보존해 해결한다.
4. 저장소 루트에서 `git push origin HEAD:main`을 실행한다. 훅이 원격을 다시 확인하고, 코드·설정 변경이 있으면 `web/`의 `lint`, `typecheck`, `test:unit`, `test:e2e`를 순서대로 실행한다. 공개 화면·콘텐츠 관련 경로는 `test:content`도 실행한다.
5. 검사 중 원격이 바뀌면 푸시를 막는다. 새 변경을 읽고 통합·검사를 반복한다. `--force`, `--force-with-lease`, `--no-verify`로 우회하지 않는다.

문서(`.md`)만 바뀐 경우 훅은 diff 공백 검사와 원격 재확인만 수행한다. 문서의 경로·명령·내용 검토는 작업자가 별도로 수행한다. 미커밋 변경, 현재 HEAD가 아닌 커밋의 main 푸시, main 삭제도 막는다. main 이외 브랜치 푸시에는 이 검사를 실행하지 않는다.

## 자동화 범위

훅은 최신 원격 커밋 포함 여부와 검사를 확인한다. 원격에 없는 팀원의 작업, 변경 의도, 의미상 충돌까지 판단하거나 자동 rebase·충돌 해결을 하지는 않는다. 검사를 통과한 뒤 다른 사람이 먼저 푸시하면 Git의 일반 푸시 거절에 따라 다시 통합한다.

`git clone`·`git pull`만으로 PC의 훅 설정이 활성화되지는 않으므로 **팀원마다 위 설치가 한 번 필요하다.** 로컬 훅은 사용자가 설정을 해제하거나 우회할 수 있다. 이 작업은 GitHub 브랜치 보호 정책을 변경하지 않는다.

근거: [Git pre-push 훅](https://git-scm.com/docs/githooks#_pre_push), [npm ci의 prepare 실행 순서](https://docs.npmjs.com/cli/v11/using-npm/scripts/#npm-ci).
