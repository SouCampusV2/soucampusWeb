import { describe, it, expect } from "vitest";
import { toHandle, creatorHref } from "./creators";

// Чистые функции-границы: отображение «ник → адрес». В сеть не ходят,
// гоняются в CI без ключей (тот же подход, что в products.test.ts).
//
// Почему это стоит теста: хэндл — единственное, что связывает ссылку в
// навбаре, ссылку на карточке товара и поиск профиля в БД
// (ilike display_name). Разъедутся эти три места — пользователь попадёт
// на 404 вместо своего профиля, ровно как в баге 2026-07-27.

describe("toHandle", () => {
  it("приводит ник к нижнему регистру", () => {
    expect(toHandle("SouCampus")).toBe("soucampus");
  });

  it("идемпотентна: хэндл от хэндла — тот же хэндл", () => {
    expect(toHandle(toHandle("SouCampus"))).toBe(toHandle("SouCampus"));
  });

  it("ники, отличающиеся только регистром, дают один хэндл", () => {
    // Это не случайность, а следствие уникального индекса по
    // lower(display_name): двух таких профилей в БД существовать не может,
    // значит и коллизии хэндлов быть не может.
    expect(toHandle("SOUCAMPUS")).toBe(toHandle("soucampus"));
  });
});

describe("creatorHref", () => {
  it("строит адрес страницы креатора", () => {
    expect(creatorHref("SouCampus")).toBe("/creator/soucampus");
  });

  it("экранирует символы, ломающие адрес", () => {
    // Ник задаёт пользователь, а он едет в URL — пробел или слэш без
    // экранирования увели бы на другой маршрут.
    expect(creatorHref("Sou Campus")).toBe("/creator/sou%20campus");
    expect(creatorHref("a/b")).toBe("/creator/a%2Fb");
  });
});
