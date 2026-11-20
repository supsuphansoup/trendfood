export const measurementId = (value: string | undefined) => /^G-[A-Z0-9]+$/.test(value ?? "") ? value! : null;
export const ANALYTICS_ID = measurementId(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID);
export const CONSENT_KEY = "tf:analytics";
export const safePage = (pathname: string) => pathname.split(/[?#]/)[0];

declare global {
  interface Window { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void }
}

export function track(name: "food_like" | "purchase_click" | "search" | "select_content" | "page_view", params: Record<string, string | number | boolean> = {}) {
  if (!ANALYTICS_ID || typeof window === "undefined" || window.location.pathname.startsWith("/admin")) return;
  try {
    if (!JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "[]").includes("granted")) return;
  } catch { return; }
  window.gtag?.("event", name, params);
}
