import { describe, it, expect } from "vitest";
import { rowToReview } from "./reviews";

const row = {
  slug: "erik",
  name: "Erik",
  role: "Server Owner, Luckycraft",
  flag: "🇳🇱",
  review_text: "Текст отзыва",
  accent: "orange",
};

describe("rowToReview", () => {
  it("переименовывает review_text в text", () => {
    expect(rowToReview(row).text).toBe("Текст отзыва");
  });

  it("сужает accent до двух допустимых значений", () => {
    // В базе accent — обычный text (с проверкой check), TypeScript про
    // эту проверку не знает. Если в колонку когда-нибудь попадёт мусор,
    // карточка должна получить рабочий цвет, а не сломать вёрстку
    // обращением к несуществующему ключу в ACCENT_CARD.
    expect(rowToReview({ ...row, accent: "lime" }).accent).toBe("lime");
    expect(rowToReview({ ...row, accent: "orange" }).accent).toBe("orange");
    expect(rowToReview({ ...row, accent: "фиолетовый" }).accent).toBe("orange");
  });
});
