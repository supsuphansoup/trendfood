import type { Metadata } from "next";

// 관리자 화면: 공개 화면 어디에도 링크하지 않는다. 검색엔진 색인 금지 (Proxy 에서 X-Robots-Tag 도 붙임)
export const metadata: Metadata = {
  title: "관리자 | 트렌드푸드",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-full flex-1 flex-col bg-muted">{children}</div>;
}
