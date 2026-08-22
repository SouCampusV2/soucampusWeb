import { describe, it, expect } from "vitest";
import { similarityScore, pickSimilar } from "./similar";
import type { Product, ProductSpecs } from "./products";

// Подбор похожих карт — чистая функция, в сеть не ходит. Гоняется в CI
// без ключей, тот же подход, что в products.test.ts.
//
// ЗАЧЕМ ЭТИ ТЕСТЫ. Формула схожести — единственное место в проекте, где
// «работает» и «работает правильно» невозможно различить глазами:
// подборка из четырёх карточек выглядит одинаково убедительно и когда
// она осмысленная, и когда сломана. Поймать это может только проверка на
// заранее известном ответе.

const EMPTY_SPECS: ProductSpecs = {
  mcVersions: [],
  mapType: null,
  gameModes: [],
  themes: [],
  mapSize: null,
  fileFormats: [],
  tags: [],
  fileSizeBytes: null,
  publishedAt: null,
};

let counter = 0;

function make(overrides: Partial<Product> = {}): Product {
  counter += 1;
  return {
    id: `id-${String(counter).padStart(4, "0")}`,
    slug: `map-${counter}`,
    title: `Map ${counter}`,
    summary: "",
    description: "",
    image: "/x.jpg",
    images: ["/x.jpg"],
    createdAt: "2026-08-01T00:00:00.000Z",
    updatedAt: "2026-08-01T00:00:00.000Z",
    price: "€10",
    priceCents: 1000,
    currency: "EUR",
    category: "spawn",
    creatorId: null,
    specs: { ...EMPTY_SPECS },
    reactionOptionId: null,
    ...overrides,
  };
}

describe("similarityScore", () => {
  it("даёт ноль двум картам, у которых не совпало ничего", () => {
    const a = make({ category: "spawn" });
    const b = make({ category: "interior" });
    expect(similarityScore(a, b)).toBe(0);
  });

  it("считает совпадение категории самым весомым одиночным сигналом", () => {
    const a = make({ category: "adventure" });
    const b = make({ category: "adventure" });
    expect(similarityScore(a, b)).toBe(5);
  });

  it("НЕ считает похожими две карты с пустым типом", () => {
    // Иначе все карты, залитые до миграции с характеристиками, слиплись
    // бы в одну кучу — «оба поля пустые» это не совпадение.
    const a = make({ category: "spawn", specs: { ...EMPTY_SPECS } });
    const b = make({ category: "interior", specs: { ...EMPTY_SPECS } });
    expect(similarityScore(a, b)).toBe(0);
  });

  it("сравнивает значения без учёта регистра", () => {
    const a = make({
      category: "interior",
      specs: { ...EMPTY_SPECS, themes: ["Medieval"] },
    });
    const b = make({
      category: "spawn",
      specs: { ...EMPTY_SPECS, themes: ["medieval"] },
    });
    expect(similarityScore(a, b)).toBe(3);
  });

  it("симметрична: порядок аргументов ничего не меняет", () => {
    // Несимметричная мера означала бы, что A попадает в подборку к B, а B
    // к A — нет, и объяснить это посетителю нечем.
    const a = make({
      category: "spawn",
      creatorId: "c1",
      specs: { ...EMPTY_SPECS, mapType: "Hub", tags: ["pvp", "arena"] },
    });
    const b = make({
      category: "spawn",
      creatorId: "c1",
      specs: { ...EMPTY_SPECS, mapType: "hub", tags: ["arena"] },
    });
    expect(similarityScore(a, b)).toBe(similarityScore(b, a));
  });

  it("ограничивает вклад версий Minecraft потолком", () => {
    // Версию пишут почти одинаково у всех карт, поэтому без потолка
    // «все под 1.21» оказались бы похожи друг на друга.
    const versions = ["1.19", "1.20", "1.21", "1.21.1", "1.21.4"];
    const a = make({ category: "spawn", specs: { ...EMPTY_SPECS, mcVersions: versions } });
    const b = make({ category: "assets", specs: { ...EMPTY_SPECS, mcVersions: versions } });
    // Пять совпадений по единице — но потолок 2.
    expect(similarityScore(a, b)).toBe(2);
  });

  it("ограничивает вклад тегов, чтобы многословность не решала", () => {
    const tags = ["a", "b", "c", "d", "e"];
    const a = make({ category: "spawn", specs: { ...EMPTY_SPECS, tags } });
    const b = make({ category: "assets", specs: { ...EMPTY_SPECS, tags } });
    // Пять совпадений по двойке — но потолок 6.
    expect(similarityScore(a, b)).toBe(6);
  });

  it("не считает общим автором две карты без автора", () => {
    const a = make({ category: "free", creatorId: null });
    const b = make({ category: "assets", creatorId: null });
    expect(similarityScore(a, b)).toBe(0);
  });
});

describe("pickSimilar", () => {
  it("возвращает пусто, когда похожих нет — вместо случайных", () => {
    // Главное требование владельца: «реально схожие, а не рандом».
    const base = make({ category: "spawn" });
    const pool = [make({ category: "interior" }), make({ category: "assets" })];
    expect(pickSimilar(base, pool)).toEqual([]);
  });

  it("не включает саму карту", () => {
    const base = make({ category: "spawn" });
    expect(pickSimilar(base, [base])).toEqual([]);
  });

  it("отбрасывает слабое совпадение ниже порога", () => {
    // Один общий тег — это 2, порог 3. Такое «похоже» ничего не значит.
    const base = make({
      category: "spawn",
      specs: { ...EMPTY_SPECS, tags: ["castle"] },
    });
    const weak = make({
      category: "assets",
      specs: { ...EMPTY_SPECS, tags: ["castle"] },
    });
    expect(pickSimilar(base, [weak])).toEqual([]);
  });

  it("ставит более похожую карту выше", () => {
    const base = make({
      category: "adventure",
      specs: { ...EMPTY_SPECS, mapType: "Quest", themes: ["fantasy"] },
    });
    const weaker = make({ category: "adventure" });
    const stronger = make({
      category: "adventure",
      specs: { ...EMPTY_SPECS, mapType: "Quest", themes: ["fantasy"] },
    });
    const [first, second] = pickSimilar(base, [weaker, stronger]);
    expect(first.id).toBe(stronger.id);
    expect(second.id).toBe(weaker.id);
  });

  it("при равной схожести предпочитает карту ближе по цене", () => {
    const base = make({ category: "building", priceCents: 1000 });
    const far = make({ category: "building", priceCents: 9000 });
    const near = make({ category: "building", priceCents: 1200 });
    expect(pickSimilar(base, [far, near])[0].id).toBe(near.id);
  });

  it("при полном равенстве даёт один и тот же порядок", () => {
    // Страница статическая: подборка не должна молча меняться от сборки
    // к сборке.
    const base = make({ category: "minigame", priceCents: 500 });
    const one = make({ category: "minigame", priceCents: 500 });
    const two = make({ category: "minigame", priceCents: 500 });
    expect(pickSimilar(base, [one, two])).toEqual(pickSimilar(base, [two, one]));
  });

  it("отдаёт не больше запрошенного", () => {
    const base = make({ category: "landscape" });
    const pool = [
      make({ category: "landscape" }),
      make({ category: "landscape" }),
      make({ category: "landscape" }),
      make({ category: "landscape" }),
      make({ category: "landscape" }),
    ];
    expect(pickSimilar(base, pool, 3)).toHaveLength(3);
  });
});
