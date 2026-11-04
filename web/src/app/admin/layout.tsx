import type { Metadata } from "next";

// 관리자 화면: 공개 화면 어디에도 링크하지 않고, 검색엔진에도 올리지 않는다.
// 정적 사이트라 화면 자체는 누구나 열 수 있지만, 데이터 읽기·쓰기는 Supabase 로그인 + RLS(admins 표)로 막힌다.
export const metadata: Metadata = {
  title: "관리 | 트렌드푸드",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className="flex min-h-dvh flex-1 flex-col bg-muted/40">{children}</div>;
}
