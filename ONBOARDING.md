# 트렌드푸드 팀원 안내서 (바이브코딩용)

> 우리 팀은 **AI 코딩 도구(Claude Code, Codex, Cursor 등)에게 말로 시켜서** 개발합니다.
> 이 문서는 코드를 몰라도 **AI에게 제대로 시키고, 결과를 확인하고, 안전하게 올리는 법**을 알려 줍니다.
> Claude Code는 `CLAUDE.md`를, Codex·Cursor는 **자기완결 규칙 파일인 `AGENTS.md`**를 읽고 우리 규칙을 따릅니다. **사람은 이 문서만 읽으면 됩니다.**

---

## ★ 오늘 하면 좋은 것 (2026-11-05 교수님·지도학생 회의, 팀장 불참)

팀장이 회의에 못 와요. 아래 순서대로 둘이 진행하고, 결과를 문서와 팀 채팅에 남겨 주세요.

**회의 전에 읽을 파일**
1. 이 문서 **0장** — 지금 상태, 확인받을 것, 남은 것
2. `docs/intent.md` — 왜 만드는지 (1쪽)
3. `docs/spec.md` — 기능 목록(✅/🟡/⬜)과 **Open questions**(팀 결정 안건)
4. `docs/plan.md` — 앞으로 할 일 순서 (2단계부터 나눠 맡기)

**회의 순서**

1. **시연 (5분)**: https://trendfood.pages.dev 메인 → 상세(재료 연속 담기) → `/admin` 로그인 → 후보 큐·게시 관리 화면.
2. **확인받기 (핵심)**: 0장 "⚠ 아직 확인받지 않은 것" 1~7번을 **하나씩** 여쭤보고 답을 그대로 받아 적어요.
3. **기록 (회의 당일)**: 받아 적은 것을 AI에게 주고 `이 회의 메모를 docs/spec.md Open questions 와 ONBOARDING.md 0장에 결정으로 반영하고, 코드가 바뀌어야 하면 docs/plan.md 에 작업으로 추가해줘` → PR. 결정이 안 난 건 "보류: 이유"로 적어요.
4. **나누기**: `docs/plan.md` 2단계부터 둘이 겹치지 않게 맡을 단계를 정해 팀 채팅에 올려요.
5. **팀장에게 보고**: 회의 메모 원본 + PR 링크를 팀 채팅에 올려요.

---

## 0. 지금 상태 (2026-11-05 기준) — 제일 먼저 읽기

### 해 놓은 것 (팀장, 2026-11-05 밤)
- **사이트·관리자 코드**: 메인·상세·소개·404, 관리자 화면(`/admin`), 자동 수집 코드, 자동 검사(`ci`)·자동 배포(`deploy`) — 검사 4개 모두 통과.
- **계정 연결(8장 8-1~8-4)**: 모두 **팀장 개인 계정**으로 만들었어요.
  - Supabase 프로젝트 `trendfood` (서울) — DB 표·보안 규칙, **예시 음식 10개**, 새 가입 막기, 운영자 계정 1개(`trendfood2026@gmail.com`), Edge Function `request-publish`
  - Cloudflare Pages 프로젝트 `trendfood` → 사이트 주소 **https://trendfood.pages.dev**
  - GitHub Secrets(Supabase·Cloudflare 키)와 [사이트에 반영] 버튼용 GitHub 토큰
- `main` 에 합치면 사이트가 **자동으로 다시 올라가요.**

### ⚠ 아직 확인받지 않은 것 — 교수님·팀 검토 전까지는 "임시"
아래는 팀장이 먼저 정해서 해 둔 거예요. **회의에서 확인받고**, 바꾸기로 하면 `docs/spec.md` Open questions 에 결정을 적고 고쳐요.
1. **구조와 비용**: Cloudflare Pages + Supabase 무료 + GitHub Actions 로 **0원 운영** (서버 없는 정적 사이트).
2. **계정 주인**: 모든 서비스가 팀장 개인 계정이에요. 팀원에게 대시보드 권한(멤버 초대)을 줄지 정해요.
3. **`main` 보호 규칙 없음**: 잠금 대신 "항상 PR, 초록 ✓ 일 때만 합치기" 약속(3장)으로 운영해요.
4. **[사이트에 반영] 토큰 만료 없음**: 저장소 하나·코드 쓰기 권한만. 프로젝트를 접을 때 반드시 삭제해요.
5. **자동 수집은 아직 예시 값**: 수집 키(YouTube·네이버·AI)가 없어서 매일 아침 6시에 **가짜 예시 후보**가 [후보 큐]에 들어가요. 승인 전엔 사이트에 안 나오니 **반려**하면 돼요.
6. **화면 내용**: 사진은 **데모(실서비스 금지)**, 쿠팡 링크는 파트너스 가입 전이라 **쿠팡 검색 링크**로 대체, 음식 글 10개는 예시예요.
7. **팀 결정 대기 안건**: `docs/spec.md` Open questions 1~6 (4장 참고).

### 남은 것 (순서는 `docs/plan.md`)
- **수집 키 3종 넣기** (8-3 표): YouTube API 키, 네이버 데이터랩 키, AI 키(OpenAI 또는 Gemini — 무료 등급 쓸지 팀 결정 후).
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

- 사이트는 **미리 구워 둔 HTML 파일**(정적 사이트)이라 서버가 없어요. → AI가 "서버 코드"를 넣으려 하면 막아야 해요 (6장).
- 데이터는 **Supabase**, 자동 실행은 **GitHub Actions**, 사이트 올리기는 **Cloudflare Pages**.

---

## 2. 처음 한 번 준비 (20분)

1. **설치**: [Node.js 24 LTS](https://nodejs.org), [Git](https://git-scm.com), 쓰는 AI 도구(Claude Code / Codex / Cursor 중 하나), VS Code.
2. **Git 이름·이메일 설정** — 터미널에서 처음 한 번, 내 이름과 GitHub 이메일로 바꿔서 실행하세요:
   ```bash
   git config --global user.name "이름"
   git config --global user.email "GitHub 이메일"
   ```
3. **GitHub 초대 받기**: 저장소 관리자에게 GitHub 아이디를 알려 주세요.
4. **GitHub CLI 설치·로그인**: https://cli.github.com 에서 설치한 뒤 터미널에서 `gh auth login` 을 실행하고 안내대로 로그인하세요. AI가 PR을 만들 때 필요하고, 건너뛰면 **3장 ⑤ 올리기**에서 막혀요.
5. **코드 받기** — 터미널에서:
   ```bash
   git clone https://github.com/supsuphansoup/trendfood.git
   cd trendfood
   ```
6. **AI 도구를 이 `trendfood` 폴더에서 열고** 이렇게 말하세요:
   > `ONBOARDING.md 랑 CLAUDE.md 읽고, 내 컴퓨터에서 사이트를 띄워줘. web 폴더에서 npm ci 하고 개발 서버 켜서 주소 알려줘.`
7. 브라우저에서 **http://localhost:3000** 이 열리면 성공 🎉 (끌 때는 터미널에서 `Ctrl + C`)
8. **테스트용 브라우저 설치**: `web` 폴더에서 `npx playwright install chromium` 을 처음 한 번 실행하세요. `test:e2e` 전에 필요해요. AI에게 설치를 부탁해도 돼요.

> 키·비밀번호가 없어도 **예시 음식 10개**로 화면이 다 떠요. 관리자 화면(`/admin`)만 "Supabase 연결 전이에요"가 나오는데 정상이에요.

> **Mac 사용자 주의**: 저장소의 `.mcp.json`(AI 도구용 shadcn·Playwright 연결)은 Windows 형식(`cmd /c npx`)이라 Mac에서는 연결이 실패할 수 있어요. 사이트 개발·검사에는 영향이 없고, 필요하면 AI에게 `내 컴퓨터용으로 MCP 설정 바꿔줘(커밋하지 말고)` 라고 하세요.

---

## 3. 바이브코딩 작업 순서 (매번 이 5단계)

| 단계 | 할 일 | AI에게 이렇게 말하기 |
| :--- | :--- | :--- |
| ① 가지 만들기 | `main` 에서 바로 고치지 않기 | `main 최신으로 받고 "feat/상세-타이머" 브랜치 만들어줘` |
| ② 요청하기 | 원하는 걸 **구체적으로** (5장 템플릿) | `상세 화면 타이머 버튼을 더 크게 해줘. 모바일 390px 기준…` |
| ③ 눈으로 보기 | AI 말만 믿지 말고 **직접 화면 확인** | `개발 서버 켜고 바뀐 화면 주소 알려줘` |
| ④ 검사 통과 | 아래 검사 4개가 **전부 통과**해야 끝 | `lint, typecheck, test:unit, test:e2e 돌리고 결과 그대로 보여줘` |
| ⑤ 올리기 | 커밋 → push → Pull Request | `바뀐 파일 목록이랑 요약 보여주고, 커밋하고 PR 만들어줘` |

`main` 에 **잠금(보호 규칙)은 걸지 않았어요.** 대신 우리끼리 약속: `main` 에 바로 push 하지 말고 **항상 PR** 로 올리고, 다른 팀원이 한 번 보고 합쳐요. 보는 사람은 PR의 **Files changed** 탭에서 바뀐 줄을 확인하고, 괜찮으면 **Review changes → Approve → Submit review** 를 눌러요.
PR을 열면 GitHub이 **lint·typecheck·단위 테스트·e2e 검사**를 자동으로 돌리고, **빨간 ✗ 가 있으면 합치지 말고** AI에게 고치게 해요 (잠금이 없어서 막아 주지 않아요). `main` 에 합쳐지면 사이트가 **자동으로 다시 배포**돼요.

### 검사 4개 (AI가 `web` 폴더에서 돌림)

| 명령 | 뭘 보나 |
| :--- | :--- |
| `npm run lint` | 코드 규칙 |
| `npm run typecheck` | 자료형 오류 |
| `npm run test:unit` | 자동 수집 계산 로직 |
| `npm run test:e2e` | 진짜 브라우저로 모바일·PC 화면, 접근성, 관리자 화면까지 (1~2분) |

**AI가 "완료했습니다"라고 해도, 이 4개 결과를 보여 주지 않았으면 끝난 게 아니에요.**

### 큰 기능은 문서부터: intent → spec → plan

글자·색·버그 같은 **작은 수정**은 위 5단계로 바로 해요. **새 기능·화면 추가·데이터 구조 변경** 같은 큰 일은 코드 전에 문서 3개를 거쳐요.
코드는 AI가 빨리 쓰지만, **무엇을 만들지 정하고 제대로 됐는지 확인하는 건 사람 몫**이라서예요. 설계 없이 빠르면 틀린 걸 빨리 만들 뿐이에요.

| 단계 | 문서 | AI 모드 | 내가 할 일 (통과 조건) |
| :--- | :--- | :--- | :--- |
| 기획 | `docs/intent.md` — 무엇을, 왜 | Plan(질문만) → Build | AI 인터뷰에 답하고, 내 말과 다른 곳 고치기 |
| 설계 | `docs/spec.md` — 숫자와 규칙 | Build | **Areas of concern(우려 사항)부터 결정** |
| 계획 | `docs/plan.md` — 바꿀 파일·순서·위험·확인 방법 | Plan → Build | "가장 깨지기 쉬운 곳은?" 납득될 때까지 묻기 |
| 구현·확인 | 코드 + 검사 출력 | Build | 출력을 **직접** 보기 |

- **Plan 모드** = AI가 생각·질문만 하고 파일은 안 고침 / **Build 모드** = 파일을 만들고 명령을 실행. (Claude Code 는 `Shift+Tab` 으로 전환)
- 우리 프로젝트는 이미 세 문서가 있어요. 새 기능이면 **기존 문서에 덧붙여요**. 문제가 생기면 코드부터 고치지 말고 intent 부터 다시.
- **커밋 = 승인.** 문서를 읽고 OK 한 뒤에 커밋해요. 다음 단계는 항상 **앞 단계 문서를 읽고** 시작해요 (말로 넘기면 뜻이 바뀌어요).

**① 기획 (Plan 모드)**
```
<만들고 싶은 기능 한 줄>을 추가하고 싶어. docs/intent.md 와 CLAUDE.md 를 먼저 읽고,
기획자처럼 나를 인터뷰해서 구체화해줘. 한 번에 하나씩 질문하고,
범위·핵심 기능·제약·제외할 것·성공 기준이 정리되면 마쳐줘.
```
→ 모르면 "추천해줘"라고 답해도 돼요. 끝나면 (Build 모드로 바꿔서):
```
인터뷰 내용을 docs/intent.md 에 반영해줘 (Problem / Proposed outcome / Affected users and systems /
Constraints / Open questions, 섹션마다 3줄 이내). 내가 읽고 OK 하면 커밋해줘.
```

**② 설계 (Build 모드, 인터뷰 없이 한 번에)**
```
docs/intent.md 를 읽고 이 기능의 요구사항·설계를 docs/spec.md 에 추가해줘.
Constraints 를 반드시 지키고, 구조는 Requirements / Design / Open questions / Areas of concern.
Open questions 는 질문마다 "결정: ..." 또는 "이월: 이유". 네가 임의로 정한 수치·규칙,
조건끼리 충돌하는 건 Areas of concern 에 적어줘. 코드는 아직 쓰지 마.
```
→ 검토 3가지: ① intent 의 Problem 을 해결하나 ② 질문이 전부 결정/이월됐나 ③ **우려 사항부터 결정**
→ 예) `우려 사항 1번은 <내 결정>으로 할게. 반영하고 커밋해줘`

**③ 계획 (Plan 모드 → Build 모드)**
```
docs/intent.md 와 docs/spec.md 를 읽고 구현 계획을 세워줘.
바꿀 파일, 작업 순서, 단계별 확인 방법, 가장 위험한 부분을 알려주고, 모호하면 먼저 질문해줘.
```
→ 기준: 이 대화를 못 본 사람도 계획만 보고 만들 수 있을 정도. 납득되면:
```
확정된 계획을 docs/plan.md 에 추가하고 (Files that change / Order of work / Risks / Proof) 그대로 실행해줘.
끝나면 검사 4개 출력을 보여주고 커밋해줘.
```

**④ 확인**
- 출력 없이 "성공"이라고만 하면 → `검사 4개 돌리고 결과 그대로 보여줘`
- AI가 **같은 실수를 두 번** 하면 → `이 실수를 AGENTS.md 의 "Things the agent gets wrong" 에 한 줄로 추가해줘`
- 개발 서버처럼 **계속 켜져 있는 프로그램**은 AI 대신 새 터미널에서 직접 `npm run dev` 로 켜는 게 편해요.

| 체크리스트 | |
| :--- | :--- |
| 기획 후 | ☐ intent 를 직접 읽고 내 의도와 맞는지 확인 ☐ 커밋 |
| 설계 후 | ☐ Areas of concern 전부 결정 ☐ Open questions 결정/이월 ☐ 커밋 |
| 구현 전 | ☐ 가장 위험한 부분을 물어봄 ☐ 단계마다 확인 방법이 있음 |
| 구현 후 | ☐ 검사 출력을 직접 봄 ☐ 반복된 실수는 AGENTS.md 에 적음 |
| 문제 발생 | ☐ 코드부터 고치지 말고 intent 부터 다시 |

---

## 4. 교수님·지도학생과 진행할 때

### 진행 상황 보는 곳

- `docs/spec.md` **Requirements**의 ✅(구현됨)·🟡(일부/임시)·⬜(아직)로 어떤 기능이 됐는지 봐요.
- `docs/plan.md` **Order of work**의 ☐(남음)·☑(완료)로 다음 할 일을 봐요.
- `docs/spec.md` **Areas of concern**은 사람이 먼저 보고 결정할 내용이에요.

### 회의 전 준비

AI에게 이렇게 말하세요:
```
docs/plan.md 랑 spec.md 기준으로 지난 회의 뒤에 바뀐 것, 남은 것, 오늘 결정할 것을 1쪽으로 정리해줘.
spec.md 는 docs/spec.md 를 뜻해. git log 로 최근 변경도 요약해줘.
```

### 키 없이 시연하기

개발 서버가 켜져 있으면 `Ctrl + C`로 끄고, `web` 폴더에서 아래 명령을 차례로 실행하세요:
```bash
npm run build
npm start
```
브라우저에서 **http://localhost:3000** 을 열면 **예시 음식 10개**로 시연할 수 있어요 (내 PC 에 키가 없을 때 기준). 개발 서버보다 실제 배포와 같은 빌드 결과를 보여 줘요. 이 방법에서는 관리자 화면(`/admin`)이 안내 문구만 보여요.

**실제 사이트로 시연하기**: **https://trendfood.pages.dev** (Supabase 의 예시 음식 10개). 관리자 시연은 `https://trendfood.pages.dev/admin` 에서 운영자 계정(`trendfood2026@gmail.com`)으로 로그인 — 비밀번호는 팀장에게 **카톡 1:1로** 받아요. 저장소·문서·단체방·AI 채팅에는 절대 쓰지 않아요. 계정 하나를 같이 쓰니까 승인·수정·[사이트에 반영]을 했으면 팀 채팅에 한 줄 남겨요. 0장의 "확인받지 않은 것"을 같이 보여 드리고 피드백을 받아요.

### 회의 결정 기록하기

회의에서 정한 것은 **그날** `docs/spec.md` **Open questions**의 해당 줄을 `결정: … (날짜, 회의)`로 바꾸고 커밋해요. 결정이 코드에 영향을 주면 `docs/plan.md` 에 작업도 추가해요. 말로만 정하고 끝내지 않아요.

**지금 팀 결정이 필요한 안건은 `docs/spec.md` 의 Open questions 1~6번을 보세요**: 아이콘 세트, 칩 높이(42/44px), Gemini 무료 등급, 사진 출처 비중, 참고 가격 표시, 사업자 신고. 각 안건의 현재 상태와 결정할 내용은 그 문서를 기준으로 봐요.

### 지도학생에게 코드 리뷰 받기

**PR 링크**를 공유하세요. 지도학생은 PR의 **Files changed** 탭에서 코드 줄 옆의 **+**를 눌러 줄마다 댓글을 달 수 있어요.

---

## 5. 잘 시키는 법

### 좋은 요청의 4요소: **어디 · 무엇 · 기준 · 확인**

| ❌ 애매한 요청 | ✅ 좋은 요청 |
| :--- | :--- |
| "메인 예쁘게 해줘" | "메인 2위 이하 카드에서 **조리시간 글자를 굵게** 하고, 모바일 390px 에서 한 줄에 들어가게 해줘. `docs/design.md` 글자 크기 표를 따르고, 스크린샷으로 보여줘" |
| "버그 고쳐줘" | "상세 화면에서 '집에 있어요'를 누르고 새로고침하면 체크가 풀려. **다시 생기는 순서**는 ①…②… 원인 찾고 고친 다음, 이 상황을 검사하는 테스트도 추가해줘" |
| "관리자 기능 추가해줘" | "관리자 '게시 관리'에 **사진 바꾸기** 기능을 넣고 싶어. 먼저 어떻게 만들지 **계획만** 보여주고, 내가 OK 하면 만들어줘" |

### 복사해서 쓰는 템플릿

**화면 수정**
```
[어디] ○○ 화면의 ○○ 부분
[무엇] ○○ 를 ○○ 하게 바꿔줘
[기준] docs/design.md 와 theme.css 토큰을 지키고, 모바일 390px·PC 1280px 둘 다 확인
[확인] 바뀐 화면 스크린샷 + 검사 4개 결과 보여줘
```

**버그**
```
[증상] ○○ 하면 ○○ 가 돼야 하는데 ○○ 가 돼
[순서] 1) … 2) … 3) …
[오류] (빨간 오류 메시지 전체 붙여넣기)
원인을 먼저 설명하고 고쳐줘. 같은 버그를 잡는 테스트도 추가해줘.
```

**큰 기능 / 잘 모르는 것**
```
○○ 를 하고 싶어. 바로 만들지 말고
1) docs/spec.md·docs/design.md·CLAUDE.md 기준으로 이게 우리 규칙에 맞는지
2) 어떤 파일을 고칠지, 3) 더 쉬운 방법이 있는지
먼저 알려줘.
```

**검토 받기 (PR 올리기 전에)**
```
지금 바뀐 내용을 리뷰해줘. 버그, 규칙 위반(CLAUDE.md), 필요 없는 변경이 있으면 알려줘.
```

### 꿀팁

- **한 번에 하나만** 시키세요. 여러 개를 한꺼번에 시키면 AI가 엉뚱한 파일까지 고쳐요.
- 대화가 너무 길어져서 AI가 헷갈려 하면 **새 대화**를 열고 "CLAUDE.md 읽고 이어서 ○○ 해줘".
- 이해 안 되는 건 그냥 물어보세요: `방금 고친 거 알기 쉽게 설명해줘`.
- 마음에 안 들면 되돌리기: `방금 바꾼 거 커밋 전이면 되돌려줘` (커밋 후면 `직전 커밋 되돌리는 커밋 만들어줘`).

---

## 6. AI가 자주 하는 실수 — 보이면 바로 멈추게 하기

AI는 `CLAUDE.md` 규칙을 읽지만 **가끔 어겨요.** 아래가 보이면 `멈춰. CLAUDE.md 규칙 위반이야` 라고 말하세요.

| 이런 걸 하면 | 왜 안 되나 |
| :--- | :--- |
| 키·비밀번호를 코드에 쓰거나 `.env.local` 을 커밋 | 공개 저장소라 전 세계에 노출돼요. 실수로 올렸으면 **그 키를 바로 새로 발급** |
| 인스타·틱톡·커뮤니티 **긁어오기(크롤링)**, 영상 자막 추출, 쿠팡 화면 긁기 | 약관·법 위반. 우리는 **공식 API만** |
| 쿠팡 상품을 **여러 탭 한꺼번에** 열기, 장바구니 한꺼번에 담기, 최저가 비교 | 쿠팡 정책 위반. **탭 한 번 = 상품 하나** |
| 장바구니 버튼·재료 체크리스트 **근처에 광고** | 애드센스·쿠팡 정책 위반 |
| Proxy, Server Actions, API 라우트, 쿠키 같은 **서버 기능** 추가 | 우리 사이트는 정적 사이트라 배포가 깨져요 |
| Mantine·Chakra·MUI 등 **다른 UI 라이브러리** 설치, 새 패키지 마음대로 추가 | 우리는 shadcn/ui 만. 새 패키지는 **팀에 먼저 물어보기** |
| 색·글자 크기를 파일마다 직접 숫자로 박기 | 색은 `web/src/app/theme.css` 에서만. 기준은 `docs/design.md` |
| 실패하는 **테스트를 지우거나 건너뛰기**(`skip`) | 문제를 숨기는 것. 코드를 고쳐야 해요 |
| 유튜브·인스타 **썸네일 사진 저장**해서 쓰기 | 저작권. 사진 규칙은 `docs/spec.md` Design의 사진 절 |
| 후기·별점 기능 만들기 | 2단계(사용자 생긴 뒤)로 미뤘어요 |
| `main` 에 바로 push, `git push --force` | 다른 팀원 작업이 날아가요 |
| 부탁 안 한 파일까지 대량으로 고치기 | `요청한 것만 고치고 나머지는 되돌려줘` |

---

## 7. 운영자 하루 루틴 (5분)

관리자 주소: `https://trendfood.pages.dev/admin` — **공개 화면에 링크가 없고 검색에도 안 나와요. 주소를 다른 곳에 올리지 마세요.**

1. **후보 큐**: 아침에 자동으로 들어온 후보 확인 ("급상승 4.2배" 같은 근거가 같이 보여요). 괜찮으면 **승인**(AI 초안이 [게시 관리]에 '초안'으로 들어감), 아니면 **반려**. 내가 본 유행 음식은 **직접 추가**.
2. **게시 관리**: 초안은 **글 고치기로 꼭 직접 읽고 고친 뒤** 게시 (AI는 틀릴 수 있어요). 화살표로 순위, **숨기기**로 내리기.
3. **재료 링크**: 쿠팡 파트너스 링크·참고 가격 넣기 (쿠팡 주소만 저장돼요. 비우면 쿠팡 검색으로 연결).
4. 맨 위 **[사이트에 반영]** → 3~5분 뒤 사이트에 보여요 (5분에 한 번).

"자동 수집 실패 … AI 크레딧·무료 한도 소진"이 보이면 9장.

---

## 8. 처음 한 번 설정 (운영자 1명이 한 번만, 약 1시간)

> **2026-11-05 에 8-1~8-4 는 팀장이 끝냈어요** (0장). 남은 건 8-3 표의 **수집 키(YouTube·네이버·AI)와 `AI_PROVIDER`·`AI_MODEL` 변수**뿐이에요. 아래는 다시 만들거나 계정을 옮길 때의 기록이에요.

> **비밀값은 사람이 직접 각 사이트에 입력해요.** AI 채팅창에 키를 붙여 넣지 마세요. AI에게는 `ONBOARDING.md 8장 순서대로 내가 하는 걸 옆에서 안내해줘` 라고 하면 돼요.

### 8-1. Supabase (DB·로그인)

1. https://supabase.com → **New project** (지역 Seoul 또는 Tokyo).
2. **SQL Editor** 에 `web/supabase/migrations/0001_init.sql` 붙여 넣고 **Run** → 이어서 `web/supabase/seed.sql` **Run** (예시 음식 10개).
3. **Authentication → Sign In / Providers**: 이메일만 켜고 **"Allow new users to sign up" 끄기**.
4. **Authentication → Users → Add user** 로 운영자 계정 만들기.
5. SQL Editor 에서 운영자 등록 (이메일만 바꿔서):
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = '운영자@이메일';
   ```
6. **Project Settings → API** 에서 `Project URL`, `anon public` 키, `service_role` 키 메모.

### 8-2. Cloudflare Pages (사이트 올리기)

1. https://dash.cloudflare.com → **Workers & Pages → Create → Pages → Direct Upload**, 프로젝트 이름 `trendfood`.
2. **API Tokens → Create Token** (권한: Account · Cloudflare Pages · Edit). 토큰과 **Account ID** 메모.

### 8-3. GitHub 비밀값·변수 (저장소 → Settings → Secrets and variables → Actions)

| 종류 | 이름 | 값 |
| :--- | :--- | :--- |
| Secret | `SUPABASE_URL` · `SUPABASE_ANON_KEY` · `SUPABASE_SERVICE_ROLE_KEY` | 8-1 에서 메모한 값 |
| Secret | `CLOUDFLARE_API_TOKEN` · `CLOUDFLARE_ACCOUNT_ID` | 8-2 |
| Secret | `YOUTUBE_API_KEY` | Google Cloud Console → YouTube Data API v3 → API 키 |
| Secret | `NAVER_CLIENT_ID` · `NAVER_CLIENT_SECRET` | 네이버 개발자센터 → 애플리케이션 등록 → 데이터랩(검색어트렌드) |
| Secret | `OPENAI_API_KEY` 또는 `GEMINI_API_KEY` | 9장 |
| Variable | `AI_PROVIDER` · `AI_MODEL` | `openai`/`gemini`, 그 회사 문서의 모델 이름 |

키가 비어 있으면 그 단계는 **예시 값으로** 돌아가요. 하나씩 채우면 그 단계부터 진짜 데이터가 돼요.

### 8-4. [사이트에 반영] 버튼 연결

1. GitHub **Settings → Developer settings → Fine-grained tokens**: 저장소 `trendfood` **하나만**, 권한 **Contents: Read and write** 만. 기한은 **만료 없음**으로 만들었어요 (0장 ⚠4) — 프로젝트를 접거나 유출이 의심되면 바로 삭제.
2. Supabase **Edge Functions → Deploy a new function → Via Editor**: 이름 `request-publish`, 내용은 `web/supabase/functions/request-publish/index.ts` (Verify JWT 켠 채로).
3. **Edge Functions → Secrets**: `GITHUB_TOKEN`(1번 토큰), `GITHUB_REPO` = `supsuphansoup/trendfood`.

### 8-5. 확인

GitHub **Actions → deploy → Run workflow** ✓ → `https://trendfood.pages.dev` 에서 사이트 확인 → **Actions → pipeline → Run workflow** → 관리자 [후보 큐]에 후보가 생기면 끝!

---

## 9. AI 바꾸기 (자동 수집용, OpenAI ↔ Gemini)

- **이번 달**: ChatGPT Pro 요금제의 API 크레딧. https://platform.openai.com 에 **같은 이메일**로 로그인 → 키 발급 → `OPENAI_API_KEY`, `AI_PROVIDER=openai`. 크레딧은 **매달 사라지고**, 다 쓰면 수집만 멈춰요 (사이트는 멀쩡).
- **그 뒤**: https://aistudio.google.com → `GEMINI_API_KEY`, `AI_PROVIDER=gemini`, `AI_MODEL` 은 무료 등급 모델. 무료 등급 약관(입력 학습 사용 여부)은 쓰기 전에 확인 — 팀 결정 대기 항목이에요.
- 바꾸는 곳은 **GitHub Variables 두 개 + 키 하나**뿐. 코드는 안 고쳐요.

---

## 10. 막혔을 때

1. **빨간 오류 메시지 전체**를 복사해서 AI에게: `이 오류 원인이 뭐고 어떻게 고쳐? (오류 붙여넣기)`
2. AI가 같은 실수를 3번 반복하면 **새 대화**를 열고 처음부터 상황을 설명하기.
3. 그래도 안 되면 혼자 오래 붙잡지 말고 **팀 채팅에 오류 + AI에게 시킨 말**을 같이 올리기.

| 자주 나오는 증상 | 해결 |
| :--- | :--- |
| `npm ci` 실패 | `node --version` 이 24 인지 확인 → 아니면 Node 24 설치 후 터미널 다시 열기 |
| 3000 포트가 이미 사용 중 | 다른 터미널의 개발 서버 끄기, 또는 `npm run dev -- -p 3001` |
| `test:e2e` 가 브라우저 없다고 함 | 설치를 건너뛰었으면 `web` 폴더에서 `npx playwright install chromium` 한 번 실행 |
| "Supabase 연결 전이에요" | 정상 (키 없음). 실제 데이터가 필요하면 운영자에게 `web/.env.local` 값 받기 — **anon 키만**, service_role 키는 절대 X |
| "관리자 권한이 없어요" | 8-1 의 5번 SQL 로 운영자 등록 |
| [사이트에 반영] 이 "GitHub 에 요청하지 못했어요" | 8-4 토큰이 삭제·변경됨 → 새로 만들어 Supabase `GITHUB_TOKEN` 교체 |
| 반영했는데 그대로 | GitHub **Actions → deploy** 의 빨간 ✗ 로그를 AI에게 보여 주기 |
| 매일 수집이 멈춤 | 60일 동안 커밋이 없으면 GitHub 이 멈춰요 → Actions → pipeline → **Enable workflow** |

---

## 11. 용어 사전

| 용어 | 쉬운 설명 |
| :--- | :--- |
| 바이브코딩 | 코드를 직접 치지 않고 AI에게 말로 시켜서 만드는 방식 |
| 저장소 / 브랜치 / 커밋 / PR | 프로젝트 폴더 / 내 작업용 갈래 / 저장 지점 / "이거 합쳐도 돼?" 요청 |
| push / merge | GitHub 에 올리기 / 갈래를 합치기 |
| 정적 사이트 · 빌드 · 배포 | 미리 만든 HTML 파일 사이트 · HTML 묶음 만들기 · 인터넷에 올리기 |
| Supabase · 테이블 · RLS | DB+로그인 서비스 · DB 안의 표 · 줄마다 "누가 읽고 쓰나" 정하는 규칙 |
| anon 키 / service_role 키 | 공개돼도 되는 열쇠 / 모든 문을 여는 **비밀** 열쇠 |
| 환경변수 · `.env.local` | 코드 밖에 두는 설정값 · 내 컴퓨터 전용 설정 파일 (**커밋 금지**) |
| GitHub Actions · 워크플로 | GitHub 이 대신 명령을 돌려 주는 기능 · 그 작업 하나 (`deploy`, `pipeline`) |
| lint · typecheck · e2e | 코드 규칙 검사 · 자료형 검사 · 브라우저로 사람처럼 눌러 보는 검사 |
| slug | 주소에 쓰는 영어 이름 (`/food/dubai-chocolate`) |

---

## 12. 파일 지도 (AI에게 "어디 고쳐?" 물을 때 참고)

```
trendfood/
├── ONBOARDING.md       ← 이 문서 (사람용)
├── CLAUDE.md           ← Claude Code 용 규칙·진행 상황
├── AGENTS.md           ← Codex·Cursor 용 규칙(자기완결)
├── docs/               ← 기준 문서: intent.md(무엇·왜) → spec.md(숫자·규칙) → plan.md(남은 작업) + design.md(시각 규칙)
├── archive/            ← 예전 기획 자료 (참고용, 기준 아님)
│   ├── prd-v2.1.md     ← 통합 전 기획서 보관본
│   └── design-mockups/ ← 예전 시안·탈락안·데모 사진 (실서비스 사용 금지)
├── .github/workflows/  ← deploy.yml(배포), pipeline.yml(매일 수집)
└── web/                ← 실제 사이트
    ├── src/app/            주소별 화면 (/, /food/[slug], /about, /admin)
    ├── src/app/theme.css   색·글자 크기 (디자인은 여기서만)
    ├── src/components/     화면 조각 (home, detail, admin, ui)
    ├── src/data/           데이터 형식·예시 음식 10개
    ├── scripts/pipeline/   매일 수집 스크립트
    ├── supabase/           DB 만드는 SQL, 반영 버튼 함수
    └── e2e/                브라우저 자동 테스트
```
