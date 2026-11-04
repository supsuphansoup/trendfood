"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "게시 관리" },
  { href: "/admin/links", label: "재료 링크" },
  { href: "/admin/queue", label: "후보 큐" },
] as const;

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="관리 메뉴" className="-mb-px flex w-full gap-1 overflow-x-auto">
      {items.map((i) => {
        const active = pathname === i.href;
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 shrink-0 items-center border-b-[3px] border-transparent px-4 text-base text-muted-foreground hover:text-foreground",
              active && "border-accent font-bold text-foreground",
            )}
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
