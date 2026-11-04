import { type NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE, verifySessionToken } from "@/lib/admin-auth";
import { foodSlugs } from "@/lib/food-slugs";

const known = new Set<string>(foodSlugs);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/admin")) {
    // 관리자 화면: 어디에도 링크하지 않고, 검색엔진 색인 금지, 로그인 전에는 로그인 화면만
    const authed = verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value);
    const isLogin = pathname === "/admin/login";
    let res: NextResponse;
    if (!authed && !isLogin) {
      res = NextResponse.redirect(new URL("/admin/login", request.url));
    } else if (authed && isLogin) {
      res = NextResponse.redirect(new URL("/admin", request.url));
    } else {
      res = NextResponse.next();
    }
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
    return res;
  }

  // 없는 음식 주소는 스트리밍 전에 404로 (Cache Components에서는 notFound()가 200으로 나가기 때문)
  const slug = decodeURIComponent(pathname.split("/")[2] ?? "");
  if (!known.has(slug)) {
    return NextResponse.rewrite(new URL("/food-not-found", request.url));
  }
}

export const config = {
  matcher: ["/food/:slug", "/admin", "/admin/:path*"],
};
