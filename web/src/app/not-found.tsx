import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-1 flex-col items-start gap-4 px-5 py-20">
      <p className="text-rank leading-none font-black text-accent">404</p>
      <h1 className="text-card-title leading-tight font-black tracking-[-0.02em]">찾는 음식이 없어요</h1>
      <p className="text-base text-body">순위에서 내려갔거나 주소가 바뀌었을 수 있어요.</p>
      <Link href="/" className={buttonVariants({ className: "text-white hover:text-white" })}>
        오늘의 순위 보기
      </Link>
    </main>
  );
}
