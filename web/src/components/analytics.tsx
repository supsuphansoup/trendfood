"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ANALYTICS_ID, CONSENT_KEY, safePage, track } from "@/lib/analytics";
import { useStoredSet } from "@/lib/use-stored-set";

export function Analytics() {
  const consent = useStoredSet(CONSENT_KEY);
  const pathname = usePathname();
  const granted = consent.has("granted");
  useEffect(() => {
    if (!ANALYTICS_ID) return;
    const flags = window as unknown as Record<string, unknown>;
    const enabled = granted && !pathname.startsWith("/admin");
    flags[`ga-disable-${ANALYTICS_ID}`] = !enabled;
    if (!enabled) return;
    if (!document.getElementById("tf-ga")) {
      window.dataLayer = window.dataLayer ?? [];
      // Google 공식 스니펫의 Arguments 큐 형식을 따른다.
      window.gtag = function () { window.dataLayer!.push(arguments); }; // eslint-disable-line prefer-rest-params
      window.gtag("js", new Date());
      window.gtag("config", ANALYTICS_ID, {
        send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
        page_location: `${location.origin}${safePage(pathname)}`, page_referrer: "", ignore_referrer: true,
      });
      const script = document.createElement("script");
      script.id = "tf-ga";
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}`;
      document.head.append(script);
    }
    window.gtag?.("set", { page_location: `${location.origin}${safePage(pathname)}`, page_referrer: "" });
    track("page_view", { page_location: `${location.origin}${safePage(pathname)}` });
  }, [granted, pathname]);

  useEffect(() => {
    const click = (event: MouseEvent) => {
      const link = event.target instanceof Element ? event.target.closest("a") : null;
      if (!link) return;
      const url = new URL(link.href, location.href);
      const food = location.pathname.match(/^\/food\/([^/]+)/)?.[1];
      if (url.hostname === "coupang.com" || url.hostname.endsWith(".coupang.com")) track("purchase_click", { food_slug: food ?? "unknown", link_type: url.hostname === "link.coupang.com" ? "affiliate" : "regular" });
      if (url.origin === location.origin && /^\/food\/[^/]+\/?$/.test(url.pathname)) track("select_content", { content_type: "food", item_id: url.pathname.split("/")[2] });
    };
    document.addEventListener("click", click);
    return () => document.removeEventListener("click", click);
  }, []);
  return null;
}

export function AnalyticsPreferences() {
  const consent = useStoredSet(CONSENT_KEY);
  if (!ANALYTICS_ID) return null;
  const choose = (granted: boolean) => {
    consent.toggle("granted", granted);
    consent.toggle("declined", !granted);
    if (!granted) {
      (window as unknown as Record<string, unknown>)[`ga-disable-${ANALYTICS_ID}`] = true;
      // 동의를 철회한 브라우저의 분석용 쿠키를 지운다.
      for (const cookie of document.cookie.split(";")) {
        const name = cookie.trim().split("=")[0];
        if (!/^_ga(?:_|$)/.test(name)) continue;
        for (const domain of ["", location.hostname, `.${location.hostname}`]) document.cookie = `${name}=; Max-Age=0; path=/;${domain ? ` domain=${domain};` : ""}`;
      }
    }
  };
  return <details className="rounded-xl border p-3" open={!consent.items.length || undefined}>
    <summary className="flex min-h-11 cursor-pointer items-center font-bold">방문 통계 설정 · {consent.has("granted") ? "허용" : "허용 안 함"}</summary>
    <p className="max-w-2xl leading-relaxed">허용하면 Google Analytics로 방문·음식 선택·찜·구매 링크 클릭 수를 집계해요. 검색어와 보유 재료 목록은 보내지 않아요. 선택은 언제든 바꿀 수 있어요.</p>
    <div className="mt-2 flex flex-wrap gap-2">
      <button type="button" className="min-h-11 rounded-md border px-4" onClick={() => choose(true)} aria-pressed={consent.has("granted")}>통계 허용</button>
      <button type="button" className="min-h-11 rounded-md border px-4" onClick={() => choose(false)} aria-pressed={consent.has("declined")}>허용하지 않기</button>
    </div>
  </details>;
}
