// 예시 데이터(src/data/seed-foods.ts)를 Supabase 초기 데이터 SQL 로 만든다.
// 실행: npm run db:seed-sql  →  supabase/seed.sql 생성 (SQL Editor 에 붙여 넣어 실행)
import { writeFileSync } from "node:fs";
import { recordToIngredientRows, recordToRow } from "../src/data/db-mapping.ts";
import { seedFoods } from "../src/data/seed-foods.ts";

const lit = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  if (Array.isArray(v) && v.every((x) => typeof x === "string")) {
    return `array[${v.map((x) => lit(x)).join(", ")}]::text[]`;
  }
  if (Array.isArray(v) && v.every((x) => typeof x === "number")) return `array[${v.join(", ")}]::integer[]`;
  if (typeof v === "object") return `${lit(JSON.stringify(v))}::jsonb`;
  return `'${String(v).replaceAll("'", "''")}'`;
};

const lines: string[] = [
  "-- 자동 생성 파일 (npm run db:seed-sql). 직접 고치지 말고 src/data/seed-foods.ts 를 고친다.",
  "-- 0001_init.sql 실행 뒤 SQL Editor 에서 실행. 같은 slug 가 있으면 덮어쓴다.",
  "begin;",
];

for (const food of seedFoods) {
  const row = recordToRow(food);
  // 빈 배열은 타입을 알 수 없으므로 컬럼 타입을 직접 붙인다
  const cols = Object.keys(row);
  const vals = Object.values(row).map((v, i) =>
    Array.isArray(v) && v.length === 0 ? (cols[i] === "tags" ? "'{}'::text[]" : "'[]'::jsonb") : lit(v),
  );
  lines.push(
    `insert into public.foods (${cols.join(", ")}) values (${vals.join(", ")})`,
    `  on conflict (slug) do update set ${cols.filter((c) => c !== "slug").map((c) => `${c} = excluded.${c}`).join(", ")};`,
    `delete from public.ingredients where food_slug = ${lit(food.slug)};`,
  );
  for (const ing of recordToIngredientRows(food)) {
    const c = Object.keys(ing);
    lines.push(`insert into public.ingredients (${c.join(", ")}) values (${Object.values(ing).map(lit).join(", ")});`);
  }
}
lines.push("commit;", "");

const out = new URL("../supabase/seed.sql", import.meta.url);
writeFileSync(out, lines.join("\n"), "utf8");
console.log(`supabase/seed.sql: 음식 ${seedFoods.length}개`);
