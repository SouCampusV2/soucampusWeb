"use client";

import { useEffect, useRef, useState } from "react";
import { BUTTON_COLORS } from "@/components/Button";
import { useHydrated } from "@/lib/useHydrated";
import { paintClouds } from "@/lib/world-gen";
import type { WorldRequest, WorldResponse } from "@/components/hero-world.worker";

// Фон первого экрана — генеративная карта мира. Перенесена из лаборатории
// (ветка design-lab, вариант «Seed», 22.09) по решению владельца 24.09.
//
// Мир не рисуется, а вырастает из одного числа. Зерно запускает генератор,
// генератор — два поля шума: высоту и влажность. Всё остальное следует из
// них, как в самой игре: низина — вода, кромка — песок, влажная равнина —
// лес, сухая — луг, выше — камень, на вершинах снег. Отмывка рельефа — не
// краска, а разница высот соседей: склон к свету светлее, от света темнее.
// Облака — третье поле шума, выше и быстрее.
//
// Каждый блок — один пиксель поля, увеличенный без сглаживания: чёткий
// квадрат, как блок в игре. Зерно новое на каждом заходе.
//
// ⚠️ Зерно выбирает БРАУЗЕР, а не сервер. В лаборатории страница была
// динамической и зерно приходило с HTML; главная у нас статическая (один
// HTML на всех), поэтому число в плашке рисуется только после гидратации
// (useHydrated) — иначе сервер и клиент напечатали бы разные числа.
//
// Как рисуется и движется (с 24.09, вечер). Мир генерируется ОДИН раз на
// зерно и размер экрана в маленький холст «пиксель = блок», один раз
// переносится увеличенным без сглаживания на видимый холст, а плывёт тот
// CSS-трансформацией через Web Animations API. Такую анимацию ведёт
// поток композитора: сдвиг дробный и равномерный, и паузы основного
// потока (React, прокрутка) её не задевают.
// ⚠️ До этого каждый кадр перерисовывал весь холст из JS со сдвигом,
// округлённым до пикселя. При скорости ~0.1 пикселя за кадр шаг в пиксель
// выпадал то через три кадра, то через пять — фон «потряхивало». Не
// возвращать покадровую отрисовку ради движения.
// Анимации ставятся на паузу, когда первый экран ушёл из вида, и не
// запускаются вовсе при prefers-reduced-motion.
//
// Сама генерация — в src/lib/world-gen.ts, и зовёт её Web Worker
// (hero-world.worker.ts), а не этот компонент: так основной поток не
// ждёт ~100 мс расчёта на телефоне. Здесь — только отрисовка и движение.

const CELL = 7; // экранных пикселей на блок

// Проявление первого мира. Было 0.7 с — на телефоне мир и так появляется
// поздно (ждёт весь JS), и долгое проявление добавляло к этому ещё.
// ⚠️ Готовую картинку мира в HTML пробовали 25.09 и убрали по решению
// владельца: смена статичной карты на случайную сразу после загрузки
// слишком заметна. Не возвращать без нового довода.
const FIRST_FADE_MS = 300;

// ⚠️ ВРЕМЕННО (25.09): варианты движения для сравнения на телефоне,
// выбираются параметром ?hero= в адресе. После выбора владельца оставить
// один, а этот словарь убрать.
//   a — как было до 25.09: скорость «экран за N секунд» от ширины экрана
//       (на телефоне земля ~2 px/с), холст в разрешении экрана до 2×;
//   b — экран считается не уже 1440 px: скорость десктопа (~7 px/с);
//   c — не уже 800 px: вдвое быстрее, чем было (~3.6 px/с);
//   d — как c, но холст в полном разрешении экрана (до 3×): на телефонах
//       с плотностью 3 блоки не пересчитываются при движении из 2× в 3×;
//   e — как d, но небо перерисовывается раз в 400 мс, а не в 100: пока
//       облака набегают (~28 с), каждая перерисовка — заново загрузить
//       большой холст в видеокарту прямо во время движения;
//   f — как d, но облака сразу на месте, без набегания: небо рисуется
//       один раз. Если f плавный, а d нет — рывки от перерисовки неба.
const MOTION_VARIANTS = {
  a: { minWidth: 0, maxDpr: 2, skyMs: 100 },
  b: { minWidth: 1440, maxDpr: 2, skyMs: 100 },
  c: { minWidth: 800, maxDpr: 2, skyMs: 100 },
  d: { minWidth: 800, maxDpr: 3, skyMs: 100 },
  e: { minWidth: 800, maxDpr: 3, skyMs: 400 },
  // skyMs 0 — облака сразу целиком, как при prefers-reduced-motion.
  f: { minWidth: 800, maxDpr: 3, skyMs: 0 },
} as const;

function motionVariant() {
  const key = new URLSearchParams(window.location.search).get("hero");
  return MOTION_VARIANTS[key as keyof typeof MOTION_VARIANTS] ?? MOTION_VARIANTS.a;
}

const randomSeed = () => Math.floor(Math.random() * 99999);

// Воркер — при загрузке модуля, а не в эффекте (25.09). Эффекты идут
// после гидратации ВСЕЙ страницы, а код воркера — три запроса подряд
// (загрузчик Turbopack, рантайм, сам генератор). Созданный здесь, он
// качается параллельно с гидратацией. На сервере window нет — там его
// не создаём. Забирает его первый эффект; следующие (после ухода со
// страницы и возврата) создают свой.
let earlyWorker: Worker | null =
  typeof window === "undefined"
    ? null
    : new Worker(new URL("./hero-world.worker.ts", import.meta.url));

export function HeroWorld() {
  const boxRef = useRef<HTMLDivElement>(null);
  const landRef = useRef<HTMLCanvasElement>(null);
  const skyRef = useRef<HTMLCanvasElement>(null);
  const hydrated = useHydrated();
  // Своё число на сервере и в браузере — не беда: до гидратации оно нигде
  // не напечатано, а рисует холст только эффект, то есть браузер.
  const [seed, setSeed] = useState(randomSeed);

  // Зерно для запросов к воркеру. Живёт в ref, а не в зависимостях эффекта
  // ниже: эффект с холстами и анимациями не должен перезапускаться при
  // смене зерна (см. «рывок» в комментарии к нему).
  const seedRef = useRef(seed);
  // Функцию «попроси новый мир» выставляет эффект с холстами, зовёт — эффект зерна.
  const requestRef = useRef<(() => void) | null>(null);

  // Холсты, воркер и движение — ОДИН раз на всё время жизни страницы.
  // ⚠️ До 24.09 этот эффект зависел от [seed] и пересоздавался на каждый
  // «New world»: отмена его анимаций мгновенно возвращала холст в нулевую
  // позицию (первый рывок), а новый мир появлялся с середины пути и сразу
  // на полной скорости (второй). Теперь смена зерна только шлёт запрос, а
  // новый мир приходит через плавную смену (crossfade) — см. show().
  useEffect(() => {
    const box = boxRef.current;
    const land = landRef.current;
    const sky = skyRef.current;
    const landCtx = land?.getContext("2d");
    const skyCtx = sky?.getContext("2d");
    if (!box || !land || !sky || !landCtx || !skyCtx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const motion = motionVariant();

    let anims: Animation[] = [];
    let visible = true;
    let cloud: { img: Uint8ClampedArray; image: ImageData; appearAt: Float32Array; done: number } | null = null;
    let timer = 0;
    // Номер последнего запроса к воркеру. Ответ на более старый (успели
    // нажать «New world» ещё раз или сменить размер окна) выбрасывается.
    let requestId = 0;
    // Мир считает воркер (hero-world.worker.ts), а не этот эффект: иначе
    // ~100 мс генерации на телефоне блокировали бы основной поток и TBT.
    const worker = earlyWorker ?? new Worker(new URL("./hero-world.worker.ts", import.meta.url));
    earlyWorker = null;
    // Отсчёт облаков — от показа ТЕКУЩЕГО мира: у нового мира небо снова
    // чистое и облака набегают заново, а при смене размера окна того же
    // мира отсчёт не сбрасывается и пересобранное небо догоняет фазу.
    let start = performance.now();
    let shownSeed: number | null = null;
    // Мир, ждущий своей очереди, пока гаснет предыдущий. Если за это время
    // пришёл ещё один, показан будет последний.
    let pending: WorldResponse | null = null;
    let fadingOut: Animation | null = null;

    // Данные мира лежат в маленьких холстах «пиксель = блок» вне страницы,
    // а на видимые переносятся увеличенными БЕЗ сглаживания. Увеличивать
    // силами браузера (image-rendering: pixelated) нельзя: композитор,
    // двигая слой, масштабирует его сглаживанием, и блоки расплываются —
    // проверено 24.09. Готовая картинка 1:1 им только сдвигается.
    const landData = document.createElement("canvas");
    const skyData = document.createElement("canvas");

    /**
     * Две копии мира встык: он бесшовный по X (world-gen.ts → tiled), и
     * сдвиг ровно на ширину одной копии незаметно возвращает картинку в
     * начало — отсюда бесконечное движение в одну сторону.
     */
    function blit(from: HTMLCanvasElement, to: CanvasRenderingContext2D) {
      const half = to.canvas.width / 2;
      to.imageSmoothingEnabled = false;
      to.clearRect(0, 0, to.canvas.width, to.canvas.height);
      to.drawImage(from, 0, 0, half, to.canvas.height);
      to.drawImage(from, half, 0, half, to.canvas.height);
    }

    // Небо перерисовывается раз в 100 мс и только пока облака набегают.
    function paintSky() {
      if (!cloud || !skyCtx) return;
      const elapsed = reduce || motion.skyMs === 0 ? Infinity : (performance.now() - start) / 1000;
      paintClouds(cloud.img, cloud.appearAt, elapsed);
      skyData.getContext("2d")!.putImageData(cloud.image, 0, 0);
      blit(skyData, skyCtx);
      if (elapsed > cloud.done) window.clearInterval(timer);
    }

    /**
     * Бесконечно в одну сторону: сдвиг на ширину одной копии (tile), дальше
     * картинка совпадает с начальной и цикл повторяется без шва.
     * ⚠️ До 24.09 движение шло туда-обратно (alternate), и облака в какой-то
     * момент разворачивались. Скорость задана временем, за которое фон
     * проходит ширину экрана, — одинаково на телефоне и на мониторе.
     */
    function drift(el: HTMLElement, tile: number, screenMs: number, direction: "left" | "right") {
      const from = direction === "left" ? 0 : -tile;
      const to = direction === "left" ? -tile : 0;
      if (reduce) {
        el.style.transform = `translate3d(${-tile / 2}px,0,0)`;
        return;
      }
      const a = el.animate(
        [{ transform: `translate3d(${from}px,0,0)` }, { transform: `translate3d(${to}px,0,0)` }],
        { duration: (screenMs * tile) / Math.max(box!.clientWidth, motion.minWidth), iterations: Infinity, easing: "linear" },
      );
      if (!visible) a.pause();
      anims.push(a);
    }

    // Разгон с места: скорость анимаций растёт от нуля за 2.5 с, мир
    // трогается плавно, а не с полного хода. Скорость меняется раз в
    // 100 мс через updatePlaybackRate — он согласует её с композитором.
    // ⚠️ Прямая запись playbackRate каждый кадр (пробовали 24.09) держала
    // анимацию в ожидании синхронизации: замер показал 2.5 с стоянки, а
    // потом сразу полную скорость — паузу вместо разгона.
    let rampTimer = 0;
    function rampUp() {
      window.clearInterval(rampTimer);
      if (reduce) return;
      const t0 = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - t0) / 2500);
        const rate = k * k * (3 - 2 * k); // плавно трогается и плавно выходит на скорость
        anims.forEach((a) => a.updatePlaybackRate(Math.max(rate, 0.02)));
        if (k >= 1) window.clearInterval(rampTimer);
      };
      step();
      rampTimer = window.setInterval(step, 100);
    }

    /** Просит воркер посчитать мир под текущее зерно и размер первого экрана. */
    function build() {
      if (!box) return;
      // Ширина одной копии мира — не меньше экрана (иначе при двух копиях
      // встык на экране не хватило бы картинки). Земля — 1.25 экрана,
      // небо — 2 экрана: облака едут быстрее, и короткий цикл повторял бы
      // одни и те же облака слишком часто.
      const cols = Math.ceil((box.clientWidth * 1.25) / CELL);
      const rows = Math.ceil(box.clientHeight / CELL) + 1;
      const request: WorldRequest = {
        id: ++requestId,
        seed: seedRef.current,
        cols,
        rows,
        skyCols: Math.ceil((box.clientWidth * 2) / CELL),
      };
      worker.postMessage(request);
    }
    requestRef.current = build;

    /** Рисует готовый мир и запускает движение заново. */
    function draw(world: WorldResponse) {
      if (!box || !land || !sky || !landCtx) return;
      const { cols, rows, skyCols } = world;
      anims.forEach((a) => a.cancel());
      anims = [];
      window.clearInterval(timer);
      if (world.seed !== shownSeed) start = performance.now();
      shownSeed = world.seed;
      // Земля — в разрешении экрана (dpr до 2): это её чёткие края.
      // Облака — в CSS-пикселях: они полупрозрачные, на ретине лишняя
      // чёткость им не нужна, а холст неба самый большой (~1.8 ширины экрана).
      const dpr = Math.min(window.devicePixelRatio || 1, motion.maxDpr);
      landData.width = cols;
      landData.height = rows;
      landData.getContext("2d")!.putImageData(new ImageData(world.land, cols, rows), 0, 0);
      // Холсты — на ДВЕ копии мира по ширине (см. blit).
      land.width = 2 * cols * CELL * dpr;
      land.height = rows * CELL * dpr;
      land.style.width = `${2 * cols * CELL}px`;
      land.style.height = `${rows * CELL}px`;
      blit(landData, landCtx);
      skyData.width = skyCols;
      skyData.height = rows;
      sky.width = 2 * skyCols * CELL;
      sky.height = rows * CELL;
      sky.style.width = `${2 * skyCols * CELL}px`;
      sky.style.height = `${rows * CELL}px`;
      // ImageData берёт массив как есть, без копии: paintClouds правит
      // world.sky, а картинка видит правку.
      cloud = { img: world.sky, image: new ImageData(world.sky, skyCols, rows), appearAt: world.appearAt, done: world.done };
      paintSky();
      if (!reduce && motion.skyMs > 0) timer = window.setInterval(paintSky, motion.skyMs);
      // Скорости — прежние, пересчитанные в «экран за столько-то»: земля
      // проходила 0.4 экрана за 82 с (экран за ~205 с), облака 0.82 экрана
      // за 33 с (экран за ~40 с; 33 с — уже на 15% медленнее, 24.09).
      drift(land, cols * CELL, 205000, "right");
      drift(sky, skyCols * CELL, 40000, "left");
      rampUp();
    }

    /** Проявление: и первого мира поверх синего фона, и каждого следующего. */
    function fadeIn(ms: number) {
      if (!box) return;
      box.style.opacity = "1";
      if (!reduce) box.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ms, easing: "ease-out" });
    }

    /**
     * Показ пришедшего мира. Первый просто проявляется. Следующий — через
     * смену: прежний, не останавливаясь, гаснет, в невидимый момент
     * подменяется, новый проявляется. Всё — анимации прозрачности, их
     * ведёт композитор, как и движение.
     */
    function show(world: WorldResponse) {
      if (!box) return;
      if (reduce || shownSeed === null) {
        const first = shownSeed === null;
        draw(world);
        fadeIn(first ? FIRST_FADE_MS : 700);
        return;
      }
      pending = world;
      if (fadingOut) return; // уже гаснет — подменим на самый свежий
      fadingOut = box.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: 250,
        easing: "ease-in",
        fill: "forwards",
      });
      fadingOut.onfinish = () => {
        const next = pending;
        pending = null;
        if (next) draw(next);
        fadingOut?.cancel();
        fadingOut = null;
        fadeIn(600);
      };
    }

    worker.onmessage = (event: MessageEvent<WorldResponse>) => {
      if (event.data.id === requestId) show(event.data);
    };

    // Первый экран ушёл из вида — анимации не нужны никому.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      anims.forEach((a) => (visible ? a.play() : a.pause()));
    });
    observer.observe(box);

    let resizeTimer = 0;
    const onResize = () => {
      // Пересборка мира — десятки миллисекунд; во время перетаскивания
      // края окна она шла бы на каждый пиксель.
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(build, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      requestRef.current = null;
      worker.terminate();
      fadingOut?.cancel();
      window.clearInterval(rampTimer);
      anims.forEach((a) => a.cancel());
      window.clearInterval(timer);
      window.clearTimeout(resizeTimer);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, []);

  // Смена зерна — только запрос нового мира. Объявлен ПОСЛЕ эффекта с
  // холстами: эффекты идут по порядку, и к первому запуску этого
  // requestRef уже выставлен. Он же даёт и самый первый мир.
  useEffect(() => {
    seedRef.current = seed;
    requestRef.current?.();
  }, [seed]);

  const layer = "absolute left-0 top-0 max-w-none will-change-transform";

  return (
    <>
      <div ref={boxRef} className="absolute inset-0 overflow-hidden opacity-0" aria-hidden="true">
        <canvas ref={landRef} className={layer} />
        <canvas ref={skyRef} className={`${layer} opacity-55`} />
      </div>
      {hydrated && (
        <div className="absolute bottom-5 right-5 z-10 flex items-center gap-3 rounded-full border border-zinc-950/[0.06] bg-[#fbfbff]/80 py-1.5 pl-4 pr-1.5 text-sm text-zinc-950 backdrop-blur-xl pointer-coarse:bg-[#fbfbff]/90 pointer-coarse:backdrop-blur-none dark:border-zinc-50/[0.08] dark:bg-zinc-950/80 dark:text-zinc-50 dark:pointer-coarse:bg-zinc-950/90">
          <span className="tabular-nums">
            World seed <span className="font-semibold">{seed}</span>
          </span>
          <button
            type="button"
            onClick={() => setSeed(randomSeed())}
            className={`${BUTTON_COLORS.primary} px-3 py-1.5 font-semibold transition-transform active:scale-95 pointer-coarse:py-2.5`}
          >
            New world
          </button>
        </div>
      )}
    </>
  );
}
