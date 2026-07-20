import { describe, it, expect } from "vitest";
import { rowToStat } from "./stats";

const row = {
  id: "orders",
  label: "Crafted orders and projects",
  value: 246,
  suffix: "+",
  accent: "orange",
};

describe("rowToStat", () => {
  it("приводит value к числу", () => {
    // Колонка в базе — numeric, а такие значения драйвер может отдать
    // строкой. Counter анимирует число: со строкой он бы посчитал до NaN.
    expect(rowToStat({ ...row, value: "246" as unknown as number }).value).toBe(246);
  });

  it("сужает accent до трёх допустимых значений", () => {
    expect(rowToStat({ ...row, accent: "lime" }).accent).toBe("lime");
    expect(rowToStat({ ...row, accent: "blue" }).accent).toBe("blue");
    // Мусор в колонке не должен ломать вёрстку обращением к
    // несуществующему ключу в ACCENT_TEXT/ACCENT_BAR.
    expect(rowToStat({ ...row, accent: "розовый" }).accent).toBe("orange");
  });
});
