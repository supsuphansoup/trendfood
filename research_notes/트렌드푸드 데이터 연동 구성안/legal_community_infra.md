# TrendFood: 법률·익명 커뮤니티 운영·인프라 비용 조사 노트 (작성일 2026-10-29)

> 일반 정보이며 법률 자문이 아님. "변호사 확인 필요"로 표시한 항목은 출시 전에 전문가 검토를 받을 것. [미검증]은 1차 출처로 확인하지 못한 주장.

## (A1) 레시피 저작권, LLM 요약, 영상 임베드

### Takeaway
재료 목록과 조리 순서 자체는 아이디어나 사실로 보아 보호되지 않을 가능성이 크다. 다만 설명 문장, 화면 구성, 영상, 썸네일 같은 창작적 표현은 보호된다. 그래서 LLM이 "사실(재료·분량·단계)만 추출해 새 문장으로 쓰고, 원본은 공식 YouTube 플레이어로 임베드하고, 출처를 링크하는" 구조가 위험이 가장 낮다. 영상을 다운로드해 다시 올리거나, 자막이나 원문을 그대로 옮기거나, 썸네일을 복제해 호스팅하는 방식은 피해야 한다.

### Cited Findings
- 한국저작권위원회 계간지에 실린 논문은 아이디어·표현 이분법에 따라 레시피를 아이디어에 가깝다고 본다. 덧붙은 설명이나 지시문이 독창적 표현 요건을 갖추면 보호될 수 있다고 정리한다. — [한국저작권위원회 계간 논문 PDF](https://copyright.or.kr/eng/doc/quarterly_pdf/196%20A%20Study%20on%20Copyright%20Law%20Issues%20over%20the%20protection%20of%20recipes.pdf)
- 법률 블로그 해설: 레시피 자체는 보호 대상이 아니고, 보호 여부는 표현 방식에 달려 있다. 대안으로 상표나 영업비밀(부정경쟁방지법) 보호를 든다. — [sugar.legal](https://blog.sugar.legal/black-white-chef-recipe-copyright); [이투데이 2024 '덮죽' 기사](https://www.etoday.co.kr/news/view/2020177)
- 2026-07 서울신문 칼럼은 대법원이 2023년 판결에서 "구체적으로 표현한 창작적 형식"이 보호 대상임을 확인했다고 주장한다. 사건번호는 확인하지 못했다. [미검증] — [서울신문 2026-07-17](https://m.seoul.co.kr/news/2026/07/17/20260717027008)
- 링크 책임: 대법원 2021. 9. 9. 선고 2017도19025 전원합의체 판결은 "링크는 방조가 아니다"라는 종전 법리를 바꿨다. 침해 게시물인 줄 알면서 영리적·계속적으로 링크를 제공하면 공중송신권 침해의 방조가 될 수 있다. 후속 판결로 2021도10903이 있다. — [대법원 판결 PDF](https://www.scourt.go.kr/sjudge/1631187982361_204622.pdf); [nepla 해설](https://www.nepla.ai/wiki/지식재산/저작권/저작물-인터넷-링크의-위법성-jxm9lj62npgr); [세종 뉴스레터](https://shinkim.com/kor/media/newsletter/pdf/1771)
- 언론은 이 판결을 "재생 가능한 임베디드 링크도 (불법 업로드물이면) 방조가 될 수 있다"는 취지로 보도했다. — [메트로서울 2021-12](https://www.metroseoul.co.kr/article/20211205500003)

### Inferences
- 권리자가 직접 올린 공식 영상을 YouTube 임베드 플레이어로 보여 주는 것은 위 판례의 "침해 게시물 링크"에 해당하지 않으므로 위험이 낮다. 재업로드 영상이나 출처가 불분명한 쇼츠 모음 채널은 큐레이션 대상에서 빼는 필터가 필요하다.
- LLM 프롬프트는 "재료명·분량·조리 단계를 사실로만 추출하고, 원문 표현·말투·유행어를 그대로 쓰지 말 것"으로 설계한다. 출력에 원문 자막과 긴 구간이 겹치는지(예: n-gram 중복률) 검사하면 표현 복제 위험을 줄일 수 있다.
- 크리에이터 채널명과 원본 링크를 상단에 고정하고, "원작자 요청 시 즉시 내림" 창구(이메일·폼)를 두면 분쟁과 평판 위험을 낮출 수 있다. 저작권법상 OSP 면책(제102·103조) 요건과도 맞물린다(조문은 변호사 확인 필요).
- YouTube API 서비스 약관과 임베드 정책(자동재생, 광고 제거 금지 등)도 따로 지켜야 한다. 이번 조사에서는 원문을 확인하지 못했다.

### Gaps
- 만개의레시피 등 국내 레시피 플랫폼의 저작권 처리 방식(약관상 권리 귀속, 크롤링 정책)을 다룬 자료는 찾지 못했다.
- 한국 법원의 레시피 저작물성 판결 원문(사건번호)과 한국저작권위원회의 공식 상담 답변은 확인하지 못했다.
- YouTube 자막 추출(비공식 API, 스크래핑)이 YouTube 약관에 맞는지는 확인하지 못했다. 변호사와 약관 원문 확인이 필요하다.

## (A2) 개인정보보호법·정보통신망법·사업자 요건(익명 후기, 제휴 사이트)

### Takeaway
비회원 익명 후기라도 IP(해시), 수정·삭제용 비밀번호, 쿠키나 기기 식별값을 처리하면 개인정보처리방침을 공개하는 것이 안전한 선택이다. IP가 개인정보인지는 해석이 갈린다. 게시판 운영자로서 정보통신망법 제44조의2의 임시조치(최대 30일) 절차와 약관 고지가 필요하다. 쿠팡파트너스 링크에는 공정위 추천·보증 지침에 따라 대가성 문구를 본문 상단에 표시해야 한다. 통신판매업 신고, 부가통신사업 신고, 사업자등록이 필요한지는 1차 출처로 확정하지 못했으므로 세무사·변호사 확인이 필요하다.

### Cited Findings
- 정보통신망법 제44조의2: 권리침해 판단이 어렵거나 다툼이 예상되면 서비스 제공자는 30일 이내로 임시조치(접근 차단)를 할 수 있다. 삭제 요청을 받으면 지체 없이 조치하고 신청인과 게시자에게 알려야 한다. 헌법재판소는 2016헌마275 사건에서 6대 3으로 합헌 결정했다. — [법률신문](https://www.lawtimes.co.kr/news/166260); [lawtalk 해설](https://www.lawtalk.co.kr/posts/177280)
- 임의 임시조치(제44조의3)를 하려면 그 내용과 절차를 약관에 미리 밝히고 게시판 공시 등으로 알려야 한다. 게시자는 재게시를 청구할 수 있다. — [nepla 위키](https://www.nepla.ai/wiki/it-%EC%A0%95%EB%B3%B4-%EB%B0%A9%EC%86%A1%ED%86%B5%EC%8B%A0/%EC%9D%B8%ED%84%B0%EB%84%B7-%EB%B0%A9%EC%86%A1-%ED%86%B5%EC%8B%A0/%EC%A0%95%EB%B3%B4%ED%86%B5%EC%8B%A0%EB%A7%9D%EB%B2%95-%EC%83%81-%ED%94%8C%EB%9E%AB%ED%8F%BC-%EC%9A%B4%EC%98%81%EC%9E%90%EC%9D%98-%EA%B2%8C%EC%8B%9C%EA%B8%80-%EA%B4%80%EB%A6%AC-%EB%B0%A9%EB%B2%95-g6w93mqxnojp)
- 2026년에 정보통신망법 개정이 있었다는 해설은 있지만 구체적 조문은 확인하지 못했다. [미검증] — [lawtalk 2026 개정 해설](https://www.lawtalk.co.kr/posts/164921)
- IP주소가 개인정보인지는 명문 규정이 없어 논쟁이 있다. 2011년 서울중앙지검은 유동 IP를 개인정보로 보지 않았다. 반면 시민단체는 IP 같은 기기식별자를 개인정보로 봐야 한다고 주장한다. 개보위 해석사례집(2024.06)은 다른 정보와 "쉽게 결합"해 개인을 알아볼 수 있으면 개인정보라는 기준을 쓴다. — [nepla: IP주소 개인식별정보 여부](https://www.nepla.ai/wiki/it-정보-방송통신/개인정보-위치정보-신용정보/개인정보에-해당하는지-여부가-문제되는-사례-모음/ip-주소는-개인식별정보인가-0xr84dxyo8q1); [참여연대 의견서](https://peoplepower21.org/publiclaw/1985093); [보안뉴스: 개보위 해석 사례](https://m.boannews.com/html/detail.html?idx=113242)
- 개인정보보호위원회 공식 사이트에는 법령·해석 메뉴가 있으나, 이번 조사에서 제30조(처리방침 수립·공개) 원문은 열람하지 못했다. — [pipc.go.kr](https://pipc.go.kr/np/default/page.do?mCode=E010010010)
- 쿠팡파트너스 대가성 표시: 공정위 '추천·보증 등에 관한 표시·광고 심사지침' 개정이 2024-12-01부터 적용되어, 표시 문구를 글 상단이나 첫머리에 둬야 한다는 실무 가이드가 많다. 예시 문구는 "이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다"이다. 모두 2차 자료다. — [foxcg 2026](https://foxcg.com/coupang-partners-display/); [i-boss](https://www.i-boss.co.kr/ab-1486505-51318)
- 사업자등록: 반복·계속적인 쿠팡파트너스 수익은 사업자등록 의무로 이어질 수 있다는 2차 가이드가 있으나 기준 금액과 근거 조문은 없다. [미검증] — [calcnara 가이드](https://calcnara.com/guides/coupang-partners-guide)
- 부가통신사업: 언론은 "사실상 인터넷망을 이용해 사업하는 자본금 1억원 이상 기업 대부분"이 신고 대상이라고 설명한다(전기통신사업법 제22조). — [inews24](https://www.inews24.com/view/1313798)

### Inferences
- [미검증·기억 기반] 전기통신사업법 제22조와 시행령에는 자본금 1억원 이하 소규모 부가통신사업을 신고한 것으로 보는(신고 간주) 규정이 있는 것으로 알고 있다. 1인 또는 소규모 MVP는 별도 신고가 필요 없을 가능성이 높다. law.go.kr 원문과 과기정통부 확인이 필요하다.
- 통신판매업 신고: TrendFood는 상품을 직접 팔지 않고 쿠팡으로 링크만 보낸다. 따라서 통신판매업자나 통신판매중개자(전자상거래법)에 해당하지 않을 가능성이 높다. 다만 이를 확인한 1차 출처는 없으므로 변호사 확인이 필요하다.
- 개인정보 최소수집 설계:
  - IP는 원문 대신 "IP+일별 rotating salt"로 HMAC해서 저장하고 짧게 보관한다(예: 7~30일).
  - 비밀번호는 bcrypt나 argon2로 해시한다.
  - Turnstile 토큰은 저장하지 않는다.
  - 이렇게 해도 처리방침(수집 항목, 목적, 보유기간, 위탁사로 Vercel·Supabase·Cloudflare·LLM 제공사, 국외이전)은 공개한다.
  - 국외이전 고지가 필요한지(Supabase·Vercel 리전, LLM API로 후기 텍스트 전송)는 변호사 확인이 필요하다.
- 청소년유해매체물 표시 의무는 레시피와 후기 서비스에서는 해당 가능성이 낮다. 주류 레시피(칵테일 등)를 다룰 때 표현 수위는 검토한다. 1차 출처로 확인하지 못했다.

### Gaps
- 개인정보 보호법 제30조 원문과 "비회원 게시판의 처리방침 의무"에 대한 개보위 공식 해석을 확인하지 못했다.
- 부가통신사업 신고 간주(소규모) 조항, 통신판매업 신고 필요 여부, 사업자등록 기준 금액을 1차 출처로 확인하지 못했다. 세무사·변호사 확인이 필요하다.
- 2026년 정보통신망법 개정의 구체 내용을 확인하지 못했다.

## (A3) AI 기본법 표시 의무가 LLM 생성 레시피 텍스트에 적용되는지

### Takeaway
「인공지능 발전과 신뢰 기반 조성 등에 관한 기본법」(AI 기본법)은 2026-01-22에 시행됐다. 생성형 AI를 이용한 서비스를 제공하는 "AI 사업자"는 서비스가 AI 기반임을 사전에 고지하고(제31조 제1항), 결과물이 AI로 생성됐음을 표시해야 한다(제2항). 과기정통부 가이드라인은 텍스트도 대상에 포함하는 것으로 해석된다. TrendFood가 LLM 출력을 그대로 공개하면 "이용자"가 아니라 "AI 서비스 제공자"로 판단될 여지가 있다. 레시피 페이지에 "AI 요약" 배지와 이용약관 고지를 넣는 것이 비용이 적고 안전한 선택이다. 과태료는 최대 3,000만원이지만 최소 1년 계도기간 동안 유예된다.

### Cited Findings
- 법률과 시행령이 2026-01-22에 시행됐다. 위반 시 시정명령과 최대 3,000만원 과태료가 부과될 수 있다. 정부는 최소 1년 이상 계도기간을 두고 과태료 부과를 유예한다. — [뉴시스 2026-01-21](https://mobile.newsis.com/view/NISX20260121_0003484769); [헤럴드경제](https://www.heraldk.com/article/2026012118293709444)
- 제31조 제1항과 시행령 제23조 제1항에 따른 사전 고지는 이용약관·계약서 명시, 앱·화면 표시 등으로 이행한다. 결과물이 서비스 안에서만 쓰이면 UI나 로고 표시로 유연하게 표시할 수 있다. 결과물을 내려받거나 공유하는 등 외부로 반출할 때는 사람이 인식하는 방법(가시 워터마크 등)으로 표시하거나, 안내 후 기계 판독 방법(메타데이터)을 쓴다. 대상에는 "텍스트, 이미지, 영상"이 명시돼 있다. — [newsseoul: 과기정통부 '인공지능 투명성 확보 가이드라인'](https://newsseoul.co.kr/news/view/1065609609648210); [lawtalk 가이드라인 정리](https://www.lawtalk.co.kr/posts/161692)
- AI를 업무 도구로만 쓰는 "이용자"(예: AI로 영화를 만드는 제작사)는 의무 대상이 아니라는 가이드라인 예시가 있다. — [lawtalk](https://www.lawtalk.co.kr/posts/161692); [헤럴드경제](https://www.heraldk.com/article/2026012118293709444)
- 시행령 개정안이 2026-07-14 국무회의를 통과했고, 개정 법률이 2026-07-21부터 시행됐다는 보도가 있다('AI 제품·서비스 확인 제도' 신설). 표시 의무 세부가 바뀌었는지는 확인하지 못했다. [부분 미검증] — [세종 뉴스레터](https://shinkim.com/kor/media/newsletter/pdf/3114)

### Inferences
- TrendFood는 판단이 갈릴 수 있는 회색지대에 있다. 운영자가 내부에서 LLM으로 초안을 만들고 사람이 검수해 게시하면 "이용자"에 가깝다. 반대로 자동 파이프라인이 LLM 출력을 사람 검수 없이 그대로 공개하면 "생성형 AI 기반 서비스 제공"으로 볼 여지가 커진다. 변호사 확인이 필요하다.
- 저비용 대응안은 다음과 같다(계도기간 중에도 권장).
  - 레시피 카드에 "AI가 영상 내용을 요약했습니다 · 원본 영상 확인" 배지를 단다.
  - 이용약관과 FAQ에 AI 활용 사실을 적는다.
  - 공유나 복사용 텍스트에 출처와 AI 요약 문구를 붙인다.
  - 페이지 메타데이터에 AI 생성 여부를 표시하는 필드를 둔다. 표준 형식은 확인하지 못했다.
- 사실 오류(알레르기 성분, 분량 오류)를 줄이도록 "AI 요약은 부정확할 수 있음" 고지와 원본 대조 링크를 함께 둔다.

### Gaps
- 법 제31조와 시행령 제23조 원문, 2026-07 개정 이후 표시 의무 조문은 law.go.kr에서 직접 확인하지 못했다. wikidocs 정리글 페이지는 403으로 열리지 않았다.
- "사람이 검수한 AI 텍스트"를 표시 대상에서 빼는 예외가 있는지 확인하지 못했다.

## (B) 계정 없는 익명 후기 커뮤니티: 스팸·어뷰징 방지

### Takeaway
기본 조합은 다음과 같다.
- Cloudflare Turnstile(무료)
- 서버 측 rate limit(IP 해시와 쿠키 기준)
- DC인사이드식 "닉네임+비밀번호"(수정·삭제용)
- 한국어 욕설 사전과 경량 분류기를 1차로 쓰고, 애매한 건만 저가 LLM으로 판정하는 2단 필터
- 신고 누적 시 자동 임시조치

평점 조작 방지에는 레시피당 같은 해시 IP와 쿠키 1회 제한, 신규 후기의 지연 반영, 이상치 가중 감소를 쓴다.

### Cited Findings
- Cloudflare Turnstile Free 플랜은 무료이며 위젯 최대 20개, 모든 위젯 유형을 제공한다. — [Cloudflare Turnstile Plans](https://developers.cloudflare.com/turnstile/plans/)
- siteverify 월 요청 한도는 출처마다 다르다. Piano 문서는 무료 계정을 월 100만 건으로 제한한다고 쓰고, 여러 블로그는 한도가 없다고 쓴다. 공식 문서 확인이 필요하다. — [Piano docs](https://docs.piano.io/en/subscriptions/cloudflare-turnstile); 상충: [frontdeskreview](https://frontdeskreview.com/software/captcha-services/cloudflare-turnstile/)
- Turnstile의 탐지율을 33%로 비판한 리뷰가 있다. 경쟁사(roundtable.ai)가 쓴 자료라 편향 가능성이 있다. — [roundtable.ai](https://roundtable.ai/blog/cloudflare-turnstile-reviews-pricing-alternatives)
- Vercel WAF는 Hobby에서 커스텀 룰 3개와 IP 차단 10개, Pro에서 각각 40개를 제공한다. DDoS 완화는 기본으로 켜져 있다. — [Vercel Hobby plan docs](https://vercel.com/docs/plans/hobby)
- Smilegate UnSmile 데이터셋: 한국어 혐오표현 멀티라벨 데이터로 약 18,742문장이다. 상업적 이용은 Smilegate와 별도 협의가 필요하다. — [Smilegate newsroom](https://newsroom.smilegate.com/eng/Smilegate_AI_Center); [sourcepulse 요약](https://www.sourcepulse.org/projects/1844924)
- kocohub/korean-hate-speech(BEEP!)는 연예 뉴스 댓글에 사람이 라벨을 단 최초의 한국어 독성 코퍼스다. — [arXiv 2005.12503 관련 목록 AwesomeKorean_Data](https://github.com/songys/AwesomeKorean_Data)
- K-MHaS는 뉴스 댓글 109k개의 멀티라벨 데이터다. K-HATERS는 약 192k 댓글에 대상별 공격성 등급을 단 데이터다. 2runo/Curse-detection-data는 병합 데이터셋(SJ-Donald/kor-hate-sentence)에 포함돼 있다. — [arXiv 2208.10684](https://arxiv.org/abs/2208.10684v3); [AwesomeKorean_Data](https://github.com/songys/AwesomeKorean_Data)

### Inferences
- 라이선스 주의: UnSmile은 상업 이용에 협의가 필요하다. 다른 데이터셋도 연구용 라이선스가 많으므로, 상업 서비스에서 모델 학습에 쓰기 전에 각 리포 LICENSE를 확인한다.
- 저비용 대안은 데이터셋 학습 없이 "욕설 정규식·사전(초성·변형 포함)"과 LLM 판정을 조합하는 것이다. 비용 추정은 C2 참고.
- DC인사이드 패턴을 적용하면 다음과 같다(1차 출처 미확인, 관행 기반).
  - 유동닉 옆에 IP 앞 두 옥텟을 공개해 동일인을 식별할 수 있게 한다. TrendFood는 개인정보 위험을 줄이기 위해 "해시 앞 4자리 태그"로 대체하는 것을 권장한다.
  - 수정·삭제 비밀번호를 받는다.
  - 레시피당 1인 1평점을 IP 해시와 httpOnly 쿠키, 24시간 TTL로 제한한다.
  - 평균 대신 베이지안 평균을 써서 소수 조작의 영향을 줄인다.
  - 후기 이미지 업로드는 MVP에서 끄거나 지연 공개(관리자 승인)한다. 음란·불법 이미지 리스크와 스토리지 비용을 함께 줄일 수 있다.
- 브라우저 fingerprint(FingerprintJS 등)는 개인정보 처리 범위를 넓히므로 MVP에서는 빼는 것을 권장한다.

### Gaps
- DC인사이드 유동닉, 비밀번호, IP 일부 공개 정책에 대한 공식 문서는 찾지 못했다.
- hCaptcha의 현재 무료 한도는 조사하지 못했다.

## (C1) 호스팅·DB·스케줄러(Vercel, Supabase, Cron)

### Takeaway
Vercel Hobby는 약관상 비상업·개인 용도 전용이다. 쿠팡파트너스 수익이 나는 서비스는 상업적 이용에 해당하므로 Pro(개발자 시트당 월 $20)를 써야 한다. Supabase Free는 DB 500MB, 스토리지 1GB이며 7일 동안 활동이 없으면 일시정지된다. 트래픽이 꾸준한 서비스라면 정지 위험이 낮지만, 출시 시점이나 안정 운영 단계에서는 Pro(월 $25)를 권장한다. 하루 1~수 회 파싱 배치는 Vercel Cron(Hobby는 1일 1회, 정밀도 ±59분)이나 GitHub Actions, Supabase pg_cron으로 충분하다.

### Cited Findings
- "the Hobby plan restricts users to non-commercial, personal use only"(fair use guidelines 참조). Pro 개발자 시트는 사용자당 월 $20이다. Hobby의 Function 최대 실행 시간은 300초다. 문서 최종 수정일은 2026-09-14다. — [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- Hobby 포함량은 다음과 같다.
  - Fast Data Transfer 100GB
  - Function Invocations 1M
  - Active CPU 4 CPU-hrs
  - Image Transformations 5,000
  - Image Cache Reads 300k
  - Web Analytics 50k events/월
  - 한도를 넘으면 해당 기능이 30일간 정지될 수 있다.
  - 출처: [Vercel Hobby plan](https://vercel.com/docs/plans/hobby)
- Cron: 모든 플랜에서 프로젝트당 100개까지 쓸 수 있다(2026-01 변경, 이전에는 Hobby 2개). Hobby는 최소 주기가 1일 1회이고 정밀도는 시간 단위(±59분)다. 그보다 잦은 표현식은 배포 단계에서 실패한다. Pro는 분 단위로 쓸 수 있다. 문서 최종 수정일은 2026-07-15다. — [Vercel Cron usage & pricing](https://vercel.com/docs/cron-jobs/usage-and-pricing); [Vercel limits (2026-09-16)](https://vercel.com/docs/limits)
- Supabase Free:
  - DB 500MB/프로젝트
  - Egress 5GB(+cached 5GB)
  - 파일 스토리지 1GB(업로드 최대 50MB)
  - Edge Functions 50만 회
  - MAU 5만, 활성 프로젝트 2개
  - "Free projects are paused after 1 week of inactivity"
  - 이미지 변환은 미포함
  - 출처: [supabase.com/pricing](https://supabase.com/pricing.md)
- Supabase Pro(월 $25부터):
  - DB 8GB(초과 GB당 $0.125)
  - 스토리지 100GB
  - Egress 250GB
  - Edge Functions 200만 회
  - 컴퓨트 크레딧 $10(Micro 1대)
  - 비활성 일시정지 없음, 백업 7일
  - 출처: [supabase.com/pricing](https://supabase.com/pricing.md)

### Inferences
- 월 고정비 최소 구성(상업 운영 기준)은 Vercel Pro $20 + Supabase Pro $25 = 약 $45/월이다. 여기에 LLM 비용 수 달러가 더해진다. 런칭 전 비공개 데모 단계에서는 Hobby와 Free로 운영할 수 있다.
- Supabase Free에서 출발한다면 일시정지를 막는 장치가 필요하다. 매일 도는 Vercel Cron이 DB에 쿼리하면 "활동"이 생길 가능성이 높지만, 무엇을 활동으로 판정하는지는 공식 문서에서 확인하지 못했다.
- 스케줄러 선택지:
  - 레시피 수집·파싱 배치(일 1~2회): Vercel Cron(Pro면 원하는 주기)이나 GitHub Actions schedule. 공개 리포는 무료이고 비공개 리포는 무료 분량 내에서 쓸 수 있다(분량은 이번에 확인하지 못함).
  - DB 내부 정리(오래된 IP 해시 삭제, 평점 집계): Supabase pg_cron이 적합하다.
  - LLM 호출이 길어질 수 있으므로 Function 실행 시간(Hobby 300초)을 고려해 레시피 1건당 1회 호출로 분할한다.
- 후기 사진: Supabase Free 스토리지 1GB에는 이미지 변환이 없다. Vercel 이미지 최적화를 쓰면 Hobby 기준 변환 5,000회가 포함된다. 업로드할 때 클라이언트에서 WebP로 리사이즈(예: 긴 변 1280px, 200KB 이하)하면 두 한도를 모두 아낄 수 있다.

### Gaps
- Vercel Pro의 크레딧 기반 포함량(월 크레딧 금액)과 상업 이용 정의 원문(fair-use-guidelines#commercial-usage)은 직접 열람하지 않았다.
- Supabase pg_cron과 Edge Functions의 Free 제약(실행 시간 등), GitHub Actions의 비공개 리포 무료 분량은 확인하지 못했다.

## (C2) LLM 비용 추정(파싱 10~30건/일 + 후기 모더레이션)

### Takeaway
현재 가격(2026-10 기준)으로는 레시피 30건/일 파싱과 후기 300건/일 모더레이션을 합쳐도 월 $2~20 수준이다. 가장 싼 선택지는 Claude Haiku 5.5(≤100k 프롬프트: 입력 $0.10, 출력 $0.50/MTok)와 Gemini 2.5 Flash-Lite(입력 $0.10, 출력 $0.40/MTok, 무료 티어 있음)다. Gemini 무료 티어는 입력 데이터가 제품 개선에 쓰이므로 후기 원문을 보내기에는 부적합하다.

### Cited Findings
- Anthropic 가격(USD/MTok):
  - Claude Haiku 5.5(프롬프트 100k 이하): 입력 $0.10, 캐시 히트 $0.01, Batch 입력 $0.05·출력 $0.25. Batch가 50% 할인이므로 표준 출력은 $0.50으로 추정된다.
  - Claude Haiku 4.5: 입력 $1, 출력 $5, Batch $0.50/$2.50.
  - Batch API는 입력과 출력 모두 50% 할인된다.
  - 출처: [Claude pricing](https://platform.claude.com/docs/en/about-claude/pricing)
- Gemini 가격(USD/MTok, 표준 입력/출력):
  - 2.5 Flash-Lite $0.10/$0.40
  - 3.1 Flash-Lite $0.25/$1.50
  - 2.5 Flash $0.30/$2.50
  - 3 Flash Preview $0.50/$3.00
  - 3.6·3.8 Flash $0.75/$3.75(2027-01-01부터 $1.50/$7.50)
  - Batch는 50% 할인이며, 무료 티어 콘텐츠는 Google 제품 개선에 쓰인다.
  - 출처: [Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)

### Inferences
가정: 레시피 1건 = 자막과 프롬프트 6k 입력 토큰 + JSON 출력 1.5k 토큰. 30건/일이면 월 900건 = 입력 5.4M, 출력 1.35M. 후기 300건/일이면 월 9,000건, 건당 입력 500·출력 50 토큰 = 입력 4.5M, 출력 0.45M.

| 모델 | 레시피 파싱/월 | 후기 모더레이션/월 | 합계 |
|---|---|---|---|
| Claude Haiku 5.5 (표준) | 약 $1.2 | 약 $0.7 | 약 $1.9 |
| Gemini 2.5 Flash-Lite (유료 표준) | 약 $1.1 | 약 $0.6 | 약 $1.7 |
| Claude Haiku 4.5 (표준) | 약 $12.2 | 약 $6.8 | 약 $19 |

- 위 수치는 공개 단가에 가정 토큰 수를 곱해 계산한 것이다.
- 레시피 파싱은 즉시성이 필요 없으므로 Batch API(50% 할인)를 쓸 수 있다. 공통 시스템 프롬프트에는 프롬프트 캐싱을 적용한다.
- 모더레이션은 욕설 사전을 먼저 통과시키고 애매한 건만 LLM으로 보내면 호출 수를 크게 줄일 수 있다.
- 비용보다 출력 품질(분량·단위 추출 정확도)이 병목일 가능성이 크다. 소량 샘플(예: 20개 영상)로 모델별 정확도를 비교하는 것을 권장한다.

### Gaps
- Haiku 5.5 표준 출력 단가($0.50)는 Batch 단가에서 역산한 값이다. 표 원문 컬럼은 잘려서 보지 못했다.
- 실제 쇼츠와 영상 자막의 평균 토큰 수는 측정하지 않았다.

## (C3) 레시피 SEO: schema.org Recipe 구조화 데이터

### Takeaway
Google 레시피 리치 결과의 필수 속성은 `name`과 `image` 두 개뿐이다. 그 밖에 `recipeIngredient`, `recipeInstructions`(HowToStep), `totalTime`, `aggregateRating`, `video`, `author`, `datePublished` 등을 넣을수록 노출 품질이 올라간다. TrendFood의 구조화 레시피 JSON을 그대로 JSON-LD로 내보내면 된다.

### Cited Findings
- 필수 속성: `image`(완성 요리 이미지, 크롤링 가능해야 함, 16x9·4x3·1x1 비율의 고해상도 이미지 여러 장 권장)와 `name`. — [Google Recipe structured data (2026-09-08 업데이트)](https://developers.google.com/search/docs/appearance/structured-data/recipe)
- 권장 속성: `aggregateRating`, `author`, `cookTime`+`prepTime`, `datePublished`, `description`, `keywords`, `nutrition.calories`(`recipeYield` 필요), `recipeCategory`, `recipeCuisine`, `recipeIngredient`, `recipeInstructions`(HowToStep 권장, 여러 섹션이면 HowToSection), `recipeYield`, `totalTime`, `video`. — [Google Recipe docs](https://developers.google.com/search/docs/appearance/structured-data/recipe)
- 호스트 캐러셀에 노출되려면 `ItemList`(`itemListElement`, `ListItem.position`, `ListItem.url`)가 필요하다. 항목마다 고유 URL이 있어야 하고, 전체 레시피를 나열하는 요약 페이지도 있어야 한다. — [Google Recipe docs](https://developers.google.com/search/docs/appearance/structured-data/recipe)
- `video` 속성의 필수·권장 목록은 별도 Video 문서를 따른다. 예시에는 `name`, `description`, `thumbnailUrl`, `contentUrl`, `embedUrl`, `uploadDate`, `duration`이 포함된다. — [Google Recipe docs](https://developers.google.com/search/docs/appearance/structured-data/recipe)

### Inferences
- `image` 필수 요건 때문에 YouTube 썸네일을 그대로 쓰고 싶어질 수 있다. 그러나 썸네일도 저작물이므로(A1 참고) 자체 촬영 이미지, 크리에이터 허락을 받은 이미지, 또는 YouTube 썸네일 URL을 참조만 하는 방식 사이에서 위험을 따져야 한다. 썸네일 URL을 핫링크로 `image`에 넣는 것이 허용되는지는 YouTube 약관 확인이 필요하다.
- `author`는 원작 크리에이터 이름으로 표기하고 `video.embedUrl`에 원본 영상을 연결하면 출처 표시와 SEO를 함께 충족할 수 있다.
- `aggregateRating`에 익명 후기 평점을 넣을 때는 Google의 리뷰 스니펫 정책(자기 평가 금지, 실제 사용자 리뷰)과 조작 방지 설계(B 참고)가 함께 필요하다. 정책 원문은 이번에 확인하지 못했다.
- Next.js App Router에서는 페이지 컴포넌트에 `<script type="application/ld+json">`로 넣고 SSG/ISR로 렌더링하면 크롤링에 유리하다.

### Gaps
- Google 리뷰 스니펫(aggregateRating) 가이드라인과 Video 구조화 데이터의 필수 속성 원문은 확인하지 못했다.
- 네이버 검색에서 schema.org Recipe를 지원하는지는 조사하지 못했다.
