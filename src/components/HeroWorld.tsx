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

const randomSeed = () => Math.floor(Math.random() * 99999);

export function HeroWorld() {
  const boxRef = useRef<HTMLDivElement>(null);
  const landRef = useRef<HTMLCanvasElement>(null);
  const skyRef = useRef<HTMLCanvasElement>(null);
  const hydrated = useHydrated();
  // Своё число на сервере и в браузере — не беда: до гидратации оно нигде
  // не напечатано, а рисует холст только эффект, то есть браузер.
  const [seed, setSeed] = useState(randomSeed);

  useEffect(() => {
    const box = boxRef.current;
    const land = landRef.current;
    const sky = skyRef.current;
    const landCtx = land?.getContext("2d");
    const skyCtx = sky?.getContext("2d");
    if (!box || !land || !sky || !landCtx || !skyCtx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let anims: Animation[] = [];
    let visible = true;
    let cloud: { img: Uint8ClampedArray; image: ImageData; appearAt: Float32Array; done: number } | null = null;
    let timer = 0;
    // Номер последнего запроса к воркеру. Ответ на более старый (успели
    // сменить размер окна) выбрасывается: рисовать мир чужого размера нельзя.
    let requestId = 0;
    // Мир считает воркер (hero-world.worker.ts), а не этот эффект: иначе
    // ~100 мс генерации на телефоне блокировали бы основной поток и TBT.
    const worker = new Worker(new URL("./hero-world.worker.ts", import.meta.url));
    // Отсчёт облаков идёт от первого показа мира и не сбрасывается при
    // смене размера окна: пересобранное небо сразу догоняет нужную фазу.
    const start = performance.now();

    // Данные мира лежат в маленьких холстах «пиксель = блок» вне страницы,
    // а на видимые переносятся увеличенными БЕЗ сглаживания. Увеличивать
    // силами браузера (image-rendering: pixelated) нельзя: композитор,
    // двигая слой, масштабирует его сглаживанием, и блоки расплываются —
    // проверено 24.09. Готовая картинка 1:1 им только сдвигается.
    const landData = document.createElement("canvas");
    const skyData = document.createElement("canvas");

    function blit(from: HTMLCanvasElement, to: CanvasRenderingContext2D) {
      to.imageSmoothingEnabled = false;
      to.clearRect(0, 0, to.canvas.width, to.canvas.height);
      to.drawImage(from, 0, 0, to.canvas.width, to.canvas.height);
    }

    // Небо перерисовывается раз в 100 мс и только пока облака набегают.
    function paintSky() {
      if (!cloud || !skyCtx) return;
      const elapsed = reduce ? Infinity : (performance.now() - start) / 1000;
      paintClouds(cloud.img, cloud.appearAt, elapsed);
      skyData.getContext("2d")!.putImageData(cloud.image, 0, 0);
      blit(skyData, skyCtx);
      if (elapsed > cloud.done) window.clearInterval(timer);
    }

    /** Туда-обратно без шва на краю поля; ease-in-out повторяет прежний синус. */
    function drift(el: HTMLElement, span: number, oneWayMs: number, phase: number) {
      if (reduce) {
        el.style.transform = `translate3d(${-span * phase}px,0,0)`;
        return;
      }
      const a = el.animate(
        [{ transform: "translate3d(0,0,0)" }, { transform: `translate3d(${-span}px,0,0)` }],
        {
          duration: oneWayMs,
          iterations: Infinity,
          direction: "alternate",
          easing: "ease-in-out",
          delay: -oneWayMs * phase,
        },
      );
      if (!visible) a.pause();
      anims.push(a);
    }

    /** Просит воркер посчитать мир под текущий размер первого экрана. */
    function build() {
      if (!box) return;
      // Поле шире экрана на 40% — есть куда медленно плыть.
      const cols = Math.ceil((box.clientWidth * 1.4) / CELL);
      const rows = Math.ceil(box.clientHeight / CELL) + 1;
      const request: WorldRequest = { id: ++requestId, seed, cols, rows, skyCols: Math.ceil(cols * 1.3) };
      worker.postMessage(request);
    }

    /** Ответ воркера: рисуем готовый мир и запускаем движение. */
    worker.onmessage = (event: MessageEvent<WorldResponse>) => {
      const world = event.data;
      if (world.id !== requestId || !box || !land || !sky || !landCtx) return;
      const { cols, rows, skyCols } = world;
      const width = box.clientWidth;
      anims.forEach((a) => a.cancel());
      anims = [];
      window.clearInterval(timer);
      // Земля — в разрешении экрана (dpr до 2): это её чёткие края.
      // Облака — в CSS-пикселях: они полупрозрачные, на ретине лишняя
      // чёткость им не нужна, а холст неба самый большой (~1.8 ширины экрана).
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      landData.width = cols;
      landData.height = rows;
      landData.getContext("2d")!.putImageData(new ImageData(world.land, cols, rows), 0, 0);
      land.width = cols * CELL * dpr;
      land.height = rows * CELL * dpr;
      land.style.width = `${cols * CELL}px`;
      land.style.height = `${rows * CELL}px`;
      blit(landData, landCtx);
      skyData.width = skyCols;
      skyData.height = rows;
      sky.width = skyCols * CELL;
      sky.height = rows * CELL;
      sky.style.width = `${skyCols * CELL}px`;
      sky.style.height = `${rows * CELL}px`;
      // ImageData берёт массив как есть, без копии: paintClouds правит
      // world.sky, а картинка видит правку.
      cloud = { img: world.sky, image: new ImageData(world.sky, skyCols, rows), appearAt: world.appearAt, done: world.done };
      paintSky();
      if (!reduce) timer = window.setInterval(paintSky, 100);
      drift(land, cols * CELL - width, 82000, 0.5);
      // Облака на 15% медленнее, чем было (28 с → 33 с), — по просьбе владельца.
      drift(sky, skyCols * CELL - width, 33000, 0.3);
    };

    build();

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
      worker.terminate();
      anims.forEach((a) => a.cancel());
      window.clearInterval(timer);
      window.clearTimeout(resizeTimer);
      observer.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [seed]);

  const layer = "absolute left-0 top-0 max-w-none will-change-transform";

  return (
    <>
      <div ref={boxRef} className="absolute inset-0 overflow-hidden" aria-hidden="true">
        <canvas ref={landRef} className={layer} />
        <canvas ref={skyRef} className={`${layer} opacity-55`} />
      </div>
      {hydrated && (
        <div className="absolute bottom-5 right-5 z-10 flex items-center gap-3 rounded-full border border-zinc-950/[0.06] bg-[#fbfbff]/80 py-1.5 pl-4 pr-1.5 text-sm text-zinc-950 backdrop-blur-xl dark:border-zinc-50/[0.08] dark:bg-zinc-950/80 dark:text-zinc-50">
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
