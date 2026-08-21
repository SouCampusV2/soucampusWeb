import { describe, it, expect } from "vitest";
import {
  deriveCategory,
  filterByCategory,
  rowToProduct,
  SHOP_CATEGORIES,
  type Product,
} from "./products";

// Чистые функции-границы слоя товаров, в сеть не ходят — тот же подход,
// что в projects.test.ts. Гоняются в CI без ключей и интернета.

describe("rowToProduct", () => {
  const row = {
    id: "3f2c8a10-0000-4000-8000-000000000001",
    slug: "medieval-spawn",
    title: "Medieval Spawn",
    summary: "Ready-to-use 300×300 spawn.",
    description: "Long description.",
    image_url: "/marketplace/medieval-spawn.jpg",
    price_label: "€15",
    price_cents: 1500,
    price_currency: "EUR",
    created_at: "2026-07-22T12:00:00.000Z",
    updated_at: "2026-07-22T12:00:00.000Z",
  };

  it("переводит колонки БД в форму сайта", () => {
    expect(rowToProduct(row)).toEqual({
      id: "3f2c8a10-0000-4000-8000-000000000001",
      slug: "medieval-spawn",
      title: "Medieval Spawn",
      summary: "Ready-to-use 300×300 spawn.",
      description: "Long description.",
      image: "/marketplace/medieval-spawn.jpg",
      // Без product_images галерея — это одна обложка.
      images: ["/marketplace/medieval-spawn.jpg"],
      createdAt: "2026-07-22T12:00:00.000Z",
      updatedAt: "2026-07-22T12:00:00.000Z",
      price: "€15",
      priceCents: 1500,
      currency: "EUR",
      // creator_id в строке нет — карта без автора.
      creatorId: null,
      // Характеристик в строке нет — база без миграции 20260821130000
      // или карта, залитая до неё. Пустой набор, а не undefined:
      // страница товара решает, что показывать, по длине списков, и
      // отсутствующее поле заставило бы её проверять ещё и это.
      specs: {
        mcVersions: [],
        mapType: null,
        gameModes: [],
        themes: [],
        mapSize: null,
        fileFormats: [],
        tags: [],
        fileSizeBytes: null,
        publishedAt: null,
      },
      // category — производная от slug: в строке колонки нет (старые
      // товары, заведённые до миграции 20260730120000).
      category: deriveCategory("medieval-spawn"),
      // Состояния карты здесь НЕТ намеренно (миграция 20260816120000):
      // Product — это то, что видит покупатель, а до него доходят только
      // живые карты. Держать поле, у которого на витрине всегда одно и то
      // же значение, значит приглашать проверять его в шаблонах.
    });
  });

  it("priceCents — всегда число, даже если драйвер отдал строку", () => {
    // supabase-js может вернуть числовую колонку строкой — Number() в
    // rowToProduct страхует от "1500" + наценка = "1500x" в будущем коде.
    const stringy = { ...row, price_cents: "1500" as unknown as number };
    expect(rowToProduct(stringy).priceCents).toBe(1500);
  });

  it("галерея: обложка первая, остальные по position, без дублей", () => {
    const withGallery = {
      ...row,
      // Нарочно вперемешку и с повтором обложки: PostgREST порядок
      // вложенной выборки не гарантирует, а обложку легко случайно
      // продублировать в product_images при заливке контента.
      product_images: [
        { url: "/marketplace/medieval-spawn-3.jpg", position: 2 },
        { url: "/marketplace/medieval-spawn.jpg", position: 0 },
        { url: "/marketplace/medieval-spawn-2.jpg", position: 1 },
      ],
    };
    expect(rowToProduct(withGallery).images).toEqual([
      "/marketplace/medieval-spawn.jpg",
      "/marketplace/medieval-spawn-2.jpg",
      "/marketplace/medieval-spawn-3.jpg",
    ]);
  });
});

describe("deriveCategory", () => {
  it("стабильна: один и тот же slug всегда даёт ту же категорию", () => {
    expect(deriveCategory("ironholt-keep")).toBe(
      deriveCategory("ironholt-keep"),
    );
  });

  it("никогда не возвращает free (бесплатность — по цене, не по тегу)", () => {
    for (const slug of ["a", "ironholt-keep", "sky-village", "zzz-42"]) {
      expect(deriveCategory(slug)).not.toBe("free");
    }
  });
});

describe("filterByCategory", () => {
  const base = {
    id: "00000000-0000-4000-8000-000000000000",
    title: "T",
    summary: "S",
    description: "D",
    image_url: "/x.png",
    price_label: "€20",
    price_currency: "EUR",
    created_at: "2026-07-22T12:00:00.000Z",
    updated_at: "2026-07-22T12:00:00.000Z",
  };
  const make = (slug: string, priceCents: number): Product =>
    rowToProduct({ ...base, slug, price_cents: priceCents });

  const products = [
    make("sky-village", 2000),
    make("sky-cathedral", 2000),
    make("ironholt-keep", 2000),
    make("free-pack", 0),
  ];

  it("free — по цене 0, независимо от производной категории", () => {
    const free = filterByCategory(products, "free");
    expect(free).toHaveLength(1);
    expect(free[0].slug).toBe("free-pack");
  });

  it("обычная категория — только товары ровно этой категории", () => {
    for (const { slug } of SHOP_CATEGORIES) {
      if (slug === "free") continue; // free — по цене, проверен выше
      const found = filterByCategory(products, slug);
      expect(found.every((p) => p.category === slug)).toBe(true);
    }
  });

  it("категории вместе покрывают все товары ровно по разу", () => {
    // Производная категория есть у КАЖДОГО товара (включая бесплатный —
    // он одновременно и Free, и своя категория), и она ровно одна.
    // Раньше здесь была жёсткая проверка «assets + landscape = 4»: она
    // сломалась, когда категорий стало восемь вместо двух. Считаем сумму
    // по всем категориям — тогда тест не зависит от их числа.
    const total = SHOP_CATEGORIES.filter((c) => c.slug !== "free").reduce(
      (sum, c) => sum + filterByCategory(products, c.slug).length,
      0,
    );
    expect(total).toBe(products.length);
  });
});
