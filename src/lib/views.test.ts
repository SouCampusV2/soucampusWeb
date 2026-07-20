import { describe, it, expect } from "vitest";
import { isTrackablePath, VIEW_PATHS } from "./views";

// isTrackablePath — единственная защита таблицы page_views от мусора:
// обработчик /api/view принимает адрес из тела запроса, то есть от кого
// угодно. Всё, что сюда не проходит, в базу не попадает.

describe("isTrackablePath", () => {
  it("пропускает статические страницы сайта", () => {
    for (const path of ["/", "/portfolio", "/about", "/contact", "/shop", "/terms"]) {
      expect(isTrackablePath(path), path).toBe(true);
    }
  });

  it("пропускает страницы работ и отзывов", () => {
    expect(isTrackablePath(VIEW_PATHS.project("bluespawn"))).toBe(true);
    expect(isTrackablePath("/reviews/luke-and-sven")).toBe(true);
  });

  it("отбивает выдуманные адреса", () => {
    expect(isTrackablePath("/выдумка")).toBe(false);
    expect(isTrackablePath("/admin")).toBe(false);
    expect(isTrackablePath("/portfolio/a/b")).toBe(false);
    expect(isTrackablePath("")).toBe(false);
  });

  it("отбивает попытки раздуть таблицу мусорными slug'ами", () => {
    // Заглавные буквы и подчёркивания БД не порождает — значит адрес
    // придуман вручную. Каждый такой уникальный вариант был бы новой
    // строкой в таблице, то есть бесплатным способом её засорить.
    expect(isTrackablePath("/portfolio/BlueSpawn")).toBe(false);
    expect(isTrackablePath("/portfolio/bluespawn?x=1")).toBe(false);
    expect(isTrackablePath("/portfolio/" + "a".repeat(200))).toBe(false);
  });

  it("не путает похожий адрес с разрешённым", () => {
    expect(isTrackablePath("/portfolios")).toBe(false);
    expect(isTrackablePath("//portfolio")).toBe(false);
    expect(isTrackablePath("/portfolio/")).toBe(false);
  });
});
