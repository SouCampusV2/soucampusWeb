import { describe, it, expect } from "vitest";
import { existsSync } from "fs";
import { join } from "path";
import { REVIEW_AVATARS, rowToReview } from "./reviews";

const PUBLIC_DIR = join(__dirname, "..", "..", "public");

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

describe("REVIEW_AVATARS", () => {
  it("каждый аватар лежит в public/ — опечатка в имени дала бы дыру", () => {
    for (const [slug, paths] of Object.entries(REVIEW_AVATARS)) {
      expect(paths.length, slug).toBeGreaterThan(0);
      for (const path of paths) {
        expect(path, slug).toMatch(/^\/reviews\//);
        expect(existsSync(join(PUBLIC_DIR, path)), path).toBe(true);
      }
    }
  });

  it("отзыв без аватара получает пустой список, а не падение", () => {
    expect(rowToReview({ ...row, slug: "someone-new" }).avatars).toEqual([]);
    expect(rowToReview(row).avatars).toEqual(["/reviews/erik.png"]);
  });
});
