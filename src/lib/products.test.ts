import { describe, it, expect } from "vitest";
import {
  deriveCategory,
  filterByCategory,
  rowToProduct,
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
    image_url: "/shop/medieval-spawn.jpg",
    price_label: "€15",
    price_cents: 1500,
    price_currency: "EUR",
  };

  it("переводит колонки БД в форму сайта", () => {
    expect(rowToProduct(row)).toEqual({
      id: "3f2c8a10-0000-4000-8000-000000000001",
      slug: "medieval-spawn",
      title: "Medieval Spawn",
      summary: "Ready-to-use 300×300 spawn.",
      description: "Long description.",
      image: "/shop/medieval-spawn.jpg",
      price: "€15",
      priceCents: 1500,
      currency: "EUR",
      // category — производная от slug (пока нет колонки в БД).
      category: deriveCategory("medieval-spawn"),
    });
  });

  it("priceCents — всегда число, даже если драйвер отдал строку", () => {
    // supabase-js может вернуть числовую колонку строкой — Number() в
    // rowToProduct страхует от "1500" + наценка = "1500x" в будущем коде.
    const stringy = { ...row, price_cents: "1500" as unknown as number };
    expect(rowToProduct(stringy).priceCents).toBe(1500);
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

  it("assets/landscape — по производной категории", () => {
    const assets = filterByCategory(products, "assets");
    const landscape = filterByCategory(products, "landscape");
    expect(assets.every((p) => p.category === "assets")).toBe(true);
    expect(landscape.every((p) => p.category === "landscape")).toBe(true);
    // каждый товар имеет производную категорию (в т.ч. бесплатный — он
    // может быть и Free, и Assets/Landscape одновременно), поэтому две
    // вкладки вместе покрывают все 4 товара.
    expect(assets.length + landscape.length).toBe(4);
  });
});
