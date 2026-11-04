import type { Metadata } from "next";
import "pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "트렌드푸드 — 지금 뜨는 음식",
  description:
    "지금 유행하는 음식을 가장 빨리 알려 주고, 필요한 재료를 하나씩 담도록 도와요.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
