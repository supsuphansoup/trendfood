import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { logout } from "@/app/admin/actions";
import { AdminNav } from "@/components/admin/admin-nav";

export default function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <>
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center gap-x-6 gap-y-2 px-5 pt-3">
          <p className="text-lg font-black tracking-[-0.03em]">
            트렌드푸드 <span className="text-accent">관리자</span>
          </p>
          <div className="ml-auto flex items-center gap-1 text-sm">
            <Link href="/" target="_blank" className="flex min-h-11 items-center gap-1 px-3 text-foreground">
              사이트 보기
              <ExternalLink className="size-4" aria-hidden />
            </Link>
            <form action={logout}>
              <button type="submit" className="flex min-h-11 items-center gap-1 px-3 font-bold">
                <LogOut className="size-4" aria-hidden />
                로그아웃
              </button>
            </form>
          </div>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-5 py-6">{children}</main>
    </>
  );
}
