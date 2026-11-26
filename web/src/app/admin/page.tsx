import { AdminApp } from "@/components/admin/admin-app";
import { contentAdminEnabled } from "@/lib/supabase-config";

export default function AdminPage() {
  const revision = process.env.TF_CONTENT_REVISION || "main";
  const source = contentAdminEnabled()
    ? `https://raw.githubusercontent.com/supsuphansoup/trendfood/${encodeURIComponent(revision)}/web/src/data/content/foods.json`
    : undefined;
  return <AdminApp source={source} />;
}
