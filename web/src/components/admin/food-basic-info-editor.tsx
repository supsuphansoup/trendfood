import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cleanBasicInfo, cookLabelInput, type FoodBasicInfo } from "@/data/admin-food-edit.ts";
import { categoryOptions, tagOptions } from "@/data/catalog-schema";

export function FoodBasicInfoEditor({ row, onSave, onNotice }: {
  row: FoodBasicInfo & { slug: string };
  onSave: (patch: FoodBasicInfo) => Promise<void>;
  onNotice: (message: string) => void;
}) {
  const [saving, setSaving] = useState(false);
  const fields = [
    { key: "name", label: "이름 (30자)", max: 30, required: true, value: row.name },
    { key: "cook_minutes", label: "조리 시간 (분)", required: true, value: String(row.cook_minutes) },
    { key: "cook_label", label: '조리 시간 표시 문구 (비우면 "조리 N분", 40자)', max: 40, value: cookLabelInput(row.cook_label, row.cook_minutes) },
    { key: "servings", label: "분량 (예: 2인분, 20자)", max: 20, value: row.servings },
    { key: "change_label", label: "순위 변동 문구 (예: 새로 들어왔어요, 30자)", max: 30, required: true, value: row.change_label },
  ] as const;
  const textField = (field: (typeof fields)[number]) => (
    <div key={field.key} className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={`${row.slug}-${field.key}`} className="leading-normal">{field.label}</Label>
      <Input id={`${row.slug}-${field.key}`} name={field.key} defaultValue={field.value}
        required={"required" in field && field.required} maxLength={"max" in field ? field.max : undefined}
        inputMode={field.key === "cook_minutes" ? "numeric" : undefined} className="h-11 text-base" />
    </div>
  );

  return (
    <form noValidate onSubmit={async (e) => {
      e.preventDefault();
      const form = e.currentTarget;
      const data = new FormData(form);
      const result = cleanBasicInfo({
        name: String(data.get("name")), category: data.get("category") as FoodBasicInfo["category"],
        tags: data.getAll("tags").map(String), cook_minutes: String(data.get("cook_minutes")),
        cook_label: String(data.get("cook_label")), difficulty: data.get("difficulty") as FoodBasicInfo["difficulty"],
        servings: String(data.get("servings")), change_label: String(data.get("change_label")),
      });
      if (result.error !== undefined) return onNotice(result.error);
      if (!form.reportValidity()) return;
      setSaving(true);
      try {
        await onSave(result.value);
      } finally {
        setSaving(false);
      }
    }}>
      <fieldset disabled={saving} className="flex min-w-0 flex-col gap-3 border-t pt-3">
        <legend className="text-lg font-bold">기본 정보</legend>
        <p className="text-[13px] text-muted-foreground">이름을 바꿔도 페이지 주소는 그대로예요.</p>
        <div className="grid min-w-0 gap-3 md:grid-cols-2">
          {textField(fields[0])}
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={`${row.slug}-category`}>카테고리</Label>
            <select id={`${row.slug}-category`} name="category" defaultValue={row.category} className="h-11 min-w-0 rounded-lg border border-input bg-background px-3 text-base">
              {categoryOptions.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <fieldset className="min-w-0">
            <legend className="text-sm font-bold">태그</legend>
            <div className="flex flex-wrap gap-x-3">
              {tagOptions.map((tag) => (
                <Label key={tag} htmlFor={`${row.slug}-tag-${tag}`} className="flex min-h-11 items-center gap-2">
                  <input id={`${row.slug}-tag-${tag}`} name="tags" type="checkbox" value={tag} defaultChecked={row.tags.includes(tag)} className="size-5 accent-primary" />
                  {tag}
                </Label>
              ))}
            </div>
          </fieldset>
          {textField(fields[1])}
          {textField(fields[2])}
          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor={`${row.slug}-difficulty`}>난이도</Label>
            <select id={`${row.slug}-difficulty`} name="difficulty" defaultValue={row.difficulty} className="h-11 min-w-0 rounded-lg border border-input bg-background px-3 text-base">
              {(["쉬움", "보통", "어려움"] as const).map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
            </select>
          </div>
          {textField(fields[3])}
          {textField(fields[4])}
        </div>
        <Button type="submit" className="self-start">기본 정보 저장</Button>
      </fieldset>
    </form>
  );
}
