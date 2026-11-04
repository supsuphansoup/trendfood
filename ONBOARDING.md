# 트렌드푸드 팀원 안내서

> 처음 합류한 팀원이 **"이게 어떻게 돌아가는지"** 를 이해하고, **내 컴퓨터에서 직접 띄워 보고**, **작은 수정을 올릴 수 있게** 만든 문서입니다.
> 모르는 단어가 나오면 [5장 용어 사전](#5-용어-사전)을 먼저 보세요. 기능·화면의 기준은 `prd.md`, 디자인 기준은 `DESIGN.md`, 진행 상황은 `CLAUDE.md` 입니다.

---

## 1. 우리가 만드는 것 (1분)

**"요즘 뜨는 음식, 여기서 제일 먼저."**

- 지금 유행하는 음식을 순위로 보여 주고, 해 먹고 싶은 사람은 필요한 재료를 쿠팡에서 **하나씩 이어서 담을 수 있게** 돕는 모바일 우선 웹사이트예요.
- 돈은 **쿠팡 파트너스 수수료**(방문자가 링크로 재료를 사면 일부를 받음)와 **구글 애드센스**(광고)로 법니다.
- 목표는 **돈을 거의 안 쓰고(무료), 컴퓨터를 켜 두지 않아도** 돌아가는 것. 사람은 매일 몇 분 **승인만** 합니다.

---

## 2. 전체 구조 한 장 요약

```
                 ┌──────────────── 매일 아침 6시 (자동) ────────────────┐
                 │  GitHub Actions "pipeline"                            │
                 │  ① 유튜브 인기 음식 영상 제목 모으기 (YouTube API)     │
                 │  ② AI 가 제목에서 음식 이름만 뽑기 (OpenAI / Gemini)   │
                 │  ③ 네이버 검색량이 얼마나 늘었는지 계산 (데이터랩 API) │
                 │  ④ 새 후보를 '대기' 상태로 저장 ───────────┐          │
                 └───────────────────────────────────────────│──────────┘
                                                             ▼
   운영자 ──▶ /admin (관리자 화면) ──── 읽기·쓰기 ────▶  Supabase (데이터베이스 + 로그인)
              · 후보 승인/반려                              foods · ingredients · candidates …
              · 글 고치기, 순서, 숨기기
              · 쿠팡 링크·참고 가격
              · [사이트에 반영] 버튼 ──▶ Supabase 함수 ──▶ GitHub Actions "deploy"
                                                             ① Supabase 에서 '게시된 음식' 읽기
                                                             ② 사이트를 HTML 파일로 굽기 (npm run build)
                                                             ③ Cloudflare Pages 에 올리기
                                                                     │
   방문자 ◀──────────────── 완성된 HTML 파일 (아주 빠르고 무료) ◀──────┘
```

핵심만 기억하세요.

1. **방문자가 보는 사이트는 "미리 구워 둔 HTML 파일"** 이에요 (정적 사이트). 서버가 없어서 빠르고 무료이고, 해킹당할 곳도 적어요.
2. **데이터는 Supabase 에** 있어요. 운영자가 관리자 화면에서 고치면 Supabase 가 바뀝니다.
3. 바꾼 내용은 **[사이트에 반영]** 을 눌러야 사이트가 다시 구워지고(3~5분) 방문자에게 보여요.
4. **AI 는 후보와 초안만** 만들어요. 사이트에 올라가는 건 전부 운영자가 승인한 것뿐이에요.

### 무엇을 어디서 무료로 쓰나

| 역할 | 서비스 | 무료 범위 (2026-11 기준, 바뀔 수 있음) |
| :--- | :--- | :--- |
| 사이트 올리기 | Cloudflare Pages | 정적 파일 무제한 전송, 한 달 빌드 500회 |
| 데이터베이스·로그인 | Supabase Free | DB 500MB. **1주일 동안 아무 활동이 없으면 일시 정지** → 매일 수집이 돌아서 괜찮음 |
| 자동 실행 | GitHub Actions | 공개 저장소는 무료. **60일 동안 커밋이 없으면 예약 실행이 멈춤** → Actions 탭에서 다시 켜기 |
| AI | 이번 달 OpenAI API 크레딧 → 그 뒤 Gemini 무료 등급 | 설정값 두 개만 바꾸면 전환 (8장) |
| 트렌드 데이터 | YouTube Data API, 네이버 데이터랩 | 하루 한도 안에서 무료 |

---

## 3. 내 컴퓨터에서 띄워 보기 (처음 한 번, 20분)

### 준비물

- **Node.js 24** (https://nodejs.org 에서 LTS 설치). 설치 후 터미널에서 `node --version` → `v24.…` 이 나오면 성공.
- **Git** (https://git-scm.com). 그리고 GitHub 계정 → 저장소 관리자에게 초대를 받으세요.
- 코드 편집기: **VS Code** 추천.

### 순서

```bash
# 1) 코드 내려받기
git clone https://github.com/supsuphansoup/trendfood.git
cd trendfood/web

# 2) 필요한 부품 설치 (처음 한 번, 몇 분 걸림)
npm ci

# 3) 개발 서버 켜기
npm run dev
```

브라우저에서 **http://localhost:3000** 을 열면 사이트가 보여요. 파일을 고치고 저장하면 화면이 바로 바뀝니다. 끌 때는 터미널에서 `Ctrl + C`.

> Supabase 설정 없이도 돌아가요. 그때는 `web/src/data/seed-foods.ts` 의 **예시 음식 10개**로 화면을 그립니다.
> 관리자 화면(`/admin`)은 Supabase 를 연결해야 동작하고, 연결 전에는 "Supabase 연결 전이에요" 안내만 나와요.

### Supabase 에 연결해서 실제 데이터로 보기 (선택)

`web/.env.local` 파일을 만들고 운영자에게 받은 값을 넣어요. **이 파일은 절대 커밋하지 않아요** (`.gitignore` 에 이미 들어 있음).

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...   # 'anon public' 키 (공개돼도 되는 키)
```

`service_role` 키는 모든 권한을 가진 **비밀 키**라서 내 컴퓨터에 넣지 않아요. GitHub 비밀값에만 있어요.

---

## 4. 자주 하는 일

| 하고 싶은 것 | 고칠 파일 | 확인 |
| :--- | :--- | :--- |
| 메인 화면 글자·배치 | `web/src/components/home/home-feed.tsx`, `food-card.tsx` | `npm run dev` 로 보기 |
| 상세 화면 | `web/src/app/food/[slug]/page.tsx`, `web/src/components/detail/` | 〃 |
| 색·글자 크기 | `web/src/app/theme.css` (**여기만** 고쳐요. 기준은 `DESIGN.md`) | 〃 |
| 예시 음식 데이터 | `web/src/data/seed-foods.ts` → 고친 뒤 `npm run db:seed-sql` | `supabase/seed.sql` 이 새로 생김 |
| 관리자 화면 | `web/src/components/admin/` | 테스트 `e2e/admin.spec.ts` |
| 자동 수집 규칙 | `web/scripts/pipeline/` (`logic.ts` 가 계산, `llm.ts` 가 AI 질문) | `npm run test:unit`, `npm run pipeline -- --dry-run` |

### 고친 뒤 꼭 돌리는 검사 (모두 `web` 폴더에서)

```bash
npm run lint        # 코드 규칙 검사
npm run typecheck   # 타입(자료형) 검사
npm run test:unit   # 계산 로직 검사 (몇 초)
npm run test:e2e    # 실제 브라우저로 모바일·PC 화면, 접근성까지 검사 (1~2분)
```

처음 `test:e2e` 전에는 브라우저를 한 번 설치해요: `npx playwright install chromium`.
`npm run pipeline -- --dry-run` 은 **키가 없어도** 예시 값으로 수집 과정을 끝까지 보여 줘요 (DB 에는 안 씀).

### 내 수정 올리기 (Git 기본)

```bash
git switch -c fix/메인-문구        # 1) 내 작업용 가지(branch) 만들기
# … 파일 고치기 …
git add -A
git commit -m "fix: 메인 문구 다듬기"   # 2) 저장 지점 만들기
git push -u origin fix/메인-문구     # 3) GitHub 에 올리기
```

GitHub 에서 **Pull Request** 를 만들고 다른 팀원에게 확인을 받은 뒤 `main` 에 합쳐요. `main` 에 합쳐지면 사이트가 **자동으로 다시 배포**돼요.

---

## 5. 용어 사전

| 용어 | 쉬운 설명 |
| :--- | :--- |
| 정적 사이트 | 미리 만들어 둔 HTML 파일을 그대로 보여 주는 사이트. 방문할 때마다 서버가 계산하지 않음 |
| 빌드 (build) | 코드와 데이터를 합쳐 HTML 파일 묶음(`web/out/`)을 만드는 일 |
| 배포 (deploy) | 빌드 결과를 인터넷에 올리는 일 (우리는 Cloudflare Pages) |
| Supabase | 데이터베이스(엑셀 표 같은 것) + 로그인 기능을 주는 서비스 |
| 테이블 | DB 안의 표. `foods`(음식), `ingredients`(재료), `candidates`(후보), `admins`(운영자) |
| RLS | 표의 **줄마다** "누가 읽고 쓸 수 있는지" 정하는 규칙. 방문자는 게시된 음식만 읽고, 쓰기는 운영자만 |
| anon 키 / service_role 키 | anon = 공개돼도 되는 열쇠(RLS 가 막아 줌). service_role = 모든 문을 여는 열쇠(비밀) |
| 환경변수 / 비밀값 | 코드 밖에 두는 설정값. 내 컴퓨터는 `.env.local`, GitHub 은 Settings → Secrets |
| GitHub Actions | GitHub 이 정해진 때에 대신 명령을 실행해 주는 기능. `.github/workflows/` 에 설정 |
| 워크플로 | Actions 의 작업 하나. 우리는 `deploy`(배포)와 `pipeline`(매일 수집) 두 개 |
| Edge Function | Supabase 에서 돌아가는 작은 서버 코드. 우리는 [사이트에 반영] 버튼 처리 하나만 씀 |
| API | 다른 서비스에 정해진 형식으로 데이터를 달라고 요청하는 창구 |
| slug | 주소에 쓰는 영어 이름. `/food/dubai-chocolate` 의 `dubai-chocolate` |
| e2e 테스트 | 진짜 브라우저를 띄워 사람처럼 눌러 보는 자동 검사 |

---

## 6. 운영자 하루 루틴 (5분)

관리자 주소는 `https://<사이트 주소>/admin` 이에요. **공개 화면 어디에도 링크가 없고 검색엔진에도 안 나와요.** 주소를 다른 곳에 올리지 마세요.

1. **후보 큐** 탭: 아침 6시에 자동으로 들어온 후보를 봐요. "급상승 4.2배" 처럼 근거가 같이 나와요.
   - 괜찮으면 **승인** → AI 초안이 있으면 [게시 관리]에 **초안**으로 들어가요. 아니면 **반려**.
   - 내가 본 유행 음식은 위 칸에서 **직접 추가**할 수 있어요.
2. **게시 관리** 탭: 초안의 **글 고치기**로 내용을 꼭 직접 확인·수정해요 (AI 는 틀릴 수 있어요). 그다음 **게시하기**. 위/아래 화살표로 순위를 바꾸고, 내릴 음식은 **숨기기**.
3. **재료 링크** 탭: 재료마다 쿠팡 파트너스 링크와 참고 가격을 넣어요. 비워 두면 쿠팡 검색 링크로 대신 연결돼요. `coupang.com`·`coupa.ng` 주소만 저장돼요.
4. 맨 위 **[사이트에 반영]** 클릭 → 3~5분 뒤 사이트에 보여요. (5분에 한 번만 누를 수 있어요)

맨 위 상자에 "자동 수집 실패 … AI 크레딧·무료 한도 소진" 이 보이면 [8장](#8-ai-바꾸기-openai--gemini)을 보세요.

---

## 7. 처음 한 번 설정 (운영자 1명이 한 번만, 약 1시간)

순서대로 하세요. 값은 메모장에 모아 두었다가 마지막에 GitHub 에 넣어요.

### 7-1. Supabase

1. https://supabase.com 가입 → **New project** (지역은 Seoul 또는 Tokyo). 비밀번호는 안전한 곳에 보관.
2. 왼쪽 **SQL Editor** → `web/supabase/migrations/0001_init.sql` 내용을 붙여 넣고 **Run**. 이어서 `web/supabase/seed.sql` 도 **Run** (예시 음식 10개).
3. **Authentication → Sign In / Providers**: 이메일 로그인만 켜고, **"Allow new users to sign up" 을 끄세요** (아무나 계정을 못 만들게).
4. **Authentication → Users → Add user**: 운영자 이메일·비밀번호로 계정을 만들어요.
5. SQL Editor 에서 운영자로 등록 (이메일만 바꿔서 실행):
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = '운영자@이메일';
   ```
6. **Project Settings → API** 에서 `Project URL`, `anon public` 키, `service_role` 키를 메모.

### 7-2. Cloudflare Pages

1. https://dash.cloudflare.com 가입 → **Workers & Pages → Create → Pages → Direct Upload** 로 프로젝트 이름 `trendfood` 를 만들어요 (처음엔 아무 폴더나 올려도 돼요).
2. 오른쪽 위 프로필 → **API Tokens → Create Token** → "Edit Cloudflare Workers" 템플릿 또는 **Account · Cloudflare Pages · Edit** 권한으로 만들기. 토큰과 **Account ID**(대시보드 오른쪽) 메모.

### 7-3. GitHub 비밀값·변수

저장소 → **Settings → Secrets and variables → Actions**.

| 종류 | 이름 | 값 |
| :--- | :--- | :--- |
| Secret | `SUPABASE_URL` | Supabase Project URL |
| Secret | `SUPABASE_ANON_KEY` | anon public 키 |
| Secret | `SUPABASE_SERVICE_ROLE_KEY` | service_role 키 (수집 스크립트만 씀) |
| Secret | `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` | 7-2 에서 만든 값 |
| Secret | `YOUTUBE_API_KEY` | Google Cloud Console → YouTube Data API v3 사용 설정 → API 키 |
| Secret | `NAVER_CLIENT_ID` / `NAVER_CLIENT_SECRET` | 네이버 개발자센터 → 애플리케이션 등록 → "데이터랩(검색어트렌드)" 선택 |
| Secret | `OPENAI_API_KEY` 또는 `GEMINI_API_KEY` | 8장 참고 |
| Variable | `AI_PROVIDER` | `openai` 또는 `gemini` |
| Variable | `AI_MODEL` | 그 회사 문서에 있는 모델 이름 (코드에 박지 않고 여기서만 바꿔요) |
| Variable | `CF_PAGES_PROJECT` | (선택) Pages 프로젝트 이름이 `trendfood` 가 아닐 때 |

키가 하나도 없어도 워크플로는 실패하지 않고 예시 값으로만 돌아요. 키를 하나씩 채우면 그 단계부터 진짜 데이터로 바뀝니다.

### 7-4. [사이트에 반영] 버튼 연결 (Supabase Edge Function)

1. GitHub → 프로필 **Settings → Developer settings → Fine-grained tokens → Generate**: 저장소는 `trendfood` **하나만**, 권한은 **Contents: Read and write** 만. 기한은 짧게(예: 90일) 하고 달력에 갱신일을 적어 두세요.
2. Supabase **Edge Functions → Deploy a new function → Via Editor**: 이름 `request-publish`, 내용은 `web/supabase/functions/request-publish/index.ts` 를 붙여 넣고 배포. ("Verify JWT" 는 켠 채로 둬요)
3. **Edge Functions → Secrets** 에 `GITHUB_TOKEN`(1번 토큰), `GITHUB_REPO`(`supsuphansoup/trendfood`) 추가.

### 7-5. 확인

1. GitHub **Actions → deploy → Run workflow** → 초록색 ✓ 이면 Cloudflare 가 알려 준 주소(`https://trendfood.pages.dev`)에서 사이트가 보여요.
2. **Actions → pipeline → Run workflow** → 관리자 화면 [후보 큐]에 후보가 생기는지 확인.
3. 관리자 화면에서 아무 음식이나 숨기고 [사이트에 반영] → 몇 분 뒤 사이트에서 사라지면 끝!

---

## 8. AI 바꾸기 (OpenAI ↔ Gemini)

- **이번 달**: ChatGPT Pro 요금제의 API 크레딧을 써요. https://platform.openai.com 에서 **같은 이메일**로 로그인 → API 키 발급 → `OPENAI_API_KEY`, `AI_PROVIDER=openai`.
  크레딧은 **한 달마다 사라지고**, 다 쓰면 수집이 "크레딧 소진" 으로 멈춰요 (사이트는 그대로 잘 돌아가요).
- **그 뒤**: https://aistudio.google.com 에서 Gemini API 키 발급 → `GEMINI_API_KEY`, `AI_PROVIDER=gemini`, `AI_MODEL` 을 무료 등급 모델로.
  ⚠️ 무료 등급은 입력이 학습에 쓰일 수 있다는 조항이 있을 수 있어요. 우리가 보내는 건 **공개 영상 제목·검색량뿐**이라 위험은 작지만, 쓰기 전에 약관을 한 번 확인하세요 (`CLAUDE.md` 팀 결정 대기 항목).
- 바꾸는 곳은 **GitHub Variables 두 개**(`AI_PROVIDER`, `AI_MODEL`)와 키 하나뿐이에요. 코드는 안 고쳐요.

---

## 9. 꼭 지킬 규칙

- 🔑 **비밀번호·키를 코드나 채팅에 올리지 않기.** `.env.local` 은 커밋 금지. 실수로 올렸으면 바로 그 키를 **새로 발급(교체)** 하고 알리기.
- 🕷️ **공식 API 만** 써요. 인스타·틱톡·커뮤니티 긁어오기(크롤링), 영상 자막 추출, 쿠팡 화면 긁어오기 금지.
- 🛒 **탭 한 번 = 쿠팡 상품 하나.** 여러 탭 한꺼번에 열기, 장바구니 한꺼번에 보내기, 최저가 비교는 하지 않아요 (쿠팡 정책).
- 📢 쿠팡 링크 근처에는 "쿠팡 파트너스 활동으로 수수료를 받을 수 있어요" 안내가 있어야 하고, **장바구니 버튼·체크리스트 주변에는 광고를 넣지 않아요.**
- 🖼️ 사진: 지금 들어 있는 사진은 **데모용**이라 실제 오픈 전에 바꿔야 해요. 유튜브·인스타 썸네일을 저장해서 쓰면 안 돼요. AI 로 만든 사진에는 "AI 이미지" 표시.
- 🤖 AI 가 쓴 글은 **운영자가 읽고 고친 뒤** 게시하고, 화면에 "AI 요약" 표시를 유지해요.
- ⭐ 후기·평점은 2단계(사용자가 생긴 뒤)에 만들어요. 지금은 넣지 않아요.

---

## 10. 문제가 생기면

| 증상 | 해결 |
| :--- | :--- |
| `npm ci` 가 실패해요 | `node --version` 이 24 인지 확인. 아니면 Node 24 설치 후 터미널을 다시 열기 |
| `localhost:3000` 이 이미 쓰는 중이래요 | 다른 터미널의 `npm run dev` 를 `Ctrl + C` 로 끄거나 `npm run dev -- -p 3001` |
| 관리자 화면에 "Supabase 연결 전이에요" | `.env.local` 이 없거나 값이 틀림 (3장). 고친 뒤 개발 서버를 껐다 켜기 |
| "관리자 권한이 없어요" | 로그인은 됐지만 `admins` 표에 없음 → 7-1 의 5번 SQL 실행 |
| [사이트에 반영] 이 "GitHub 에 요청하지 못했어요" | 7-4 토큰 만료·권한 부족. 새 토큰을 만들어 `GITHUB_TOKEN` 교체 |
| 반영했는데 사이트가 그대로예요 | GitHub **Actions → deploy** 에서 빨간 ✗ 를 눌러 로그 확인. 브라우저 새로고침(Ctrl+Shift+R) |
| 매일 수집이 안 돌아요 | Actions → pipeline 이 꺼졌는지 확인 (60일 규칙). **Enable workflow** 누르기 |
| deploy 가 "게시된 음식이 하나도 없어요" 로 멈춰요 | 일부러 막은 것 (빈 사이트 배포 방지). 관리자 화면에서 하나 이상 게시하기 |

모르겠으면 혼자 오래 붙잡지 말고 **오류 메시지 전체를 복사해서** 팀 채팅에 올려 주세요.

---

## 11. 파일 지도

```
trendfood/
├── ONBOARDING.md          ← 이 문서
├── CLAUDE.md              ← 진행 상황·결정 사항 (AI 도우미도 이걸 먼저 읽음)
├── prd.md / DESIGN.md     ← 기능 기준 / 디자인 기준
├── design/mockups/        ← 확정 시안 HTML (브라우저로 열기)
├── .github/workflows/     ← deploy.yml(배포), pipeline.yml(매일 수집)
└── web/                   ← 실제 사이트 코드 (Next.js)
    ├── src/app/           ← 주소별 화면 (/, /food/[slug], /about, /admin)
    ├── src/components/    ← 화면 조각 (home, detail, admin, ui)
    ├── src/data/          ← 데이터 형식·예시 데이터·DB 변환 (사이트·스크립트 공용)
    ├── src/lib/           ← 사진 목록, Supabase 연결, 도우미 함수
    ├── scripts/pipeline/  ← 매일 수집 스크립트 + 단위 테스트
    ├── supabase/          ← DB 만드는 SQL, 예시 데이터 SQL, Edge Function
    └── e2e/               ← 브라우저 자동 테스트
```
