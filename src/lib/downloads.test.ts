import { describe, it, expect } from "vitest";
import { downloadFileName } from "@/lib/orders";
import { sanitizePriceInput } from "@/components/MapFormParts";

// Две чистые функции, появившиеся 2026-07-31 по замечаниям владельца:
// имя скачиваемого файла и фильтрация поля цены. Обе на границе с
// пользовательским вводом, и обе легко сломать незаметно.

describe("downloadFileName", () => {
  it("склеивает название карты с расширением из пути в Storage", () => {
    expect(downloadFileName("Ironholt Keep", "uid/9f3a-1753.zip")).toBe(
      "Ironholt-Keep.zip"
    );
  });

  it("сохраняет .schem и .schematic — это разные форматы", () => {
    expect(downloadFileName("Tower", "uid/x.schem")).toBe("Tower.schem");
    expect(downloadFileName("Tower", "uid/x.schematic")).toBe("Tower.schematic");
  });

  it("вычищает то, что ломает имя файла", () => {
    expect(downloadFileName('a/b\\c:"d"', "uid/x.zip")).toBe("abcd.zip");
  });

  it("не остаётся без имени, если чистить оказалось нечего", () => {
    expect(downloadFileName("🏰🏰", "uid/x.zip")).toBe("map.zip");
  });

  it("переживает путь без расширения", () => {
    expect(downloadFileName("Keep", "uid/nodot")).toBe("Keep");
  });
});

describe("sanitizePriceInput", () => {
  // null — «не принимать нажатие»: поле остаётся как было.
  it("не пускает буквы и минус", () => {
    expect(sanitizePriceInput("12a")).toBeNull();
    expect(sanitizePriceInput("-1")).toBeNull();
    expect(sanitizePriceInput("1e5")).toBeNull();
  });

  it("принимает цифры и приводит запятую к точке", () => {
    expect(sanitizePriceInput("15")).toBe("15");
    expect(sanitizePriceInput("15,50")).toBe("15.50");
  });

  it("держит не больше двух знаков после точки и одну точку", () => {
    expect(sanitizePriceInput("1.234")).toBeNull();
    expect(sanitizePriceInput("1.2.3")).toBeNull();
  });

  it("разрешает промежуточные состояния набора", () => {
    expect(sanitizePriceInput("")).toBe("");
    expect(sanitizePriceInput("1.")).toBe("1.");
    expect(sanitizePriceInput("0")).toBe("0");
  });
});
