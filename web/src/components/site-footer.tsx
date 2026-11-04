import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="bg-footer text-[13px] text-footer-foreground">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-2.5 px-5 py-7">
        <nav aria-label="사이트 정보" className="flex flex-wrap gap-4">
          {[
            ["사이트 소개", "about"],
            ["개인정보처리방침", "privacy"],
            ["이용약관", "terms"],
            ["연락처", "contact"],
          ].map(([label, id]) => (
            <Link key={id} href={`/about#${id}`} className="text-white hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
        <p className="leading-relaxed">
          이 사이트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다. 트렌드 요약은 AI가
          쓰고 운영자가 검수합니다.
        </p>
        <p className="leading-relaxed text-footer-muted">
          데모 사진: Wikimedia Commons (CC0, CC BY, CC BY-SA). 실제 서비스에서는 쓰지 않습니다.
        </p>
      </div>
    </footer>
  );
}
