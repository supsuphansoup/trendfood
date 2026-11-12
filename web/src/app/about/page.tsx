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
    body: "화제가 된 음식과 집에서 만들기 좋은 레시피를 소개하고, 필요한 재료를 하나씩 찾도록 돕는 서비스예요. 출처 확인 레시피에는 참고 링크와 확인 날짜를 표시해요. 실시간 인기 순위를 집계하기 전에는 검색량·좋아요 수를 표시하지 않아요. AI 조리 안내의 분량과 시간은 가정용 제안이며, 직접 조리한 결과는 아니에요.",
  },
  {
    id: "partners",
    title: "제휴 안내",
    body: "이 사이트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다. 재료 링크로 구매해도 가격은 같아요.",
  },
  {
    id: "ai",
    title: "AI 활용 안내",
    body: '음식 소개에는 "AI 요약" 표시와 참고 출처를 붙여요. 운영자가 출처를 확인해 채운 글과, 공개 레시피의 재료량·분량·시간·단계를 자동 대조해 반영한 글이 있어요. 자동 반영 글은 개별 운영자 검수와 직접 조리 검증을 하지 않았으며 상세 페이지에 이를 표시해요. 사진은 출처와 사용 조건을 확인한 자료만 사용하고, 확보하지 못하면 "사진 준비 중"으로 안내해요.',
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
