import { describe, it, expect } from "vitest";
import { clouds, paintClouds, terrain } from "./world-gen";

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
