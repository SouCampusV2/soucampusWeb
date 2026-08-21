import { describe, it, expect } from "vitest";
import { toHandle, creatorHref, isHexColor } from "./creators";
import { NAME_COLORS } from "./name-colors";

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

// Цвет ника попадает прямо в атрибут style, поэтому проверка формы — не
// придирка, а граница вывода. Ограничение в базе стережёт ЗАПИСЬ, эта
// функция — ЧТЕНИЕ: значение из базы всё равно остаётся вводом
// пользователя, и старые строки могли попасть туда до ограничения.
describe("isHexColor", () => {
  it("принимает ровно #rrggbb в любом регистре", () => {
    expect(isHexColor("#f97316")).toBe(true);
    expect(isHexColor("#FFFFFF")).toBe(true);
  });

  it("отвергает короткую запись и имена цветов", () => {
    // #abc — валидный CSS, но не наш формат: база такого не примет, и
    // принимать это на выходе значило бы разойтись с ней.
    expect(isHexColor("#abc")).toBe(false);
    expect(isHexColor("red")).toBe(false);
    expect(isHexColor("rgb(255,0,0)")).toBe(false);
  });

  it("отвергает попытки дописать что-то после цвета", () => {
    // Ровно то, ради чего проверка и стоит: значение уезжает в style.
    expect(isHexColor("#f97316; background:url(http://evil)")).toBe(false);
    expect(isHexColor("#f97316 ")).toBe(false);
  });

  it("считает отсутствие цвета отсутствием, а не ошибкой", () => {
    expect(isHexColor(null)).toBe(false);
    expect(isHexColor(undefined)).toBe(false);
    expect(isHexColor("")).toBe(false);
  });
});

describe("NAME_COLORS", () => {
  it("хранит только тот формат, который принимает база", () => {
    // Ограничение в БД — ^#[0-9a-fA-F]{6}$. Палитра, которая ему не
    // соответствует, показала бы человеку цвет, не сохраняемый при
    // нажатии «Save».
    for (const colour of NAME_COLORS) {
      expect(isHexColor(colour.value)).toBe(true);
    }
  });

  it("не содержит повторов", () => {
    const values = NAME_COLORS.map((c) => c.value);
    expect(new Set(values).size).toBe(values.length);
  });

  it("держит контраст не ниже 3.0 на обеих темах", () => {
    // Порог 3.0 — WCAG для КРУПНОГО текста, а ник на профиле именно
    // такой. Тест стоит затем, чтобы девятый цвет, добавленный на глаз,
    // не проехал незамеченным: посчитать контраст руками забудут.
    const luminance = (hex: string) => {
      const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const [r, g, b] = channels.map((v) =>
        v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
      );
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const ratio = (a: string, b: string) => {
      const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
      return (hi + 0.05) / (lo + 0.05);
    };

    for (const colour of NAME_COLORS) {
      expect(ratio(colour.value, "#fbfbff")).toBeGreaterThanOrEqual(3);
      expect(ratio(colour.value, "#09090b")).toBeGreaterThanOrEqual(3);
    }
  });
});
