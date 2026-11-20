import type { Metadata } from "next";
import { Analytics } from "@/components/analytics";
import { SITE_URL } from "@/data/seo";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined },
  title: "트렌드푸드 — 지금 뜨는 음식",
  description:
    "지금 유행하는 음식을 가장 빨리 알려 주고, 필요한 재료를 하나씩 담도록 도와요.",
  icons: {
    icon: { url: "/brand/trendfood-logo.svg", type: "image/svg+xml" },
    shortcut: "/brand/trendfood-logo.svg",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}<Analytics /></body>
    </html>
  );
}
