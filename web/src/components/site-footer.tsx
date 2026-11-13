import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-footer text-[13px] text-footer-foreground">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2.5 px-5 py-7">
        <nav aria-label="사이트 정보" className="flex flex-wrap gap-4">
          {[
            ["사이트 소개", "/about"],
            ["개인정보처리방침", "/privacy"],
            ["이용약관", "/terms"],
            ["삭제 요청·연락처", "/about#contact"],
          ].map(([label, href]) => (
            <Link key={href} href={href} className="inline-flex min-h-11 min-w-11 items-center text-footer-foreground hover:text-footer-foreground">
              {label}
            </Link>
          ))}
        </nav>
        <p className="leading-relaxed">
          이 사이트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다. AI가 작성한 조리 안내는
          상세 페이지의 참고 출처와 함께 확인해 주세요.
        </p>
        <p className="leading-relaxed text-footer-muted">
          참고 사진은 이용 조건을 확인한 Wikimedia Commons·Openverse 자료와 <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-footer-foreground underline">Pexels 제공 사진</a>을 사용해요. 작가·원문·이용 조건은 상세 페이지에 표시해요. AI로 만든 이미지는 ‘AI 생성 예시’로 표시하며 실제 조리·제품 사진과 다를 수 있어요.
        </p>
      </div>
    </footer>
  );
}
