import Image from "next/image";
import { SITE_LOGO, SITE_NAME } from "@/data/site";

export function SiteLogo() {
  return <Image src={SITE_LOGO} width={528} height={176} alt={SITE_NAME} className="-mx-1.5 -my-2 h-auto w-40 shrink-0 object-contain md:w-44" unoptimized data-testid="site-logo" />;
}
