import type { Metadata } from "next";
import Link from "next/link";
import { SiteInfoPage } from "@/components/site-info-page";
import { OPERATOR_EMAIL } from "@/data/site";

export const metadata: Metadata = { title: "사이트 소개 | 트렌드푸드" };

// 필수 문서 전문과 삭제 요청 창구를 안내한다. 법률 전문가 검토는 남아 있다 (docs/spec.md Compliance).
const sections = [
  {
    id: "about",
    title: "트렌드푸드는",
    body: "지금 유행하는 음식을 가장 빨리 알려 주고, 필요한 재료를 하나씩 담도록 돕는 서비스예요. 순위는 공식 API로 모은 공개 검색량과 영상 제목을 바탕으로 AI가 초안을 쓰고, 운영자가 검수한 뒤 올려요.",
  },
  {
    id: "partners",
    title: "제휴 안내",
    body: "이 사이트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다. 재료 링크로 구매해도 가격은 같아요.",
  },
  {
    id: "ai",
    title: "AI 활용 안내",
    body: '음식 소개 글(왜 뜨는지 요약, 재료, 조리법)은 생성형 AI가 초안을 쓰고, 운영자가 직접 확인하고 고친 뒤에 올려요. AI가 쓴 요약에는 "AI 요약" 표시가 붙어요. AI로 만든 사진을 쓸 때는 "AI 이미지"라고 표시해요.',
  },
  {
    id: "privacy",
    title: "개인정보처리방침",
    body: "회원가입이 없고, 방문자의 이름·연락처를 받지 않아요. 찜과 장바구니 기록은 이 브라우저에만 저장돼요.",
    href: "/privacy",
  },
  {
    id: "terms",
    title: "이용약관",
    body: "서비스 이용 조건, AI 활용, 정보의 정확성, 권리 침해 신고 절차를 적어 두었어요.",
    href: "/terms",
  },
];

export default function AboutPage() {
  return (
    <SiteInfoPage title="사이트 소개">
      {sections.map((s) => (
        <section key={s.id} id={s.id}>
          <h2>{s.title}</h2>
          <p>{s.body}</p>
          {s.href && <Link href={s.href}>{s.title} 전문 보기</Link>}
        </section>
      ))}
      <section id="contact">
        <h2>삭제 요청·연락처</h2>
        <p>내 영상·사진·글이 허락 없이 쓰였거나, 틀린 내용이 있으면 아래 메일로 알려 주세요. 48시간 안에 확인하고 답장드려요. 권리 침해가 확인되면 해당 내용을 바로 내리거나 고쳐요.</p>
        <a href={`mailto:${OPERATOR_EMAIL}`}>{OPERATOR_EMAIL}</a>
        <p>메일에 적어 주세요:</p>
        <ul>
          <li>문제가 되는 페이지 주소</li>
          <li>어떤 부분이 문제인지 (원본 주소가 있으면 함께)</li>
          <li>본인이 원작자·권리자인지, 대리인인지</li>
        </ul>
        <p>그 밖의 문의도 같은 메일로 받아요.</p>
      </section>
    </SiteInfoPage>
  );
}
