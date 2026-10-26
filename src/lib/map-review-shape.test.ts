import { describe, it, expect } from "vitest";
import { checkReviewBody, isValidStars, REVIEW_BODY_MAX } from "./map-review-shape";

// Копия правил product_ratings_body_check и шага звёзд — то, что форма
// обещает человеку до отправки. Исполняет их база.

describe("checkReviewBody", () => {
  it("требует слова, а не «ок»", () => {
    expect(checkReviewBody("ok")).toMatch(/at least/);
    expect(checkReviewBody("          ")).toMatch(/at least/);
  });

  it("пускает нормальный отзыв и режет простыню", () => {
    expect(checkReviewBody("Great spawn, pasted first try.")).toBeNull();
    expect(checkReviewBody("x".repeat(REVIEW_BODY_MAX + 1))).toMatch(/under/);
  });
});

describe("isValidStars", () => {
  it("половинки — да, ноль, шесть и треть — нет", () => {
    expect(isValidStars(4.5)).toBe(true);
    expect(isValidStars(0.5)).toBe(true);
    expect(isValidStars(5)).toBe(true);
    expect(isValidStars(0)).toBe(false);
    expect(isValidStars(5.5)).toBe(false);
    expect(isValidStars(3.3)).toBe(false);
    expect(isValidStars("4")).toBe(false);
  });
});
