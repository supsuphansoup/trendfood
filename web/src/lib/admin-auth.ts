import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

// 관리자 인증 (MVP): 환경변수 비밀번호 + 서명된 httpOnly 쿠키.
// Supabase 연동 시 Supabase Auth + 관리자 역할(role)로 바꾼다.

export const ADMIN_COOKIE = "tf_admin";
export const ADMIN_MAX_AGE = 60 * 60 * 8; // 8시간

const secret = () => process.env.ADMIN_SECRET ?? "";

// 배포(production)에서는 8자 이상만 허용. 로컬 개발에서는 짧은 비밀번호(예: 1234)도 허용한다.
const MIN_PASSWORD = process.env.NODE_ENV === "production" ? 8 : 4;

export const adminConfigured = () =>
  (process.env.ADMIN_PASSWORD ?? "").length >= MIN_PASSWORD && secret().length >= 32;

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

export function createSessionToken(now = Date.now()) {
  const payload = `v1.${now + ADMIN_MAX_AGE * 1000}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined, now = Date.now()) {
  if (!token || !adminConfigured()) return false;
  const [v, exp, sig] = token.split(".");
  if (v !== "v1" || !exp || !sig) return false;
  if (!safeEqual(sig, sign(`${v}.${exp}`))) return false;
  return Number(exp) > now;
}

export function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!adminConfigured()) return false;
  // 길이 차이로 정보가 새지 않도록 해시끼리 비교
  const h = (s: string) => createHmac("sha256", secret()).update(s).digest();
  return timingSafeEqual(h(input), h(expected));
}
