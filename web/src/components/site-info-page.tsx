import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";

export function SiteInfoPage({ title, effectiveDate, children }: {
  title: string;
  effectiveDate?: string;
  children: ReactNode;
}) {
  return (
    <>
      <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-8 px-5 py-10 [&_section]:flex [&_section]:scroll-mt-6 [&_section]:flex-col [&_section]:gap-2 [&_h2]:text-2xl [&_h2]:font-black [&_h2]:tracking-[-0.02em] [&_p]:text-base [&_p]:leading-[1.75] [&_p]:text-body [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-base [&_ul]:leading-[1.75] [&_ul]:text-body [&_section_a]:inline-flex [&_section_a]:min-h-11 [&_section_a]:min-w-11 [&_section_a]:items-center [&_section_a]:self-start [&_section_a]:text-accent [&_section_a]:underline">
        <Link href="/" className="inline-flex min-h-11 min-w-11 items-center self-start text-2xl font-black tracking-[-0.03em] text-foreground hover:text-foreground">
          트렌드푸드
        </Link>
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-black tracking-[-0.02em]">{title}</h1>
          {effectiveDate && <p>시행일: {effectiveDate}</p>}
        </header>
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
