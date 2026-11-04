import { connection } from "next/server";
import { Suspense } from "react";
import { setCandidateStatus } from "@/app/admin/actions";
import { CandidateForm } from "@/components/admin/candidate-form";
import { type CandidateStatus, readStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function AdminQueuePage() {
  return (
    <section aria-labelledby="queue-title" className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 id="queue-title" className="text-2xl font-black tracking-[-0.02em]">
          후보 큐
        </h1>
        <p className="text-sm text-body">
          뜨는 음식 후보를 모아 승인·반려해요. 트렌드 자동 수집(Vercel Cron)이 연결되면 여기로 자동으로 들어와요.
        </p>
      </div>
      <CandidateForm />
      <Suspense fallback={<p className="text-muted-foreground">불러오는 중…</p>}>
        <CandidateList />
      </Suspense>
    </section>
  );
}

const badge: Record<CandidateStatus, string> = {
  대기: "bg-secondary text-foreground",
  승인: "bg-success text-white",
  반려: "bg-muted text-muted-foreground line-through",
};

async function CandidateList() {
  await connection();
  const { candidates } = await readStore();
  if (!candidates.length) return <p className="rounded-2xl bg-background p-6 text-center text-body">아직 후보가 없어요.</p>;
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0">
      {candidates.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border bg-background p-4">
          <span className={cn("rounded-full px-3 py-1 text-xs font-bold", badge[c.status])}>{c.status}</span>
          <div className="flex min-w-0 flex-1 flex-col">
            <b className="text-base">
              {c.name} <span className="text-sm font-normal text-muted-foreground">{c.category}</span>
            </b>
            {c.note && <span className="text-sm text-body">{c.note}</span>}
            {c.source && (
              <a href={c.source} target="_blank" rel="noopener noreferrer" className="truncate text-sm">
                {c.source}
              </a>
            )}
          </div>
          <div className="flex gap-2">
            {(["승인", "반려", "대기"] as const)
              .filter((s) => s !== c.status)
              .map((s) => (
                <form key={s} action={setCandidateStatus.bind(null, c.id, s)}>
                  <button
                    type="submit"
                    aria-label={`${c.name} ${s === "대기" ? "대기로" : s}`}
                    className={cn(
                      "min-h-11 rounded-lg px-4 text-sm font-bold",
                      s === "승인" ? "bg-primary text-white" : "border-[1.5px] border-line-strong bg-white",
                    )}
                  >
                    {s === "대기" ? "대기로" : s}
                  </button>
                </form>
              ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
