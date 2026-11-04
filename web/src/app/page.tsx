import { HomeFeed } from "@/components/home/home-feed";
import { SiteFooter } from "@/components/site-footer";
import { getPublishedFoods } from "@/lib/catalog";

export default async function Home() {
  const foods = await getPublishedFoods();
  return (
    <>
      <HomeFeed foods={foods} />
      <SiteFooter />
    </>
  );
}
