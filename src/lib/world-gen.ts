// Генерация мира для фона первого экрана (HeroWorld). Чистые функции:
// ни DOM, ни холстов — на входе зерно и размеры, на выходе массивы
// пикселей RGBA. Поэтому они работают и в Web Worker (там, где их зовёт
// сайт), и под тестами.
//
// ⚠️ Зачем воркер (24.09): генерация — ~100 мс подряд на телефоне с
// замедленным процессором. Пока она шла в useEffect основного потока,
// TBT главной вырос с 20–60 до 110–130 мс (замер Lighthouse на проде).
// Не возвращать генерацию в компонент.

/** Детерминированный генератор (mulberry32): одно зерно — один мир. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Noise = (x: number, y: number) => number;

/** Остаток, всегда неотрицательный: -1 mod 5 = 4, а не -1, как у «%». */
const wrap = (i: number, period: number) => ((i % period) + period) % period;

/**
 * Значимый шум на решётке 256×256 с гладкой интерполяцией. По X решётка
 * повторяется через `period` узлов (≤ 256) — из этого сделан бесшовный
 * мир, см. tiled().
 */
function valueNoise(seed: number, period = 256): Noise {
  const r = rng(seed);
  const size = 256;
  const table = new Float32Array(size * size);
  for (let i = 0; i < table.length; i++) table[i] = r();
  const fade = (t: number) => t * t * (3 - 2 * t);
  return (x: number, y: number) => {
    const xi = Math.floor(x);
    const yi = Math.floor(y);
    const xf = fade(x - xi);
    const yf = fade(y - yi);
    const at = (i: number, j: number) => table[((j & 255) << 8) | wrap(i, period)];
    const a = at(xi, yi);
    const b = at(xi + 1, yi);
    const c = at(xi, yi + 1);
    const d = at(xi + 1, yi + 1);
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
  };
}

/**
 * Градиентный шум Перлина (улучшенный, с квинтичным сглаживанием) —
 * тот же класс шума, что у Minecraft. Нужен климату: у value noise выше
 * на низкой частоте проступает сетка — пятна тянутся вдоль осей ромбами
 * и полосами, и после нарезки на уровни это становится формой биомов.
 * У градиентного шума сетки не видно. Выход — около 0.5, как у valueNoise.
 */
function perlinNoise(seed: number, period = 256): Noise {
  const r = rng(seed);
  const order = Array.from({ length: 256 }, (_, i) => i);
  for (let i = 255; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const perm = new Uint8Array(512);
  for (let i = 0; i < 512; i++) perm[i] = order[i & 255];
  const GRAD = [[1, 1], [-1, 1], [1, -1], [-1, -1], [1, 0], [-1, 0], [0, 1], [0, -1]];
  const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
  const dot = (i: number, j: number, dx: number, dy: number) => {
    const g = GRAD[perm[perm[i] + j] & 7];
    return g[0] * dx + g[1] * dy;
  };
  return (x: number, y: number) => {
    const X = Math.floor(x);
    const Y = Math.floor(y);
    const xf = x - X;
    const yf = y - Y;
    const xi = wrap(X, period);
    const xj = wrap(X + 1, period); // сосед справа — через край решётки
    const yi = Y & 255;
    const u = fade(xf);
    const v = fade(yf);
    const n00 = dot(xi, yi, xf, yf);
    const n10 = dot(xj, yi, xf - 1, yf);
    const n01 = dot(xi, yi + 1, xf, yf - 1);
    const n11 = dot(xj, yi + 1, xf - 1, yf - 1);
    const top = n00 + (n10 - n00) * u;
    const bottom = n01 + (n11 - n01) * u;
    return 0.5 + (top + (bottom - top) * v) * 0.5;
  };
}

/**
 * Шум, повторяющийся по X ровно через `cols` клеток. Мир бесшовный по
 * горизонтали: две его копии встык не дают шва, и фон едет в одну сторону
 * бесконечно, а не туда-обратно (с 24.09 — облака влево, земля вправо).
 *
 * Решётке задаётся период round(scale × cols) узлов, а частота по X
 * чуть подгоняется (sx), чтобы ширина делилась ровно. Октавы fbm при этом
 * повторяются сами: их период вдвое, вчетверо… короче и делит ширину.
 * Возвращает функцию от КЛЕТОК (x, y), а не от координат шума.
 */
function tiled(
  make: (seed: number, period: number) => Noise,
  seed: number,
  scale: number,
  cols: number,
  scaleY = scale,
): (x: number, y: number, octaves: number) => number {
  const period = Math.min(256, Math.max(1, Math.round(scale * cols)));
  const sx = period / cols;
  const noise = make(seed, period);
  return (x, y, octaves) => fbm(noise, x * sx, y * scaleY, octaves);
}

/** Случайное число 0..1 для клетки: одно и то же для той же клетки и зерна. */
function cellHash(seed: number, x: number, y: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/** Фрактальный шум: октавы, каждая вдвое мельче и вдвое тише. */
function fbm(noise: (x: number, y: number) => number, x: number, y: number, octaves: number) {
  let sum = 0;
  let amp = 0.5;
  let freq = 1;
  let norm = 0;
  for (let o = 0; o < octaves; o++) {
    sum += noise(x * freq, y * freq) * amp;
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

// Биомы — как в Minecraft 1.18+. Мир считается из нескольких полей шума,
// и роли у них разные:
//   · РЕЛЬЕФ (высота, h) решает только форму: вода, берег, равнина,
//     склон, пик. Он частый — берега и горы должны быть подробными;
//   · КЛИМАТ (температура и влажность) решает, КАКОЙ это биом. Он редкий
//     и гладкий: одно значение держится на сотнях блоков, поэтому биом
//     занимает большой цельный кусок, а не рассыпается пятнами по суше.
// Оба климатических поля делятся на 5 уровней, и биом берётся из таблицы
// 5×5 (ниже BIOMES) — ровно так выбирает игра.
//
// ⚠️ До 24.09 (вечер) здесь сравнивали с порогами мелкий шум в три
// октавы — каждое его пятнышко становилось отдельным биомом, и суша
// выглядела пёстрой. Климат обязан быть крупнее рельефа, а не мельче.

type RGB = [number, number, number];

// Пороги уровней — ДОЛИ суши, а не числа «на глаз»: шум кучкуется вокруг
// 0.5, и равные интервалы дали бы крайним уровням почти ничего. Числа
// сняты замером на 300 мирах (двухоктавный Перлин — у него распределение
// уже, чем у value noise, поэтому при смене шума пороги пересчитаны):
// температура — 6% мороз, 20% холод, 34% умеренно, 20% тепло, 20% жара;
// влажность — пять равных частей. Мороз нарочно редкий: снега на первом
// экране должно быть мало.
const TEMP_LEVELS = [0.334, 0.427, 0.522, 0.584];
const HUMIDITY_LEVELS = [0.406, 0.47, 0.522, 0.584];

// Полуширина перехода между уровнями, в единицах шума. Меньше половины
// самого узкого промежутка между порогами (0.043), иначе переход
// захватывал бы третий уровень.
// 0.016 (24.09) давала слишком широкий «спрей» на стыке биомов.
const BLEND = 0.011;

/**
 * Уровень 0..4 и его сосед по мягкой границе: [нижний, верхний, вес
 * верхнего]. Около порога клетка принадлежит двум уровням сразу с весами
 * по плавной кривой — так игра смешивает цвет травы и листвы на стыке
 * биомов (biome blend), и биомы перетекают друг в друга, а не обрываются
 * ступенькой.
 */
function softLevel(v: number, cuts: number[]): [number, number, number] {
  let i = 0;
  while (i < cuts.length && v >= cuts[i]) i++;
  const smooth = (k: number) => k * k * (3 - 2 * k);
  if (i < cuts.length && cuts[i] - v < BLEND) {
    return [i, i + 1, smooth((v - (cuts[i] - BLEND)) / (2 * BLEND))];
  }
  if (i > 0 && v - cuts[i - 1] < BLEND) {
    return [i - 1, i, smooth((v - (cuts[i - 1] - BLEND)) / (2 * BLEND))];
  }
  return [i, i, 0];
}

// Цвета — самой игры, а не акценты сайта: карта должна читаться как
// карта Minecraft. Строка — температура (мороз → жара), столбец —
// влажность (сухо → влажно). Повторы в строке — не опечатка: у игры
// тоже один биом занимает несколько клеток таблицы.
const SNOWY_PLAINS: RGB = [214, 226, 238]; // чуть голубой — не сливается с облаками
const SNOWY_TAIGA: RGB = [104, 128, 118];
const COLD_PLAINS: RGB = [128, 158, 96];
const FOREST: RGB = [58, 116, 46];
const TAIGA: RGB = [52, 92, 70];
const SPRUCE_TAIGA: RGB = [42, 76, 60];
const MEADOW: RGB = [128, 176, 78];
const PLAINS: RGB = [108, 164, 70];
const BIRCH_FOREST: RGB = [112, 152, 78];
const DARK_FOREST: RGB = [38, 80, 42];
const SAVANNA: RGB = [176, 168, 82];
const WARM_FOREST: RGB = [72, 128, 46];
const SPARSE_JUNGLE: RGB = [62, 142, 44];
const JUNGLE: RGB = [34, 124, 30];
const DESERT: RGB = [222, 206, 146];
const BADLANDS: RGB = [188, 96, 48];

const BIOMES: RGB[][] = [
  [SNOWY_PLAINS, SNOWY_PLAINS, SNOWY_PLAINS, SNOWY_TAIGA, SNOWY_TAIGA],
  [COLD_PLAINS, COLD_PLAINS, FOREST, TAIGA, SPRUCE_TAIGA],
  [MEADOW, PLAINS, FOREST, BIRCH_FOREST, DARK_FOREST],
  [SAVANNA, SAVANNA, WARM_FOREST, SPARSE_JUNGLE, JUNGLE],
  [DESERT, DESERT, DESERT, BADLANDS, BADLANDS],
];

// Океаны по той же температуре, как в игре: тёплый — бирюзовый, холодный
// — темнее и с фиолетовым. [глубина, мелководье]. Цвета воды из игры,
// приглушённые: с высоты чистый голубой перекрикивал бы панель.
const OCEANS: [RGB, RGB][] = [
  [[36, 54, 128], [56, 88, 180]], // морозный
  [[36, 60, 132], [56, 96, 184]], // холодный
  [[36, 72, 138], [58, 110, 190]], // обычный
  [[34, 98, 158], [60, 146, 204]], // умеренно тёплый
  [[30, 136, 164], [72, 196, 204]], // тёплый
];

function biome(h: number, t: number, m: number): RGB {
  if (h < 0.455) return OCEANS[t][h < 0.4 ? 0 : 1];
  if (h < 0.48) {
    // Берег: у бэдлендса красный песок, в холоде галька.
    if (t === 4 && m >= 3) return [206, 124, 60];
    if (t <= 1) return [150, 150, 140];
    return [214, 200, 140];
  }
  if (h >= 0.72) {
    // Пики. Снег только на самых высоких и не в тепле — шапки, а не поля.
    // Порог по замеру на 200 мирах: выше 0.8 лежит 1.9% суши в среднем и
    // до 15% в горных мирах (белое пятно на пол-экрана), выше 0.84 —
    // 0.65% в среднем.
    if (h >= 0.84 && t <= 2) return [236, 240, 244];
    if (t === 4 && m >= 3) return [170, 104, 72]; // горы бэдлендса
    return [128, 128, 124];
  }
  // Болото и мангры — только во влажной низине у воды, как в игре.
  if (m === 4 && h < 0.5 && (t === 2 || t === 3)) return t === 2 ? [76, 98, 58] : [62, 100, 52];
  // Вишнёвая роща — на склонах умеренного сухого климата.
  if (t === 2 && m === 0 && h >= 0.63) return [226, 168, 196];
  // Бэдлендс полосами по высоте, как слои терракоты. Полосы широкие и
  // близкие по цвету: частые и контрастные читались как горизонтали
  // топографической карты.
  if (t === 4 && m >= 3) return Math.floor(h * 25) % 2 === 0 ? [198, 110, 60] : BADLANDS;
  return BIOMES[t][m];
}

const SEA_LEVEL = 0.455;
const SCALE = 0.018; // частота рельефа на клетку
const CLIMATE_SCALE = 0.008; // частота климата: вдвое реже рельефа
const WARP = 18; // на сколько клеток искривлены границы климата
const WARP_SCALE = 0.012; // частота искривления: плавные изгибы, а не рябь

export function terrain(seed: number, cols: number, rows: number) {
  // Каждый шум — бесшовный по X с периодом ровно в ширину мира (tiled).
  const height = tiled(valueNoise, seed, SCALE, cols);
  const temp = tiled(perlinNoise, seed ^ 0x7f4a7c15, CLIMATE_SCALE, cols);
  const moist = tiled(perlinNoise, seed ^ 0x9e3779b9, CLIMATE_SCALE, cols);
  const warpX = tiled(perlinNoise, seed ^ 0x3c6ef372, WARP_SCALE, cols);
  const warpY = tiled(perlinNoise, seed ^ 0xa54ff53a, WARP_SCALE, cols);
  const detail = tiled(valueNoise, seed ^ 0x1f83d9ab, 0.15, cols);
  const hmap = new Float32Array(cols * rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Середина по высоте приподнята: на экране чаще суша, а не океан.
      // Только по Y: подъём, зависящий от X, сломал бы бесшовность. 0.3 —
      // средний вклад прежней составляющей по X, чтобы доля суши не уехала.
      const d = Math.hypot(0.3, y / rows - 0.5);
      hmap[y * cols + x] = height(x, y, 5) + 0.12 - d * 0.25;
    }
  }
  const img = new Uint8ClampedArray(cols * rows * 4);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      const h = hmap[i];
      // Domain warp: климат читается не в (x, y), а в точке, сдвинутой
      // ещё одним шумом. Границы биомов становятся извилистыми, как у
      // игры, а не ровными пятнами-кругами. Биом при этом цельный:
      // сдвиг плавный, пятен он не добавляет.
      // Множитель 4, а не 2: разброс Перлина вокруг 0.5 уже, чем у
      // value noise, и при прежнем он гнул бы границы вдвое слабее.
      const wx = x + (warpX(x, y, 1) - 0.5) * 4 * WARP;
      const wy = y + (warpY(x, y, 1) - 0.5) * 4 * WARP;
      const [t0, t1, tw] = softLevel(temp(wx, wy, 2), TEMP_LEVELS);
      const [m0, m1, mw] = softLevel(moist(wx, wy, 2), HUMIDITY_LEVELS);
      // На полосе перехода блок целиком достаётся ОДНОМУ из двух биомов,
      // с вероятностью по весу. Переход постепенный, но из чётких блоков,
      // как рваная граница биомов в самой игре.
      // ⚠️ Смешивать ЦВЕТА нельзя (пробовали 24.09): соседние блоки
      // отличались на доли тона, и полоса перехода читалась как размытие.
      const t = cellHash(seed, x, y) < tw ? t1 : t0;
      const m = cellHash(seed ^ 0x5bd1e995, x, y) < mw ? m1 : m0;
      const [r, g, b] = biome(h, t, m);
      // Свет с северо-запада. Вода плоская, её не тенюем.
      // Сосед слева берётся через край (wrap): иначе на шве тень легла бы иначе.
      const nw = hmap[Math.max(0, y - 1) * cols + wrap(x - 1, cols)];
      let shade = h < SEA_LEVEL ? 1 : 1 + Math.max(-0.35, Math.min(0.35, (h - nw) * 9));
      // Фактура внутри биома: ±5% яркости по мелкому шуму. Лес выглядит
      // лесом, а не заливкой, но в другой биом не превращается.
      if (h >= SEA_LEVEL) shade *= 0.95 + detail(x, y, 1) * 0.1;
      img[i * 4] = Math.min(255, r * shade);
      img[i * 4 + 1] = Math.min(255, g * shade);
      img[i * 4 + 2] = Math.min(255, b * shade);
      img[i * 4 + 3] = 255;
    }
  }
  return img;
}

// Облака набегают постепенно. Каждой клетке облака назначается момент
// появления (в секундах от старта) из трёх слагаемых:
//   · «рождение» облака — отдельное поле шума, крупное: соседние клетки
//     одного облака получают близкие числа, разные облака — разные.
//     Поэтому облака возникают в случайных местах по одному, а не
//     полосой слева направо;
//   · глубина клетки внутри облака — плотная середина раньше, края
//     позже: облако РАСТЁТ, а не проявляется целиком;
//   · немного случайного разброса, чтобы край рос рвано, блоками.
// Итоговая плотность та же, что была: клетка облака — где v > 0.6.
const CLOUD_ALPHA = 170;
const CLOUD_START = 1.5; // первые секунды небо чистое
const CLOUD_SPREAD = 20; // за сколько секунд рождаются все облака
const CLOUD_GROW = 5; // сколько растёт одно облако от середины к краю
const CLOUD_FADE = 1.2; // сколько проявляется одна клетка

export function clouds(seed: number, cols: number, rows: number) {
  // Бесшовные по X, как и земля: небо тоже едет в одну сторону.
  const n = tiled(valueNoise, seed ^ 0x51ed270b, 0.05, cols, 0.08);
  const birth = tiled(valueNoise, seed ^ 0x2545f491, 0.02, cols, 0.03);
  const jitter = rng(seed ^ 0x68e31da4);
  const appearAt = new Float32Array(cols * rows).fill(Infinity);
  let last = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = n(x, y, 3);
      if (v <= 0.6) continue;
      const b = Math.min(1, Math.max(0, (birth(x, y, 2) - 0.3) / 0.4));
      const depth = 1 - Math.min(1, (v - 0.6) / 0.15);
      const at = CLOUD_START + b * CLOUD_SPREAD + depth * CLOUD_GROW + jitter() * 0.8;
      appearAt[y * cols + x] = at;
      last = Math.max(last, at);
    }
  }
  const img = new Uint8ClampedArray(cols * rows * 4);
  for (let i = 0; i < img.length; i += 4) {
    img[i] = img[i + 1] = img[i + 2] = 255;
  }
  return { img, appearAt, done: last + CLOUD_FADE };
}

/** Прозрачность облаков на момент elapsed (сек). */
export function paintClouds(img: Uint8ClampedArray, appearAt: Float32Array, elapsed: number) {
  for (let i = 0; i < appearAt.length; i++) {
    const k = (elapsed - appearAt[i]) / CLOUD_FADE;
    img[i * 4 + 3] = k <= 0 ? 0 : k >= 1 ? CLOUD_ALPHA : Math.round(k * CLOUD_ALPHA);
  }
}

/** Что отдаёт clouds(): белые пиксели неба, момент появления каждой клетки и конец набегания. */
export type CloudField = ReturnType<typeof clouds>;
