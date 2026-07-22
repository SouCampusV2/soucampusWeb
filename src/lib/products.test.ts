import { describe, it, expect } from "vitest";
import { rowToProduct } from "./products";

// Чистая функция-граница "строка БД -> товар сайта", в сеть не ходит —
// тот же подход, что в projects.test.ts. Когда в подэтапе B появится
// Stripe, priceCents станет суммой платежа — поэтому проверяем его
// отдельно и жёстко: ошибка здесь будет стоить реальных денег.

describe("rowToProduct", () => {
  const row = {
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
      slug: "medieval-spawn",
      title: "Medieval Spawn",
      summary: "Ready-to-use 300×300 spawn.",
      description: "Long description.",
      image: "/shop/medieval-spawn.jpg",
      price: "€15",
      priceCents: 1500,
      currency: "EUR",
    });
  });

  it("priceCents — всегда число, даже если драйвер отдал строку", () => {
    // supabase-js может вернуть числовую колонку строкой — Number() в
    // rowToProduct страхует от "1500" + наценка = "1500x" в будущем коде.
    const stringy = { ...row, price_cents: "1500" as unknown as number };
    expect(rowToProduct(stringy).priceCents).toBe(1500);
  });
});
