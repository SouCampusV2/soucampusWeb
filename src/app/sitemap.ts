import type { MetadataRoute } from "next";
import { getAllProjects } from "@/lib/projects";
import { getAllReviews } from "@/lib/reviews";
import { getAllProducts } from "@/lib/products";
import { SITE_URL } from "@/lib/site";
import { WIKI_ARTICLES } from "@/lib/wiki";
import { getAllUpdates } from "@/lib/updates";

// Карта сайта — список всех индексируемых адресов для поисковика. Next отдаёт
// её по /sitemap.xml автоматически из этого файла.
//
// Работы и отзывы берём ИЗ БАЗЫ (getAllProjects/getAllReviews), а не списком
// руками: добавил работу строкой в Supabase — она попадает в карту сама, без
// правки кода. /terms и /privacy включаем: с 26.09 /terms больше не
// заглушка под noindex — там условия покупки, возвраты и продавец.
// /marketplace и товары появляются в карте только когда есть опубликованные товары —
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
    { url: `${SITE_URL}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // Обе юридические страницы обязаны быть находимыми. /privacy к тому
    // же забирает Google при проверке OAuth-приложения; /terms (с 26.09)
    // — условия покупки, на которые ссылается галочка при оплате.
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  const projectPages: MetadataRoute.Sitemap = projects.map((p) => ({
    url: `${SITE_URL}/portfolio/${p.slug}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  // Вики — настоящий контент: индексируем и
  // корневую страницу, и каждую статью. Список берётся из WIKI_ARTICLES,
  // а не переписывается сюда руками, — новая статья попадает в карту
  // сама, ровно как работы портфолио попадают из базы.
  const wikiPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/wiki`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    ...WIKI_ARTICLES.map((article) => ({
      url: `${SITE_URL}/wiki/${article.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.5,
    })),
  ];

  // What's new — тот же приём, что у вики. lastModified у поста — его
  // собственная дата, а не «сейчас»: пост после публикации не меняется,
  // и честная дата говорит поисковику, что перечитывать его незачем.
  const updatePages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/updates`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    ...getAllUpdates().map((post) => ({
      url: `${SITE_URL}/updates/${post.slug}`,
      lastModified: new Date(`${post.date}T00:00:00Z`),
      changeFrequency: "yearly" as const,
      priority: 0.4,
    })),
  ];

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
          { url: `${SITE_URL}/marketplace`, lastModified: now, changeFrequency: "weekly" as const, priority: 0.8 },
          ...products.map((p) => ({
            url: `${SITE_URL}/marketplace/${p.slug}`,
            lastModified: now,
            changeFrequency: "monthly" as const,
            priority: 0.7,
          })),
        ];

  return [
    ...staticPages,
    ...projectPages,
    ...wikiPages,
    ...updatePages,
    ...reviewPages,
    ...shopPages,
  ];
}
