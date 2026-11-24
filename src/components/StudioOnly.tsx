"use client";

import { usePathname } from "next/navigation";
import { isMarketplaceRoute } from "@/lib/marketplace-routes";

// Показывает содержимое только на страницах студии (24.11). Финал страниц
// стоит там, где раньше были тарифы, а в магазине тарифов не было никогда.
// Содержимое рисует сервер и передаёт сюда готовым.
export function StudioOnly({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (isMarketplaceRoute(pathname)) return null;
  return <>{children}</>;
}
