import type { Metadata } from "next";
import { Analytics } from "@/components/analytics";
import { SITE_LOGO, SITE_NAME } from "@/data/site";
import { SITE_URL } from "@/data/seo";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || undefined },
  title: `${SITE_NAME} — 지금 뜨는 음식`,
  description:
    "유행 음식의 배경과 일상 레시피를 찾아보고, 필요한 재료의 구매 링크를 확인하세요.",
  icons: {
    icon: { url: SITE_LOGO, type: "image/png" },
    shortcut: SITE_LOGO,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}<Analytics /></body>
    </html>
  );
}
