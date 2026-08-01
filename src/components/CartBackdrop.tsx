"use client";

// ЭКСПЕРИМЕНТ (2026-08-01, только /cart). Живой фон под стеклянными
// карточками + SVG-фильтр преломления для них же.
//
// Зачем фон вообще: стекло видно ровно настолько, насколько интересно то,
// что за ним. На однотонной подложке самый честный Liquid Glass выглядит
// серым прямоугольником — размывать нечего. Поэтому под карточками ездят
// три пятна нашими акцентами (оранжевый / лаймовый / синий), медленно и
// вразнобой, чтобы размытие всё время показывало разное.
//
// Почему keyframes живут прямо здесь, а не в globals.css: это опыт на
// одной странице. Пока не решено, остаётся ли он, весь эффект должен
// удаляться одним файлом, не оставляя мусора в глобальных стилях.
//
// Если решим оставить — keyframes переезжают в globals.css, имена классов
// теряют префикс cb-, а этот комментарий заменяется записью в DESIGN.md.

/** Сила преломления в SVG-фильтре. 0 — выключить, 30-60 — заметно,
 *  выше 80 картинка начинает «плыть» и читаться как дефект. */
const REFRACTION_SCALE = 42;

export function CartBackdrop() {
  return (
    <>
      {/* Фильтр преломления. Работает как backdrop-filter: url(#…) —
          см. GlassCard. Turbulence даёт плавный шум, displacement сдвигает
          по нему пиксели ФОНА, отчего края карточки «затягивают» то, что
          за ними, как капля воды. Чистого CSS-аналога у этого нет.

          Внимание: backdrop-filter с url() — это Chromium. В Safari и
          Firefox фильтр молча игнорируется, остаётся обычное размытие.
          Именно поэтому карточка обязана хорошо выглядеть и без него. */}
      <svg aria-hidden className="pointer-events-none absolute h-0 w-0">
        <filter id="liquid-glass" colorInterpolationFilters="sRGB">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.006 0.009"
            numOctaves="2"
            seed="7"
            result="noise"
          />
          <feGaussianBlur in="noise" stdDeviation="3" result="soft" />
          <feDisplacementMap
            in="SourceGraphic"
            in2="soft"
            scale={REFRACTION_SCALE}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </svg>

      {/* Сам фон. fixed, а не absolute: карточки прокручиваются, пятна
          стоят — стекло всё время показывает новый кусок фона, что и есть
          главный признак «живого» стекла. -z-10 держит его под контентом,
          pointer-events-none — чтобы не перехватывал клики. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="cb-blob cb-blob-1" />
        <div className="cb-blob cb-blob-2" />
        <div className="cb-blob cb-blob-3" />
      </div>

      <style>{`
        .cb-blob {
          position: absolute;
          border-radius: 9999px;
          /* Пятно размывается САМО, заранее и один раз, а не пересчитывается
             каждый кадр как backdrop-filter. Поэтому анимация трансформом
             остаётся дешёвой: браузер двигает готовую текстуру. */
          filter: blur(90px);
          opacity: 0.55;
          will-change: transform;
        }
        .cb-blob-1 {
          top: -12%;
          left: -8%;
          width: 48rem;
          height: 40rem;
          background: radial-gradient(circle, rgba(249,115,22,0.85), transparent 62%);
          animation: cb-drift-1 34s ease-in-out infinite alternate;
        }
        .cb-blob-2 {
          top: 22%;
          right: -14%;
          width: 42rem;
          height: 42rem;
          background: radial-gradient(circle, rgba(132,204,22,0.55), transparent 62%);
          animation: cb-drift-2 44s ease-in-out infinite alternate;
        }
        .cb-blob-3 {
          bottom: -22%;
          left: 26%;
          width: 46rem;
          height: 36rem;
          background: radial-gradient(circle, rgba(59,130,246,0.5), transparent 62%);
          animation: cb-drift-3 38s ease-in-out infinite alternate;
        }
        /* Тёмная тема: те же пятна заметно тише — на чёрном фоне цвет
           набирает силу, и на светлой яркости страница превращается в
           дискотеку. */
        :where(.dark) .cb-blob { opacity: 0.32; }

        @keyframes cb-drift-1 {
          from { transform: translate3d(0, 0, 0) scale(1); }
          to   { transform: translate3d(14vw, 8vh, 0) scale(1.18); }
        }
        @keyframes cb-drift-2 {
          from { transform: translate3d(0, 0, 0) scale(1.1); }
          to   { transform: translate3d(-12vw, 14vh, 0) scale(0.92); }
        }
        @keyframes cb-drift-3 {
          from { transform: translate3d(0, 0, 0) scale(0.95); }
          to   { transform: translate3d(10vw, -12vh, 0) scale(1.15); }
        }

        /* Уважаем системную настройку «меньше движения»: пятна остаются,
           цвет и стекло никуда не деваются — замирает только дрейф. */
        @media (prefers-reduced-motion: reduce) {
          .cb-blob { animation: none; }
        }
      `}</style>
    </>
  );
}
