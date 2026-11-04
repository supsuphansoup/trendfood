"use client";

import { useCallback, useSyncExternalStore } from "react";

// 브라우저에만 저장하는 문자열 집합 (찜, '집에 있어요'). 로그인 없는 MVP용.
// 저장소를 못 쓰는 환경(사생활 보호 창 등)에서도 화면은 그대로 동작한다.

const EVENT = "trendfood:storage";
const cache = new Map<string, { raw: string | null; value: string[] }>();
const EMPTY: string[] = [];

function read(key: string): string[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {}
  const hit = cache.get(key);
  if (hit && hit.raw === raw) return hit.value;
  let value: string[] = [];
  try {
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) value = parsed.filter((v) => typeof v === "string");
  } catch {}
  cache.set(key, { raw, value });
  return value;
}

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(EVENT, callback);
  };
}

export function useStoredSet(key: string) {
  const items = useSyncExternalStore(
    subscribe,
    () => read(key),
    () => EMPTY,
  );

  const toggle = useCallback(
    (item: string, on?: boolean) => {
      const current = new Set(read(key));
      const next = on ?? !current.has(item);
      if (next) current.add(item);
      else current.delete(item);
      try {
        window.localStorage.setItem(key, JSON.stringify([...current]));
      } catch {}
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );

  return { items, has: (item: string) => items.includes(item), toggle };
}

export const LIKES_KEY = "tf:likes";
export const PANTRY_KEY = "tf:pantry";
