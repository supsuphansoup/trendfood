import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = { title: "사이트 소개 | 트렌드푸드" };

// MVP용 안내 페이지. 개인정보처리방침·이용약관 본문은 오픈 전 법률 검토 후 채운다 (prd.md 7장).
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
    id: "privacy",
    title: "개인정보처리방침",
    body: "회원가입이 없어요. 찜과 '집에 있어요' 기록은 이 브라우저에만 저장되고 서버로 보내지 않아요. (오픈 전 정식 문서로 바꿀 예정)",
  },
  { id: "terms", title: "이용약관", body: "오픈 전 정식 문서로 바꿀 예정이에요." },
  { id: "contact", title: "연락처", body: "원본 영상·사진 삭제 요청과 문의는 운영자 메일로 받아요. (주소 확정 전)" },
];

export default function AboutPage() {
  return (
    <>
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-8 px-5 py-10">
        <Link href="/" className="text-2xl font-black tracking-[-0.03em] text-foreground hover:text-foreground">
          트렌드푸드
        </Link>
        {sections.map((s) => (
          <section key={s.id} id={s.id} className="flex scroll-mt-6 flex-col gap-2">
            <h2 className="text-2xl font-black tracking-[-0.02em]">{s.title}</h2>
            <p className="text-base leading-[1.75] text-body">{s.body}</p>
          </section>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
