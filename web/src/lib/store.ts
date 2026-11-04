import "server-only";

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";

// 관리자 수정 내용 저장소. Supabase 연동 전 임시로 web/data/admin-store.json 에 저장한다.
// Vercel 서버는 파일을 쓸 수 없으므로 배포 환경에서는 Supabase 로 바꿔야 한다 (CLAUDE.md).

export type CandidateStatus = "대기" | "승인" | "반려";

export type Candidate = {
  id: string;
  name: string;
  category: string;
  note: string;
  source: string;
  status: CandidateStatus;
  createdAt: string;
};

export type Store = {
  /** 공개 순서 (slug). 없는 slug 는 기본 순위 뒤에 붙는다 */
  order: string[];
  hidden: string[];
  edits: Record<string, { name?: string; why?: string; summary?: string }>;
  /** slug → 재료 이름 → 링크·가격 */
  links: Record<string, Record<string, { url?: string; price?: number }>>;
  candidates: Candidate[];
};

const FILE = path.join(process.env.TF_DATA_DIR ?? path.join(process.cwd(), "data"), "admin-store.json");

export const emptyStore = (): Store => ({ order: [], hidden: [], edits: {}, links: {}, candidates: [] });

export async function readStore(): Promise<Store> {
  try {
    const parsed = JSON.parse(await readFile(FILE, "utf8")) as Partial<Store>;
    return { ...emptyStore(), ...parsed };
  } catch {
    return emptyStore();
  }
}

let queue: Promise<unknown> = Promise.resolve();

/** 저장 요청을 한 줄로 세워 동시에 고쳐도 내용이 섞이지 않게 한다 */
export function updateStore(change: (store: Store) => void): Promise<Store> {
  const run = queue.then(async () => {
    const store = await readStore();
    change(store);
    await mkdir(path.dirname(FILE), { recursive: true });
    const tmp = `${FILE}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(store, null, 2), "utf8");
    await rename(tmp, FILE);
    return store;
  });
  queue = run.catch(() => {});
  return run;
}
