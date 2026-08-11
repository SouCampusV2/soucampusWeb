import { describe, it, expect } from "vitest";
import { cooldownDaysFor, REJECTION_TEMPLATES } from "./rejection";

// Пауза после отказа — единственное место, где отказ имеет ЦЕНУ для
// автора, поэтому её правила стоит закрепить: ошибка в одну сторону
// пускает спамера обратно через минуту, в другую — запирает человека,
// который всего лишь криво снял скриншоты.

describe("cooldownDaysFor", () => {
  it("не даёт паузы за исправимые придирки", () => {
    // Это принципиально: наказание за исправимую ошибку учит не
    // исправлять её, а не приходить.
    expect(cooldownDaysFor(["images", "description", "title", "price"])).toBe(0);
  });

  it("берёт самую тяжёлую причину, а не сумму", () => {
    // Причины описывают ОДНУ заявку с разных сторон; складывая их, мы
    // наказывали бы за подробность формулировки.
    expect(cooldownDaysFor(["low_effort", "stolen"])).toBe(30);
    expect(cooldownDaysFor(["prohibited", "spam"])).toBe(90);
  });

  it("не спотыкается о неизвестный код", () => {
    expect(cooldownDaysFor(["nonsense"])).toBe(0);
    expect(cooldownDaysFor([])).toBe(0);
  });

  it("у каждого шаблона срок неотрицательный", () => {
    for (const t of REJECTION_TEMPLATES) {
      expect(t.cooldownDays).toBeGreaterThanOrEqual(0);
    }
  });
});
