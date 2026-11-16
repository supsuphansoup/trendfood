import Image from "next/image";

/** 첨부 원본의 투명 여백만 표시 영역에서 제외한 공통 로고다. */
export function SiteLogo() {
  return <Image src="/brand/trendfood-logo.svg" width={36} height={36} alt="" aria-hidden className="size-9 shrink-0" unoptimized data-testid="site-logo" />;
}
