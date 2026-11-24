"use client";

import { usePathname } from "next/navigation";
import { isMarketplaceRoute } from "@/lib/marketplace-routes";

// Отступ перед футером на страницах студии (24.11). Раньше здесь стояли
// тарифы «Choose your plan» (PricingSection) со своим верхним отступом, и
// страницы студии заканчивались, рассчитывая на него: последняя секция
// Contact, например, без нижнего отступа. Тарифы убраны решением
// владельца — отступ остался, чтобы страницы не прилипли к футеру. В
// магазине тарифов не было никогда, там и отступа нет.
export function StudioPageEnd() {
  const pathname = usePathname();
  if (isMarketplaceRoute(pathname)) return null;
  return <div aria-hidden className="h-16 sm:h-28" />;
}
