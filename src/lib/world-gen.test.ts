import { describe, it, expect } from "vitest";
import { clouds, heights, paintClouds, placeFlowers, stampFlowers, terrain } from "./world-gen";
import stamps from "../../public/brand/pixel/flower-stamps.json";

// Генерация мира для фона главной — чистые функции над массивами, в сеть
// не ходят и DOM не трогают. Гоняются в CI.
//
// ЗАЧЕМ ЭТИ ТЕСТЫ. Карту проверяют глазами, а глаз видит один мир из
// сотни тысяч. Ровно так 24.09 снег занимал пол-экрана в половине миров, и
// поймал это только прогон по нескольким зёрнам. Здесь закреплены два
// решения владельца, которые молча ломаются правкой одного порога:
// «одно зерно — один мир» и «снега мало».

const COLS = 200;
const ROWS = 110;

describe("terrain", () => {
  it("returns one RGBA pixel per block", () => {
    expect(terrain(1, COLS, ROWS)).toHaveLength(COLS * ROWS * 4);
  });

  it("gives the same world for the same seed", () => {
    // Число в плашке «World seed» — обещание: то же зерно, та же карта.
    expect(terrain(4242, COLS, ROWS)).toEqual(terrain(4242, COLS, ROWS));
  });

  it("gives different worlds for different seeds", () => {
    expect(terrain(1, COLS, ROWS)).not.toEqual(terrain(2, COLS, ROWS));
  });

  it("tiles horizontally without a seam", () => {
    // Фон едет в одну сторону бесконечно: две копии мира встык. Шов
    // между правым и левым краем обязан быть не заметнее, чем разница
    // между двумя соседними столбцами внутри карты.
    const img = terrain(777, COLS, ROWS);
    const columnDiff = (a: number, b: number) => {
      let sum = 0;
      for (let y = 0; y < ROWS; y++) {
        for (let c = 0; c < 3; c++) sum += Math.abs(img[(y * COLS + a) * 4 + c] - img[(y * COLS + b) * 4 + c]);
      }
      return sum / ROWS;
    };
    let inner = 0;
    for (let x = 1; x < COLS; x++) inner += columnDiff(x - 1, x);
    inner /= COLS - 1;
    expect(columnDiff(COLS - 1, 0)).toBeLessThan(inner * 2);
  });

  it("does not repeat itself inside one width", () => {
    // Бесшовность не должна превращаться в обои. 24.09 все октавы fbm
    // получили один период решётки, и мелкие октавы повторялись по ширине
    // 2, 4, 8, 16 раз — ряды одинаковых бугров. Шов при этом был чистым, и
    // тест выше молчал. Здесь: карта, сдвинутая на полширины, должна
    // отличаться от себя почти как два разных мира (проверено: на той
    // ошибке отношение падало ниже порога).
    const diff = (a: Uint8ClampedArray, b: Uint8ClampedArray, shift: number) => {
      let sum = 0;
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const i = (y * COLS + x) * 4;
          const j = (y * COLS + ((x + shift) % COLS)) * 4;
          for (let c = 0; c < 3; c++) sum += Math.abs(a[i + c] - b[j + c]);
        }
      }
      return sum;
    };
    let self = 0;
    let other = 0;
    for (let seed = 1; seed <= 20; seed++) {
      const a = terrain(seed * 131, COLS, ROWS);
      const b = terrain(seed * 131 + 1, COLS, ROWS);
      self += diff(a, a, COLS / 2);
      other += diff(a, b, 0);
    }
    // Замер: 0.865 на той ошибке, 0.970 после исправления.
    expect(self / other).toBeGreaterThan(0.93);
  });

  it("keeps snow rare across many worlds", () => {
    // Снег — единственные почти белые клетки с голубым отливом: у песка
    // и пустыни синий канал заметно ниже красного. Порог с запасом над
    // замеренным средним, чтобы тест ловил возврат «пол-экрана белого»,
    // а не дрожал от разницы в пару процентов.
    let snow = 0;
    let total = 0;
    for (let seed = 1; seed <= 50; seed++) {
      const img = terrain(seed * 7919, COLS, ROWS);
      for (let i = 0; i < img.length; i += 4) {
        const [r, g, b] = [img[i], img[i + 1], img[i + 2]];
        if (r > 180 && g > 190 && b > 200 && b >= r) snow++;
        total++;
      }
    }
    expect(snow / total).toBeLessThan(0.05);
  });
});

describe("clouds", () => {
  it("starts with a clear sky and ends fully grown", () => {
    const sky = clouds(99, COLS, ROWS);
    const alphas = (img: Uint8ClampedArray) => {
      const out: number[] = [];
      for (let i = 3; i < img.length; i += 4) out.push(img[i]);
      return out;
    };
    paintClouds(sky.img, sky.appearAt, 0);
    expect(alphas(sky.img).every((a) => a === 0)).toBe(true);

    paintClouds(sky.img, sky.appearAt, sky.done + 1);
    const grown = alphas(sky.img);
    const cloudy = grown.filter((a) => a > 0);
    // Облака есть, и все выросли до одной прозрачности — не застряли на полпути.
    expect(cloudy.length).toBeGreaterThan(0);
    expect(new Set(cloudy).size).toBe(1);
  });
});

// Цветы SouCampus в мире (docs/BRAND-IDEAS.md, раздел 1). Закреплены
// требования владельца: то же зерно — те же цветы; цветок не стоит на
// воде; в первом кадре не растёт под карточкой с текстом; и цветок
// вообще виден — иначе вся затея молча исчезает после правки порога.
describe("flowers", () => {
  // Карточка с текстом на ноутбуке: левая половина экрана, по центру.
  const SCREEN = 160;
  const CARD = { x: 0, y: 25, w: 100, h: 60 };
  const grow = (seed: number) => {
    const hmap = heights(seed, COLS, ROWS);
    return { hmap, flowers: placeFlowers(seed, hmap, COLS, ROWS, "flower32", SCREEN, [CARD]) };
  };

  it("grows the same flowers for the same seed", () => {
    expect(grow(4242).flowers).toEqual(grow(4242).flowers);
  });

  it("never grows on water or sand and keeps out of the card", () => {
    const { w, h, rows } = stamps.stamps.flower32;
    for (let seed = 1; seed <= 60; seed++) {
      const { hmap, flowers } = grow(seed * 977);
      expect(flowers.length).toBeLessThanOrEqual(3);
      for (const f of flowers) {
        for (let sy = 0; sy < h; sy++) {
          for (let sx = 0; sx < w; sx++) {
            if (rows[sy][sx] !== ".") expect(hmap[(f.y + sy) * COLS + f.x + sx]).toBeGreaterThanOrEqual(0.48);
          }
        }
        if (f.x < SCREEN) {
          const inCard = f.x < CARD.x + CARD.w && CARD.x < f.x + w && f.y < CARD.y + CARD.h && CARD.y < f.y + h;
          expect(inCard).toBe(false);
        }
      }
    }
  });

  it("shows a flower in the first frame of most worlds", () => {
    let seen = 0;
    for (let seed = 1; seed <= 100; seed++) {
      if (grow(seed * 31).flowers.some((f) => f.x + stamps.stamps.flower32.w <= SCREEN)) seen++;
    }
    // Замер 15.11: 76 из 100. В остальных мирах свободная часть первого
    // кадра — вода, и цветок выезжает позже.
    expect(seen).toBeGreaterThanOrEqual(65);
  });

  it("paints only the stamp cells", () => {
    const img = terrain(5, COLS, ROWS);
    const before = img.slice();
    stampFlowers(img, COLS, [{ x: 10, y: 10, stamp: "flower24", palette: "orange" }]);
    const { w, h, rows } = stamps.stamps.flower24;
    let changed = 0;
    for (let i = 0; i < img.length; i++) if (img[i] !== before[i]) changed++;
    // Центр серединки — цвет лайма из палитры, клетка «.» в углу — мир как был.
    const cy = rows.findIndex((r) => r.includes("C"));
    const cx = rows[cy].indexOf("C");
    const at = ((10 + cy) * COLS + 10 + cx) * 4;
    expect([img[at], img[at + 1], img[at + 2]]).toEqual([0x7c, 0xcf, 0x00]);
    expect(img[(10 * COLS + 10) * 4]).toBe(before[(10 * COLS + 10) * 4]);
    // Изменились только клетки штампа: не больше w × h пикселей по 3 канала.
    expect(changed).toBeGreaterThan(0);
    expect(changed).toBeLessThanOrEqual(w * h * 3);
  });
});
