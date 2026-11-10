# 트렌드푸드 팀원 안내서

---

## 오늘 하면 좋은 것 (2026-11-05)

아래 순서대로 둘이 진행하고, 결과를 문서와 팀 채팅에 남겨 주세요.

**수업에서 읽을 파일**
1. 이 문서 **0장** — 지금 상태, 확인받을 것, 남은 것
2. `docs/intent.md` — 왜 만드는지 (1쪽)
3. `docs/spec.md` — 기능 목록(✅/🟡/⬜)과 **Open questions**(팀 결정 안건)
4. `docs/plan.md` — 앞으로 할 일 순서 (2단계부터 나눠 맡기)

> **작업 기록**: AI(Codex 등)는 `AGENTS.md` 규칙대로 작업이 끝날 때마다 `docs/worklog/` 에 기록 파일을 하나 만들어 같은 커밋에 넣어요. 안 만들면 `AGENTS.md 규칙대로 docs/worklog 에 작업 기록 남겨줘` 라고 말해요.

**순서**

1. **시연 (5분)**: https://trendfood.pages.dev 메인 → 상세(재료 연속 담기) → `/admin` 로그인 → 후보 큐·게시 관리 화면.
2. **확인받기 (핵심)**: 0장 "⚠ 아직 확인받지 않은 것" 1~7번을 **하나씩** 여쭤보고 답을 그대로 받아 적어요.
3. **기록**: 받아 적은 것을 AI에게 주고 `이 수업 메모를 docs/spec.md Open questions 와 ONBOARDING.md 0장에 결정으로 반영하고, 코드가 바뀌어야 하면 docs/plan.md 에 작업으로 추가해줘` → 커밋·push. 결정이 안 난 건 "보류: 이유"로 적어요.
4. **나누기**: `docs/plan.md` 2단계부터 둘이 겹치지 않게 맡을 단계를 정해 팀 채팅에 올려요.
5. **공유할거**: 중요한것만

---

## 0. 지금 상태 (2026-11-05 기준) — 제일 먼저 읽기

### 해 놓은 것
- **사이트·관리자 코드**: 메인·상세·소개·404, 관리자 화면(`/admin`), 자동 수집 코드, 자동 검사(`ci`)·자동 배포(`deploy`) — 검사 4개 모두 통과.
- **계정 연결(4장)**: 모두 **개인 계정**으로 만들었어요.
  - Supabase 프로젝트 `trendfood` (서울) — DB 표·보안 규칙, **예시 음식 10개**, 새 가입 막기, 운영자 계정 1개(`trendfood2026@gmail.com`), Edge Function `request-publish`
  - Cloudflare Pages 프로젝트 `trendfood` → 사이트 주소 **https://trendfood.pages.dev**
  - GitHub Secrets(Supabase·Cloudflare 키)와 [사이트에 반영] 버튼용 GitHub 토큰
- `main` 에 합치면 사이트가 **자동으로 다시 올라가요.**

### ⚠ 아직 확인받지 않은 것 — 교수님·팀 검토 전까지는 "임시"
아래는 팀장이 먼저 정해서 해 둔 거예요. **수업에서 확인받고**, 바꾸기로 하면 `docs/spec.md` Open questions 에 결정을 적고 고쳐요.
1. **구조와 비용**: Cloudflare Pages + Supabase 무료 + GitHub Actions 로 **0원 운영** (서버 없는 정적 사이트).
2. **계정 주인**: 모든 서비스가 팀장 개인 계정이에요. 팀원에게 대시보드 권한(멤버 초대)을 줄지 정해요.
3. **PR 없이 `main` 에 바로 push** (2026-11-10 팀장 결정, 보호 규칙도 없음): push 전에 `git pull --rebase` 로 최신을 받고 검사 4개를 돌려요. push 뒤 GitHub Actions 의 `ci` 가 초록 ✓ 인지 보고, 빨간 ✗ 면 바로 고쳐요. 배포(`deploy`)는 기본 검사(lint·typecheck·unit)를 통과해야만 돼요.
4. **[사이트에 반영] 토큰 만료 없음**: 저장소 하나·코드 쓰기 권한만. 프로젝트를 접을 때 반드시 삭제해요.
5. **자동 수집은 아직 예시 값**: 수집 키(YouTube·네이버·AI)가 없어서 매일 아침 6시에 **가짜 예시 후보**가 [후보 큐]에 들어가요. 승인 전엔 사이트에 안 나오니 **반려**하면 돼요.
6. **화면 내용**: 사진은 **데모(실서비스 금지)**, 쿠팡 링크는 파트너스 가입 전이라 **쿠팡 검색 링크**로 대체, 음식 글 10개는 예시예요.
7. **팀 결정 대기 안건**: `docs/spec.md` Open questions 1~6.

### 남은 것 (순서는 `docs/plan.md`)
- **수집 키 3종 넣기** (4-3 표): YouTube API 키, 네이버 데이터랩 키, AI 키(OpenAI 또는 Gemini — 무료 등급 쓸지 팀 결정 후).
- **개발**: `docs/plan.md` 2단계부터 — 관리자 편집 보강 → 영상 넣기 → 삭제 요청 창구 → YouTube 약관 대응 → 분석. **키 없이 바로 시작할 수 있어요.** 겹치지 않게 사람마다 단계를 나눠요.
- **오픈 준비**: 실제 사진, 쿠팡 파트너스 가입·링크, 직접 검수한 글 20~30개, 도메인, 사업자 신고 여부 확인.

---

## 1. 우리가 만드는 것 (1분)

**"요즘 뜨는 음식, 여기서 제일 먼저."**
유행하는 음식을 순위로 보여 주고, 필요한 재료를 쿠팡에서 **하나씩 이어서 담게** 돕는 모바일 우선 웹사이트예요.
돈은 **쿠팡 파트너스 수수료 + 구글 광고**로 벌고, 운영비는 **거의 0원**, 사람은 매일 몇 분 **승인만** 합니다.

```
 매일 아침 6시 (자동)                     운영자                         방문자
 GitHub Actions 가                       /admin 에서                     완성된 사이트
 유튜브 제목 → AI 음식 이름 추출          후보 승인·글 고치기·링크 넣기    (Cloudflare Pages)
 → 네이버 검색량 배수 → 후보 저장 ──▶  Supabase(DB) ──[사이트에 반영]──▶ 다시 빌드해서 올림
```

- 사이트는 **미리 구워 둔 HTML 파일**(정적 사이트)이라 서버가 없어요. → AI가 "서버 코드"를 넣으려 하면 막아야 해요.
- 데이터는 **Supabase**, 자동 실행은 **GitHub Actions**, 사이트 올리기는 **Cloudflare Pages**.


---

## 2. 진행 상황 보는 곳

- `docs/spec.md` **Requirements**의 ✅(구현됨)·🟡(일부/임시)·⬜(아직)로 어떤 기능이 됐는지 봐요.
- `docs/plan.md` **Order of work**의 ☐(남음)·☑(완료)로 다음 할 일을 봐요.
- `docs/spec.md` **Areas of concern**은 사람이 먼저 보고 결정할 내용이에요.


### 키 없이 시연하기

개발 서버가 켜져 있으면 `Ctrl + C`로 끄고, `web` 폴더에서 아래 명령을 차례로 실행하세요:
```bash
npm run build
npm start
```
브라우저에서 **http://localhost:3000** 을 열면 **예시 음식 10개**로 시연할 수 있어요 (내 PC 에 키가 없을 때 기준). 개발 서버보다 실제 배포와 같은 빌드 결과를 보여 줘요. 이 방법에서는 관리자 화면(`/admin`)이 안내 문구만 보여요.

**실제 사이트로 시연하기**: **https://trendfood.pages.dev** (Supabase 의 예시 음식 10개). 관리자 시연은 `https://trendfood.pages.dev/admin` 에서 운영자 계정(`trendfood2026@gmail.com`)으로 로그인 — 비밀번호는 팀장에게 **카톡 1:1로** 받아요. 저장소·문서·단체방·AI 채팅에는 절대 쓰지 않아요. 계정 하나를 같이 쓰니까 승인·수정·[사이트에 반영]을 했으면 팀 채팅에 한 줄 남겨요. 0장의 "확인받지 않은 것"을 같이 보여 드리고 피드백을 받아요.

---

## 3. 운영자 하루 루틴 (5분)

관리자 주소: `https://trendfood.pages.dev/admin` — **공개 화면에 링크가 없고 검색에도 안 나와요. 주소를 다른 곳에 올리지 마세요.**

1. **후보 큐**: 아침에 자동으로 들어온 후보 확인 ("급상승 4.2배" 같은 근거가 같이 보여요). 괜찮으면 **승인**(AI 초안이 [게시 관리]에 '초안'으로 들어감), 아니면 **반려**. 내가 본 유행 음식은 **직접 추가**.
2. **게시 관리**: 초안은 **글 고치기로 꼭 직접 읽고 고친 뒤** 게시 (AI는 틀릴 수 있어요). 화살표로 순위, **숨기기**로 내리기.
3. **재료 링크**: 쿠팡 파트너스 링크·참고 가격 넣기 (쿠팡 주소만 저장돼요. 비우면 쿠팡 검색으로 연결).
4. 맨 위 **[사이트에 반영]** → 3~5분 뒤 사이트에 보여요 (5분에 한 번).

"자동 수집 실패 … AI 크레딧·무료 한도 소진"이 보이면 6장.

---

## 4. 처음 한 번 설정 (운영자 1명이 한 번만, 약 1시간)

> **2026-11-05 에 4-1~4-4 는 팀장이 끝냈어요** (0장). 남은 건 4-3 표의 **수집 키(YouTube·네이버·AI)와 `AI_PROVIDER`·`AI_MODEL` 변수**뿐이에요. 아래는 다시 만들거나 계정을 옮길 때의 기록이에요.

> **비밀값은 사람이 직접 각 사이트에 입력해요.** AI 채팅창에 키를 붙여 넣지 마세요. AI에게는 `ONBOARDING.md 4장 순서대로 내가 하는 걸 옆에서 안내해줘` 라고 하면 돼요.

### 4-1. Supabase (DB·로그인)

1. https://supabase.com → **New project** (지역 Seoul 또는 Tokyo).
2. **SQL Editor** 에 `web/supabase/migrations/0001_init.sql` 붙여 넣고 **Run** → 이어서 `web/supabase/seed.sql` **Run** (예시 음식 10개).
3. **Authentication → Sign In / Providers**: 이메일만 켜고 **"Allow new users to sign up" 끄기**.
4. **Authentication → Users → Add user** 로 운영자 계정 만들기.
5. SQL Editor 에서 운영자 등록 (이메일만 바꿔서):
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = '운영자@이메일';
   ```
6. **Project Settings → API** 에서 `Project URL`, `anon public` 키, `service_role` 키 메모.

### 4-2. Cloudflare Pages (사이트 올리기)

1. https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Direct Upload**, 프로젝트 이름 `trendfood`.
2. **API Tokens → Create Token** (권한: Account · Cloudflare Pages · Edit). 토큰과 **Account ID** 메모.

### 4-3. GitHub 비밀값·변수 (저장소 → Settings → Secrets and variables → Actions)

| 종류 | 이름 | 값 |
| :--- | :--- | :--- |
| Secret | `SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` | 4-1 에서 메모한 값 |
| Secret | `CLOUDFLARE_API_TOKEN` · `CLOUDFLARE_ACCOUNT_ID` | 4-2 |
| Secret | `YOUTUBE_API_KEY` | Google Cloud Console → YouTube Data API v3 → API 키 |
| Secret | `NAVER_CLIENT_ID` · `NAVER_CLIENT_SECRET` | 네이버 개발자센터 → 애플리케이션 등록 → 데이터랩(검색어트렌드) |
| Secret | `OPENAI_API_KEY` 또는 `GEMINI_API_KEY` | 6장 |
| Variable | `AI_PROVIDER` · `AI_MODEL` | `openai`/`gemini`, 그 회사 문서의 모델 이름 |

키가 비어 있으면 그 단계는 **예시 값으로** 돌아가요. 하나씩 채우면 그 단계부터 진짜 데이터가 돼요.

### 4-4. [사이트에 반영] 버튼 연결

1. GitHub **Settings → Developer settings → Fine-grained tokens**: 저장소 `trendfood` **하나만**, 권한 **Contents: Read and write** 만. 기한은 **만료 없음**으로 만들었어요 (0장 ⚠4) — 프로젝트를 접거나 유출이 의심되면 바로 삭제.
2. Supabase **Edge Functions → Deploy a new function → Via Editor**: 이름 `request-publish`, 내용은 `web/supabase/functions/request-publish/index.ts` (Verify JWT 켠 채로).
3. **Edge Functions → Secrets**: `GITHUB_TOKEN`(1번 토큰), `GITHUB_REPO` = `supsuphansoup/trendfood`.

### 4-5. 확인

GitHub **Actions → deploy → Run workflow** ✓ → `https://trendfood.pages.dev` 에서 사이트 확인 → **Actions → pipeline → Run workflow** → 관리자 [후보 큐]에 후보가 생기면 끝!

---

## 6. AI 바꾸기 (자동 수집용, OpenAI ↔ Gemini)

- **이번 달**: ChatGPT Pro 요금제의 API 크레딧. https://platform.openai.com 에 **같은 이메일**로 로그인 → 키 발급 → `OPENAI_API_KEY`, `AI_PROVIDER=openai`. 크레딧은 **매달 사라지고**, 다 쓰면 수집만 멈춰요 (사이트는 멀쩡).
- **그 뒤**: https://aistudio.google.com → `GEMINI_API_KEY`, `AI_PROVIDER=gemini`, `AI_MODEL` 은 무료 등급 모델. 무료 등급 약관(입력 학습 사용 여부)은 쓰기 전에 확인 — 팀 결정 대기 항목이에요.
- 바꾸는 곳은 **GitHub Variables 두 개 + 키 하나**뿐. 코드는 안 고쳐요.

---

## 7. 파일 지도 (AI에게 "어디 고쳐?" 물을 때 참고)

```
trendfood/
├── ONBOARDING.md       ← 이 문서 (사람용)
├── CLAUDE.md           ← Claude Code 용 규칙·진행 상황
├── AGENTS.md           ← Codex·Cursor 용 규칙(자기완결)
├── docs/               ← 기준 문서: intent.md(무엇·왜) → spec.md(숫자·규칙) → plan.md(남은 작업) + design.md(시각 규칙)
│   └── worklog/        ← 작업 기록: AI가 작업마다 파일 하나씩 남김 (팀장 확인용, AGENTS.md 규칙)
├── reports/            ← 조사 보고서 3개 (결정 근거, 참고용)
├── archive/design-mockups/ ← 예전 시안·탈락안·데모 사진 (참고용, 실서비스 사용 금지)
├── .github/workflows/  ← deploy.yml(배포), pipeline.yml(매일 수집), ci.yml(push 검사)
└── web/                ← 실제 사이트
    ├── src/app/            주소별 화면 (/, /food/[slug], /about, /admin)
    ├── src/app/theme.css   색·글자 크기 (디자인은 여기서만)
    ├── src/components/     화면 조각 (home, detail, admin, ui)
    ├── src/data/           데이터 형식·예시 음식 10개
    ├── scripts/pipeline/   매일 수집 스크립트
    ├── supabase/           DB 만드는 SQL, 반영 버튼 함수
    └── e2e/                브라우저 자동 테스트
```
