# 현재 음식 이미지 변경을 실제 서비스에 반영하기

현재 작업의 배포 대상은 기존 `supsuphansoup/trendfood` 저장소의 `main`과 Cloudflare Pages `trendfood`다. 호스팅을 새로 만들지 않는다. 공개 JSON 모드에서는 현재 음식 이미지와 실사 우선 교체 코드가 함께 반영돼야 한다.

## 현재 실행 환경의 제약

2026-11-13 초기 제한 세션에서는 GitHub API 요청이 소켓 접근 권한 거부, `git ls-remote`가 연결 실패로 끝났다. 이후 사용자가 전체 액세스로 변경해 GitHub 연결과 저장소 쓰기 권한을 확인했다. 아래는 같은 변경을 재현하는 일반 PC 터미널 절차이며, 실제 반영 결과는 [실서비스 배포 작업 기록](worklog/2026-11-13-codex-실서비스배포.md)에 남긴다.

## 반영할 파일

`web/data/live-release/manifest.json`에 이번 이미지 관련 변경 파일과 SHA256을 모았다. `web/data/live-release/release.zip`은 같은 파일들의 복사본이다. 생성 이미지 26개와 등록부·실사 검사·화면 변경·운영 문서·작업 기록을 포함한다. 비밀값 파일, `.git`, `.claude`, `node_modules`, 빌드 결과는 포함하지 않는다. 이 폴더는 기존 `data/` 무시 규칙에 따라 커밋 대상에서 제외된다.

## 일반 PowerShell에서 배포하기

프로젝트 루트에서 실행한다. 이미 검사한 파일만 스테이징하며, 명령 실패 시 다음 단계로 진행하지 않는다. 충돌이 생기면 해결 후 다시 검사하며 강제 push는 하지 않는다.

```powershell
$release = Get-Content -LiteralPath 'web/data/live-release/manifest.json' -Raw -Encoding utf8 | ConvertFrom-Json
foreach ($file in $release.files) {
  $stream = [System.IO.File]::OpenRead((Join-Path (Get-Location).Path $file.path))
  $hasher = [System.Security.Cryptography.SHA256]::Create()
  try { $digest = [System.BitConverter]::ToString($hasher.ComputeHash($stream)).Replace('-','').ToLowerInvariant() }
  finally { $hasher.Dispose(); $stream.Dispose() }
  if ($digest -ne $file.sha256) {
    throw ('검사 후 파일이 바뀌었습니다: ' + $file.path)
  }
}
$canPush = gh api repos/supsuphansoup/trendfood --jq '.permissions.push'
if ($LASTEXITCODE -ne 0 -or $canPush -ne 'true') { throw 'GitHub 연결·계정 권한을 확인하세요.' }
$staged = @(git diff --cached --name-only)
if ($LASTEXITCODE -ne 0 -or $staged.Count -gt 0) { throw '기존 스테이징 파일을 먼저 확인하세요.' }
git add -- @($release.files.path)
if ($LASTEXITCODE -ne 0) { throw '변경 파일 등록 실패' }
git diff --cached --stat
git commit -m '사진: 실사 우선 자동 교체와 음식 이미지 반영'
if ($LASTEXITCODE -ne 0) { throw '커밋 실패' }
git pull --rebase origin main
if ($LASTEXITCODE -ne 0) { throw '최신 main 통합 실패: 충돌을 확인하세요.' }
```

최신 main 통합 후 `web/`에서 `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd run test:unit`, `npm.cmd run test:e2e`를 모두 확인한다. Windows의 수동 서버·기존 임시 Playwright 설정으로 검사한 정확한 명령과 결과는 [실사 우선 작업 기록](worklog/2026-11-13-codex-실사사진우선.md)에 있다. 통과한 뒤 프로젝트 루트에서 이어서 실행한다.

```powershell
gh variable set TF_CONTENT_ONLY --body '1' --repo supsuphansoup/trendfood
if ($LASTEXITCODE -ne 0) { throw '공개 JSON 모드 설정 실패' }
gh variable set PIPELINE_AUTO_PHOTOS --body 'true' --repo supsuphansoup/trendfood
if ($LASTEXITCODE -ne 0) { throw '사진 자동 검색 설정 실패' }
gh variable set PIPELINE_AUTO_PUBLISH --body 'true' --repo supsuphansoup/trendfood
if ($LASTEXITCODE -ne 0) { throw '검증 후 자동 반영 설정 실패' }
git push origin HEAD:main
if ($LASTEXITCODE -ne 0) { throw 'main 반영 실패' }
gh run list --workflow deploy.yml --repo supsuphansoup/trendfood --limit 3
```

`deploy` 실행의 Cloudflare 업로드 단계까지 성공했는지 확인한다. 키 미설정으로 업로드를 건너뛴 실행은 실제 배포 성공으로 판단하지 않는다. `ci`의 브라우저 검사 결과도 확인한다. 기존 AI 공급자·모델·키는 그대로 사용하며, 키나 모델이 없으면 사진 실행에 앞서 설정해야 한다. Pexels 키는 선택 사항이다.

## 운영 환경에서 실사 검색 확인하기

코드 배포 후 다음 명령으로 새 음식 수집 없이 5개 음식의 실사를 확인한다. 하루 예약은 10:17 KST를 유지한다.

```powershell
gh workflow run pipeline.yml --ref main --repo supsuphansoup/trendfood -f photos_only=true -f photo_limit=5
gh run list --workflow pipeline.yml --repo supsuphansoup/trendfood --limit 3
```

- 사진 단계의 `생성 예시 → 실사 N개` 출력과 `automation-report`의 `photo-report.json`을 확인한다. `replacedGenerated`는 교체, `retainedGenerated`는 기존 생성 이미지 유지다.
- 실사를 확보하면 전체 검사·커밋 뒤 `publish`가 같은 실행에서 기존 Cloudflare 배포를 호출한다. 적합한 실사가 없으면 생성 이미지를 보존하며 새 사진 커밋이나 재배포가 없을 수 있다.
- [실제 서비스](https://trendfood.pages.dev)와 [두바이 쫀득쿠키 상세](https://trendfood.pages.dev/food/dubai-chewy-cookie)에서 사진이 로드되는지 확인한다. 생성 이미지에는 생성 안내가, 실사로 교체된 상세에는 실제 출처·작가·라이선스가 보여야 한다.
- 예약에서 직접 생성 이미지를 만드는 API는 연결하지 않았다. 새 음식이 실사도 생성 예시도 확보하지 못한 경우의 자동 반영 제약은 [자동 반영 운영 안내](automation.md)를 따른다.
