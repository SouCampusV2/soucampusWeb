import type { MetadataRoute } from "next";
import { getAllProjects } from "@/lib/projects";
import { getAllReviews } from "@/lib/reviews";
import { getAllProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/site";

// Карта сайта — список всех индексируемых адресов для поисковика. Next отдаёт
// её по /sitemap.xml автоматически из этого файла.
//
// Работы и отзывы берём ИЗ БАЗЫ (getAllProjects/getAllReviews), а не списком
// руками: добавил работу строкой в Supabase — она попадает в карту сама, без
// правки кода. /terms сюда НЕ включаем — заглушка под noindex (см. page.tsx).
// /shop и товары появляются в карте только когда есть опубликованные товары —
// та же логика, что у robots в shop/page.tsx: пустой каталог не индексируем.

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [projects, reviews, products] = await Promise.all([
    getAllProjects(),
    getAllReviews(),
    getAllProducts(),
  ]);

  const now = new Date();

  // Статические страницы. priority — подсказка об относительной важности:
  // главная и портфолио выше, служебные — ниже.
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/portfolio`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
  ];

  const projectPages: MetadataRoute.Sitemap = projects.map((p) => ({
    url: `${SITE_URL}/portfolio/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const reviewPages: MetadataRoute.Sitemap = reviews.map((r) => ({
    url: `${SITE_URL}/reviews/${r.slug}`,
    lastModified: now,
    changeFrequency: "yearly",
    priority: 0.4,
  }));

  const shopPages: MetadataRoute.Sitemap =
    products.length === 0
      ? []
      : [
          { url: `${SITE_URL}/shop`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 },
          ...products.map((p) => ({
            url: `${SITE_URL}/shop/${p.slug}`,
            lastModified: now,
            changeFrequency: "monthly" as const,
            priority: 0.7,
          })),
        ];

  return [...staticPages, ...projectPages, ...reviewPages, ...shopPages];
}
