"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";
import { ArrowCircle } from "@/components/ArrowCircle";

// Галерея заявки в админке: лента миниатюр + разворот на весь экран.
//
// Миниатюры 192×112 — это ровно та величина, на которой не видно ни
// растянутого скрина, ни чужого водяного знака, ни случайно попавшего в
// кадр чата. Решение «пускать карту в магазин» принимается по картинкам,
// поэтому картинки обязаны открываться в полный размер, и листаться
// прямо в развороте — иначе модератор закрывает и открывает по одной.
//
// Отдельный компонент от ProductGallery (страница товара) намеренно: там
// витрина (обложка крупно, лента под ней, next/image с sizes под
// известную вёрстку), здесь инструмент проверки (все кадры равны, важен
// быстрый просмотр всех подряд во весь экран). Общее у них — только
// стрелка, и она уже вынесена в ArrowCircle.
export function ModerationGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  // null — разворот закрыт. Индекс, а не булево: развернув, надо знать,
  // с какого кадра листать.
  const [openAt, setOpenAt] = useState<number | null>(null);

  const step = useCallback(
    (delta: number) =>
      setOpenAt((current) =>
        current === null
          ? null
          : (current + delta + images.length) % images.length
      ),
    [images.length]
  );

  // Клавиатура в развороте: Esc закрывает, стрелки листают. Модератор
  // проходит по десятку заявок подряд — мышью это заметно дольше.
  useEffect(() => {
    if (openAt === null) return;

    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenAt(null);
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    }

    window.addEventListener("keydown", onKey);
    // Фон не прокручиваем: под развёрнутым кадром страница уезжала бы
    // колесом, и, закрыв разворот, модератор оказывался бы не там, где был.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [openAt, step]);

  const many = images.length > 1;
  const arrowColor = "bg-zinc-950/55 hover:bg-zinc-950/80 text-white backdrop-blur-sm";

  return (
    <>
      <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
        {images.map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setOpenAt(i)}
            aria-label={`Open screenshot ${i + 1} full screen`}
            className="relative shrink-0 cursor-zoom-in"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" className="h-28 w-48 rounded-xl object-cover" />
            {i === 0 && (
              <span className="absolute bottom-1.5 left-1.5 rounded-full bg-orange-500 px-2 py-0.5 text-[11px] font-medium text-zinc-950">
                Cover
              </span>
            )}
          </button>
        ))}
      </div>

      {openAt !== null && (
        // Клик по фону закрывает — привычнее, чем целиться в крестик.
        // Клик по самому кадру внутрь не проваливается (stopPropagation),
        // иначе разворот схлопывался бы от попытки рассмотреть картинку.
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — screenshot ${openAt + 1} of ${images.length}`}
          onClick={() => setOpenAt(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 p-4 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setOpenAt(null)}
            aria-label="Close"
            className="absolute right-4 top-4 cursor-pointer rounded-full bg-zinc-950/55 p-2 text-white transition-colors hover:bg-zinc-950/80"
          >
            <X size={20} weight="bold" />
          </button>

          {many && (
            <>
              <button
                type="button"
                aria-label="Previous screenshot"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="absolute left-4 top-1/2 -translate-y-1/2"
              >
                <ArrowCircle direction="left" className="h-12 w-12" colorClassName={arrowColor} />
              </button>
              <button
                type="button"
                aria-label="Next screenshot"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2"
              >
                <ArrowCircle direction="right" className="h-12 w-12" colorClassName={arrowColor} />
              </button>
            </>
          )}

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[openAt]}
            alt={openAt === 0 ? title : `${title} — screenshot ${openAt + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-full max-w-full rounded-2xl object-contain"
          />

          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-zinc-950/60 px-3 py-1 text-xs font-medium text-white">
            {openAt + 1} / {images.length}
            {openAt === 0 && " · cover"}
          </span>
        </div>
      )}
    </>
  );
}
