"use server";

import { randomUUID } from "node:crypto";
import { refresh, revalidatePath, updateTag } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  ADMIN_COOKIE,
  ADMIN_MAX_AGE,
  adminConfigured,
  checkPassword,
  createSessionToken,
  verifySessionToken,
} from "@/lib/admin-auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { categoryOptions, foods } from "@/lib/foods";
import { type CandidateStatus, type Store, updateStore } from "@/lib/store";

export type FormState = { ok?: string; error?: string };

/** 모든 관리자 액션 맨 앞에서 다시 확인한다 (Proxy 만 믿지 않는다) */
async function requireAdmin() {
  const jar = await cookies();
  if (!verifySessionToken(jar.get(ADMIN_COOKIE)?.value)) redirect("/admin/login");
}

const known = new Set(foods.map((f) => f.slug));
const assertSlug = (slug: string) => {
  if (!known.has(slug)) throw new Error("없는 음식");
};
const text = (v: FormDataEntryValue | null, max: number) => String(v ?? "").trim().slice(0, max);

const currentOrder = (store: Store) => {
  const valid = store.order.filter((s) => known.has(s));
  return [...valid, ...foods.map((f) => f.slug).filter((s) => !valid.includes(s))];
};

/** 데이터 태그와 공개 페이지 주소를 함께 무효화한다. 태그만으로는 상세 페이지의 첫 요청이 이전 내용으로 나간다 */
function publishChange(slug?: string) {
  updateTag(CATALOG_TAG);
  revalidatePath("/");
  if (slug) revalidatePath(`/food/${slug}`);
  else revalidatePath("/food/[slug]", "page");
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  if (!adminConfigured()) return { error: "관리자 비밀번호가 설정되지 않았어요. web/.env.local 을 확인하세요." };
  if (!checkPassword(String(form.get("password") ?? ""))) {
    await new Promise((r) => setTimeout(r, 800)); // 무차별 대입 속도 늦추기
    return { error: "비밀번호가 맞지 않아요." };
  }
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, createSessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_MAX_AGE,
  });
  redirect("/admin");
}

export async function logout() {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/");
}

export async function moveFood(slug: string, dir: -1 | 1) {
  await requireAdmin();
  assertSlug(slug);
  await updateStore((s) => {
    const order = currentOrder(s);
    const i = order.indexOf(slug);
    const j = i + dir;
    if (j < 0 || j >= order.length) return;
    [order[i], order[j]] = [order[j], order[i]];
    s.order = order;
  });
  publishChange();
}

export async function setHidden(slug: string, hidden: boolean) {
  await requireAdmin();
  assertSlug(slug);
  await updateStore((s) => {
    s.hidden = s.hidden.filter((h) => h !== slug);
    if (hidden) s.hidden.push(slug);
  });
  publishChange();
}

export async function saveText(slug: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  assertSlug(slug);
  const name = text(form.get("name"), 30);
  const why = text(form.get("why"), 200);
  const summary = text(form.get("summary"), 600);
  if (!name) return { error: "음식 이름을 입력하세요." };
  await updateStore((s) => {
    s.edits[slug] = { name, why, summary };
  });
  publishChange(slug);
  return { ok: "저장했어요. 공개 화면에 바로 반영돼요." };
}

const COUPANG_HOSTS = ["coupang.com", "coupa.ng"];

export async function saveLinks(slug: string, _: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  assertSlug(slug);
  const food = foods.find((f) => f.slug === slug)!;
  const links: Store["links"][string] = {};
  for (const [i, ing] of food.ingredients.entries()) {
    const url = text(form.get(`url-${i}`), 500);
    const priceRaw = text(form.get(`price-${i}`), 10).replace(/[,\s원]/g, "");
    if (url) {
      let host = "";
      try {
        const u = new URL(url);
        if (u.protocol !== "https:") throw new Error();
        host = u.hostname;
      } catch {
        return { error: `${ing.name}: https 로 시작하는 주소를 넣으세요.` };
      }
      if (!COUPANG_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) {
        return { error: `${ing.name}: 쿠팡(파트너스) 주소만 넣을 수 있어요.` };
      }
    }
    let price: number | undefined;
    if (priceRaw) {
      price = Number(priceRaw);
      if (!Number.isInteger(price) || price < 0 || price > 10_000_000) {
        return { error: `${ing.name}: 가격은 숫자로 넣으세요.` };
      }
    }
    if (url || price !== undefined) links[ing.name] = { url: url || undefined, price };
  }
  await updateStore((s) => {
    s.links[slug] = links;
  });
  publishChange(slug);
  return { ok: "재료 링크를 저장했어요." };
}

export async function addCandidate(_: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const name = text(form.get("name"), 30);
  const category = text(form.get("category"), 10);
  const note = text(form.get("note"), 300);
  const source = text(form.get("source"), 500);
  if (!name) return { error: "음식 이름을 입력하세요." };
  if (!(categoryOptions as readonly string[]).includes(category)) return { error: "종류를 고르세요." };
  if (source && !/^https:\/\//.test(source)) return { error: "출처는 https 주소로 넣으세요." };
  await updateStore((s) => {
    s.candidates.unshift({
      id: randomUUID(),
      name,
      category,
      note,
      source,
      status: "대기",
      createdAt: new Date().toISOString(),
    });
  });
  refresh();
  return { ok: `'${name}'을(를) 후보 큐에 넣었어요.` };
}

export async function setCandidateStatus(id: string, status: CandidateStatus) {
  await requireAdmin();
  if (!["대기", "승인", "반려"].includes(status)) throw new Error("잘못된 상태");
  await updateStore((s) => {
    const c = s.candidates.find((x) => x.id === id);
    if (c) c.status = status;
  });
  refresh();
}
