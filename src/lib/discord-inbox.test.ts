import { describe, it, expect } from "vitest";
import {
  checkReviewInput,
  deadlineLabelFromDays,
  prefillFromDraft,
  reviewHasText,
  reviewInputFrom,
} from "./discord-inbox";

// Как факты от бота становятся заготовкой формы. В сеть не ходит.

describe("deadlineLabelFromDays", () => {
  it("округляет к дням, неделям и месяцам", () => {
    expect(deadlineLabelFromDays(1)).toBe("~1 day");
    expect(deadlineLabelFromDays(5)).toBe("~5 days");
    expect(deadlineLabelFromDays(7)).toBe("~1 week");
    expect(deadlineLabelFromDays(12)).toBe("~2 weeks");
    expect(deadlineLabelFromDays(90)).toBe("~3 months");
  });

  it("без срока — пустая подпись, а не «~0 days»", () => {
    expect(deadlineLabelFromDays(null)).toBe("");
    expect(deadlineLabelFromDays(0)).toBe("");
  });
});

describe("prefillFromDraft", () => {
  it("переносит факты, тексты не выдумывает", () => {
    const prefill = prefillFromDraft(
      {
        ticketId: "abc123def456", need: "Spawn", theme: "Medieval", version: "1.21",
        sizeLabel: "200×200", sizeX: 200, sizeZ: 200, priceAmount: 300, priceLabel: "€300",
        deadlineDays: 12, completedAt: null, images: [],
      },
      ["https://x.supabase.co/a.png", "https://x.supabase.co/b.png"],
    );
    expect(prefill).toEqual({
      tag: "Order",
      sizeLabel: "200×200",
      sizeX: 200,
      sizeZ: 200,
      priceLabel: "€300",
      priceAmount: 300,
      deadlineLabel: "~2 weeks",
      images: ["https://x.supabase.co/a.png", "https://x.supabase.co/b.png"],
    });
  });
});

describe("отзыв", () => {
  const review = { ticketId: "abc123def456", rating: 5, comment: "  Great work!  ", name: "Ghost Rider" };

  it("заготовка из присланного: адрес из имени, роль пишет владелец", () => {
    const input = reviewInputFrom(review);
    expect(input.slug).toBe("ghost-rider");
    expect(input.text).toBe("Great work!");
    expect(checkReviewInput(input)).toMatch(/who they are/);
    expect(checkReviewInput({ ...input, role: "Owner, GuardiumMC" })).toBeNull();
  });

  it("одна оценка без слов на сайт не годится", () => {
    expect(reviewHasText({ ...review, comment: "   " })).toBe(false);
    expect(reviewHasText(review)).toBe(true);
  });

  it("не пускает кривой адрес и длинный флаг", () => {
    const ok = { ...reviewInputFrom(review), role: "Client" };
    expect(checkReviewInput({ ...ok, slug: "../x" })).toMatch(/Address/);
    expect(checkReviewInput({ ...ok, flag: "x".repeat(40) })).toMatch(/emoji/);
  });
});
