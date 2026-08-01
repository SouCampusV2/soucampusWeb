"use client";

import { useRef } from "react";

// ЭКСПЕРИМЕНТ (2026-08-01, только /cart). Стеклянная карточка — попытка
// подойти к Liquid Glass из iOS средствами браузера.
//
// Что настоящее стекло делает и что из этого нам доступно:
//
//   1. Размывает и подцвечивает фон  → backdrop-filter: blur + saturate.
//      Есть везде, стоит недорого. Это база, она у нас была и раньше.
//   2. Светится по кромке            → inset-тени, светлая сверху и
//      тёмная снизу. Дешёвая подделка объёма: глаз читает верхнюю светлую
//      линию как «толщина стекла, поймавшая свет сверху».
//   3. Ловит блик под углом          → у Apple это гироскоп. На десктопе
//      наклона нет, поэтому источником света считаем курсор: пятно света
//      едет за ним (--gx/--gy ниже).
//   4. ПРЕЛОМЛЯЕТ фон у краёв        → вот этого в CSS нет вовсе.
//      Подделывается SVG-фильтром (см. CartBackdrop) и работает только в
//      Chromium. Поэтому лежит за флагом: выключишь — останутся 1-3,
//      которые честно работают во всех браузерах.
//
// Позиция курсора кладётся в CSS-переменные ЧЕРЕЗ REF, а не через
// useState: mousemove сыплется десятками событий в секунду, и setState на
// каждом заставил бы React перерисовывать поддерево весь этот поток.
// Здесь же меняется одно свойство на одном узле, мимо React вообще.

/** Преломление (backdrop-filter: url(#liquid-glass)). Chromium — да,
 *  Safari/Firefox — молча проигнорируют и оставят обычное размытие.
 *  Выключить = убрать искажение, всё остальное стекло останется. */
export const REFRACTION_ENABLED = true;

const BASE =
  "relative overflow-hidden rounded-3xl border border-white/50 " +
  "bg-white/25 dark:bg-zinc-900/35 dark:border-white/10 " +
  // Внешняя тень даёт карточке оторваться от фона, две внутренние рисуют
  // толщину стекла: светлая по верхней кромке, приглушённая по нижней.
  "shadow-[0_8px_32px_rgba(9,9,11,0.10),inset_0_1px_0_rgba(255,255,255,0.65),inset_0_-1px_0_rgba(255,255,255,0.12)] " +
  "dark:shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.14),inset_0_-1px_0_rgba(255,255,255,0.04)]";

export function GlassCard({
  children,
  className = "",
  interactive = true,
}: {
  children: React.ReactNode;
  className?: string;
  /** Блик, едущий за курсором. Выключается там, где карточка мелкая и
   *  блик читается как случайное пятно. */
  interactive?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);

  function onPointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!interactive) return;
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    node.style.setProperty("--gx", `${((event.clientX - rect.left) / rect.width) * 100}%`);
    node.style.setProperty("--gy", `${((event.clientY - rect.top) / rect.height) * 100}%`);
  }

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      style={{
        // Размытие и насыщенность задаются здесь, а не классом: url() с
        // ссылкой на SVG-фильтр Tailwind статическим разбором не соберёт.
        // saturate — половина ощущения стекла: настоящее стекло цвет за
        // собой усиливает, а не только размывает.
        backdropFilter: REFRACTION_ENABLED
          ? "blur(16px) saturate(180%) url(#liquid-glass)"
          : "blur(16px) saturate(180%)",
        WebkitBackdropFilter: "blur(16px) saturate(180%)",
      }}
      className={`group/glass ${BASE} ${className}`}
    >
      {/* Блик под курсором. Появляется только при наведении, иначе на
          статичной странице выглядит как забытое светлое пятно. */}
      {interactive && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/glass:opacity-100"
          style={{
            background:
              "radial-gradient(24rem 24rem at var(--gx,50%) var(--gy,0%), rgba(255,255,255,0.35), transparent 60%)",
          }}
        />
      )}

      {/* Наклонная полоса света по верхней кромке — то, что делает панель
          похожей на стекло, а не на матовый пластик. Держится на месте,
          в отличие от блика выше. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/40 to-transparent dark:from-white/10"
      />

      <div className="relative">{children}</div>
    </div>
  );
}
