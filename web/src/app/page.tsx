import { HomeFeed } from "@/components/home/home-feed";
import { SiteFooter } from "@/components/site-footer";
import { SITE_NAME } from "@/data/site";
import { getPublishedFoods } from "@/lib/catalog";
import type { Metadata } from "next";

export const metadata: Metadata = { alternates: { canonical: "/" }, openGraph: { title: `${SITE_NAME} — 지금 뜨는 음식`, siteName: SITE_NAME, description: "유행 음식과 간편한 자취 요리를 살펴보고 직접 만들어 보세요.", url: "/", type: "website", locale: "ko_KR" } };

export default async function Home() {
  const foods = await getPublishedFoods();
  return (
    <>
      <HomeFeed foods={foods} today={new Date().toISOString().slice(0, 10)} />
      <SiteFooter />
    </>
  );
}
