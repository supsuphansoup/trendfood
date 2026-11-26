import Image from "next/image";
import { SITE_LOGO, SITE_NAME } from "@/data/site";

export function SiteLogo() {
  return <Image src={SITE_LOGO} width={2172} height={724} alt={SITE_NAME} className="h-9 w-36 shrink-0 object-cover" unoptimized data-testid="site-logo" />;
}
