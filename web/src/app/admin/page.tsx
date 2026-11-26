import { AdminApp } from "@/components/admin/admin-app";
import { getPublishedFoods } from "@/lib/catalog";
import { contentAdminEnabled } from "@/lib/supabase-config";

export default async function AdminPage() {
  const revision = process.env.TF_CONTENT_REVISION || "main";
  const source = contentAdminEnabled()
    ? `https://raw.githubusercontent.com/supsuphansoup/trendfood/${encodeURIComponent(revision)}/web/src/data/content/foods.json`
    : undefined;
  const publishedByDate: Record<string, number> = {};
  for (const food of source ? await getPublishedFoods() : []) {
    if (food.publishedAt) publishedByDate[food.publishedAt] = (publishedByDate[food.publishedAt] ?? 0) + 1;
  }
  return <AdminApp source={source} publishedByDate={publishedByDate} />;
}
