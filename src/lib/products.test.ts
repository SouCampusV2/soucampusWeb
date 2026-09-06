import { describe, it, expect } from "vitest";
import {
  deriveCategory,
  eurosToCents,
  filterByCategory,
  filterByPriceRange,
  filterBySpecs,
  rowToProduct,
  SHOP_CATEGORIES,
  sortByCollection,
  sortProducts,
  EMPTY_SPEC_FILTERS,
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
        mapTypes: [],
        gameModes: [],
        themes: [],
        mapSize: null,
        fileFormats: [],
        tags: [],
        fileSizeBytes: null,
        publishedAt: null,
      },
      // Реакции в строке нет — автор её не выбрал (или база без
      // миграции 20260821170000). Карта тогда просто не показывает
      // кнопку рядом с «Add to cart».
      reactionOptionId: null,
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

describe("eurosToCents", () => {
  it("переводит евро в центы, принимая и запятую", () => {
    expect(eurosToCents("12")).toBe(1200);
    expect(eurosToCents("12.5")).toBe(1250);
    expect(eurosToCents("12,5")).toBe(1250);
  });

  it("округляет, а не отбрасывает дробь", () => {
    // 19.99 * 100 в двоичной арифметике даёт 1998.9999999999998.
    // Без округления карта за €19.99 не попала бы в диапазон «до 19.99».
    expect(eurosToCents("19.99")).toBe(1999);
  });

  it("пусто и чепуха — это отсутствие границы, а не ноль", () => {
    // Ноль — законная граница («от 0» включает бесплатные), поэтому
    // отличать «не ввели» от «ввели 0» обязательно.
    expect(eurosToCents("")).toBeNull();
    expect(eurosToCents("   ")).toBeNull();
    expect(eurosToCents("abc")).toBeNull();
    expect(eurosToCents("-5")).toBeNull();
    expect(eurosToCents("0")).toBe(0);
  });
});

describe("filterByPriceRange", () => {
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
    make("free-pack", 0),
    make("cheap", 500),
    make("mid", 2000),
    make("pricey", 4000),
  ];

  const slugs = (min: number | null, max: number | null) =>
    filterByPriceRange(products, min, max).map((p) => p.slug);

  it("обе границы включительны", () => {
    // Так читается «от 5 до 20» тем, кто их вписал: карта за ровно 20
    // обязана быть в выборке.
    expect(slugs(500, 2000)).toEqual(["cheap", "mid"]);
  });

  it("одна граница — открытый с другой стороны диапазон", () => {
    expect(slugs(null, 500)).toEqual(["free-pack", "cheap"]);
    expect(slugs(2000, null)).toEqual(["mid", "pricey"]);
  });

  it("границ нет — список как есть", () => {
    expect(slugs(null, null)).toHaveLength(products.length);
  });

  it("перепутанные местами границы не дают пустоты", () => {
    // «от 20 до 5» — опечатка, а пустой экран в ответ на опечатку
    // читается как поломка каталога.
    expect(slugs(2000, 500)).toEqual(["cheap", "mid"]);
  });

  it("от нуля — вместе с бесплатными", () => {
    expect(slugs(0, 500)).toEqual(["free-pack", "cheap"]);
  });
});

describe("filterBySpecs", () => {
  const base = {
    id: "00000000-0000-4000-8000-000000000000",
    title: "T",
    summary: "S",
    description: "D",
    image_url: "/x.png",
    price_label: "€20",
    price_cents: 2000,
    price_currency: "EUR",
    created_at: "2026-07-22T12:00:00.000Z",
    updated_at: "2026-07-22T12:00:00.000Z",
  };

  const spawn = rowToProduct({
    ...base,
    slug: "spawn",
    mc_versions: ["1.21", "1.20"],
    map_types: ["Spawn"],
    file_formats: ["Java world"],
    game_modes: ["Hub & lobby"],
    map_size: "Large",
    themes: ["Medieval"],
  });
  const arena = rowToProduct({
    ...base,
    slug: "arena",
    mc_versions: ["1.8"],
    map_types: ["Minigame arena"],
    file_formats: ["Schematic"],
    game_modes: ["Minigame"],
    map_size: "Small",
    themes: ["Fantasy"],
  });
  const bare = rowToProduct({ ...base, slug: "bare" });
  const products = [spawn, arena, bare];

  const slugs = (filters: Partial<typeof EMPTY_SPEC_FILTERS>) =>
    filterBySpecs(products, { ...EMPTY_SPEC_FILTERS, ...filters }).map(
      (p) => p.slug,
    );

  it("ничего не выбрано — список как есть", () => {
    expect(slugs({})).toHaveLength(products.length);
  });

  it("внутри поля значения складываются по ИЛИ", () => {
    // «1.8 или 1.21» — обычная просьба. «И 1.8, и 1.21 одновременно»
    // человек в фильтре не имеет в виду почти никогда.
    expect(slugs({ mcVersions: ["1.8", "1.21"] }).sort()).toEqual([
      "arena",
      "spawn",
    ]);
  });

  it("разные поля складываются по И", () => {
    expect(slugs({ mcVersions: ["1.21"], formats: ["Schematic"] })).toEqual([]);
    expect(slugs({ mcVersions: ["1.21"], formats: ["Java world"] })).toEqual([
      "spawn",
    ]);
  });

  it("одиночные поля работают тем же правилом, что списки", () => {
    expect(slugs({ mapTypes: ["Spawn"] })).toEqual(["spawn"]);
    expect(slugs({ mapSizes: ["Small"] })).toEqual(["arena"]);
  });

  it("карта без характеристик выпадает из любого фильтра", () => {
    // И это правильно: пустое поле значит «автор не сказал», а не
    // «подходит под всё».
    expect(slugs({ themes: ["Medieval"] })).toEqual(["spawn"]);
    expect(slugs({ mapTypes: ["Spawn"] })).not.toContain("bare");
  });
});

describe("sortProducts", () => {
  const base = {
    id: "00000000-0000-4000-8000-000000000000",
    summary: "S",
    description: "D",
    image_url: "/x.png",
    price_label: "€20",
    price_currency: "EUR",
    updated_at: "2026-07-22T12:00:00.000Z",
  };
  const make = (
    slug: string,
    title: string,
    priceCents: number,
    createdAt: string,
  ): Product =>
    rowToProduct({
      ...base,
      slug,
      title,
      price_cents: priceCents,
      created_at: createdAt,
    });

  const products = [
    make("b", "Bravo", 3000, "2026-03-01T00:00:00.000Z"),
    make("a", "Alpha", 1000, "2026-01-01T00:00:00.000Z"),
    make("c", "Charlie", 2000, "2026-06-01T00:00:00.000Z"),
  ];
  const order = (sort: Parameters<typeof sortProducts>[1]) =>
    sortProducts(products, sort).map((p) => p.slug);

  it("без выбора порядок не трогается", () => {
    expect(order(null)).toEqual(["b", "a", "c"]);
  });

  it("новые и старые", () => {
    expect(order("newest")).toEqual(["c", "b", "a"]);
    expect(order("oldest")).toEqual(["a", "b", "c"]);
  });

  it("дешёвые и дорогие", () => {
    expect(order("price-asc")).toEqual(["a", "c", "b"]);
    expect(order("price-desc")).toEqual(["b", "c", "a"]);
  });

  it("по названию", () => {
    expect(order("name-asc")).toEqual(["a", "b", "c"]);
  });

  it("не мутирует исходный массив", () => {
    const before = products.map((p) => p.slug);
    sortProducts(products, "price-asc");
    expect(products.map((p) => p.slug)).toEqual(before);
  });
});

describe("sortByCollection", () => {
  const base = {
    id: "00000000-0000-4000-8000-000000000000",
    title: "T",
    summary: "S",
    description: "D",
    image_url: "/x.png",
    price_label: "€20",
    price_cents: 2000,
    price_currency: "EUR",
    updated_at: "2026-07-22T12:00:00.000Z",
  };
  const make = (
    slug: string,
    createdAt: string,
    stats: Partial<Pick<Product, "salesCount" | "rating" | "ratingCount">>,
  ): Product => ({
    ...rowToProduct({ ...base, slug, created_at: createdAt }),
    ...stats,
  });

  const products = [
    make("old-bestseller", "2026-01-01T00:00:00.000Z", {
      salesCount: 10,
      rating: 3,
      ratingCount: 2,
    }),
    make("fresh-unrated", "2026-08-01T00:00:00.000Z", {
      salesCount: 0,
      rating: 0,
      ratingCount: 0,
    }),
    make("loved", "2026-05-01T00:00:00.000Z", {
      salesCount: 3,
      rating: 5,
      ratingCount: 4,
    }),
  ];

  it("all — порядок базы, без своего мнения", () => {
    expect(sortByCollection(products, "all").map((p) => p.slug)).toEqual([
      "old-bestseller",
      "fresh-unrated",
      "loved",
    ]);
  });

  it("popular — по числу продаж", () => {
    expect(sortByCollection(products, "popular").map((p) => p.slug)).toEqual([
      "old-bestseller",
      "loved",
      "fresh-unrated",
    ]);
  });

  it("recent — новые сверху", () => {
    expect(sortByCollection(products, "recent").map((p) => p.slug)).toEqual([
      "fresh-unrated",
      "loved",
      "old-bestseller",
    ]);
  });

  it("top-rated выбрасывает карты без единой оценки", () => {
    // Ноль у неоценённой карты значит «неизвестно», а не «плохо» —
    // в «лучших по оценкам» ей не место ни в каком порядке.
    expect(sortByCollection(products, "top-rated").map((p) => p.slug)).toEqual([
      "loved",
      "old-bestseller",
    ]);
  });

  it("не мутирует исходный массив", () => {
    // Массив приезжает из кэша страницы: сортировка на месте меняла бы
    // его для всех остальных читателей.
    const before = products.map((p) => p.slug);
    sortByCollection(products, "popular");
    expect(products.map((p) => p.slug)).toEqual(before);
  });
});
