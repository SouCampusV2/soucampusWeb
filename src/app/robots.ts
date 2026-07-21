import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// robots.txt — отдаётся Next по /robots.txt из этого файла. Говорит поисковым
// ботам, что можно обходить, и где лежит карта сайта.
//
// Разрешаем всё: страницы-заглушки (/shop, /terms) закрываются точечно через
// noindex в их метаданных, а не тут — так они остаются доступны ботам для
// перехода по ссылкам, но не индексируются. Через robots их прятать не нужно
// (и даже вредно: заблокированную в robots страницу Google не увидит noindex).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
