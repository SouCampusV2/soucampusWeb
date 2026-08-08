"use client";

import { useCallback, useEffect } from "react";
import { X } from "@phosphor-icons/react";
import { ArrowCircle } from "@/components/ArrowCircle";

// Просмотр картинки во весь экран с листанием — ОДИН на весь сайт.
//
// Появился в админке модерации (31.07): решение «пускать карту в
// магазин» принимается по скриншотам, а на миниатюре 192×112 не видно ни
// растянутого кадра, ни чужого водяного знака. Потом выяснилось, что
// покупателю рассмотреть скрины ровно так же нужно — а он не мог, хотя
// модератор мог. Перекос наоборот тому, как надо: платит-то покупатель.
//
// Поэтому разворот вынесен сюда, а галереи остались разными. Они и
// должны быть разными: ProductGallery — витрина (крупный кадр, лента под
// ним, next/image с sizes под известную вёрстку), ModerationGallery —
// инструмент проверки (все кадры равны, важно быстро пройти подряд),
// портфолио — сетка работ. Общее у них только одно: что происходит ПОСЛЕ
// клика. Оно и переиспользуется.
//
// Компонент управляемый (index приходит снаружи), а не сам себе хозяин:
// открывающая галерея всё равно знает, по какой картинке кликнули, и
// дублировать это состояние внутри значило бы синхронизировать две
// правды.

export function Lightbox({
  images,
  title,
  index,
  onChange,
  /** Помечать первый кадр как обложку — нужно модератору, покупателю нет. */
  markCover = false,
}: {
  images: string[];
  title: string;
  /** null — закрыт. Индекс, а не булево: надо знать, с какого кадра листать. */
  index: number | null;
  onChange: (next: number | null) => void;
  markCover?: boolean;
}) {
  const step = useCallback(
    (delta: number) =>
      onChange(
        index === null ? null : (index + delta + images.length) % images.length
      ),
    [index, images.length, onChange]
  );

  const open = index !== null;

  useEffect(() => {
    if (!open) return;

    // Клавиатура: Esc закрывает, стрелки листают. Когда кадров десяток,
    // мышью это заметно дольше.
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onChange(null);
      if (event.key === "ArrowLeft") step(-1);
      if (event.key === "ArrowRight") step(1);
    }

    window.addEventListener("keydown", onKey);
    // Фон не прокручиваем: под развёрнутым кадром страница уезжала бы
    // колесом, и, закрыв разворот, человек оказывался бы не там, где был.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, step, onChange]);

  if (index === null) return null;

  const many = images.length > 1;
  const arrowColor = "bg-zinc-950/55 hover:bg-zinc-950/80 text-white backdrop-blur-sm";

  return (
    // Клик по фону закрывает — привычнее, чем целиться в крестик. Клик по
    // самому кадру внутрь не проваливается (stopPropagation), иначе
    // разворот схлопывался бы от попытки рассмотреть картинку.
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} — screenshot ${index + 1} of ${images.length}`}
      onClick={() => onChange(null)}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/90 p-4 backdrop-blur-sm"
    >
      <button
        type="button"
        onClick={() => onChange(null)}
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

      {/* Обычный <img>, а не next/image: размер кадра здесь зависит от
          окна и от пропорций самой картинки, то есть заранее неизвестен —
          а sizes у next/image нужно знать до рендера. Оптимизированную
          версию человек к этому моменту уже видел в галерее; разворот
          показывает оригинал, для того его и открывают. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={images[index]}
        alt={index === 0 ? title : `${title} — screenshot ${index + 1}`}
        onClick={(e) => e.stopPropagation()}
        className="max-h-full max-w-full rounded-2xl object-contain"
      />

      <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-zinc-950/60 px-3 py-1 text-xs font-medium text-white">
        {index + 1} / {images.length}
        {markCover && index === 0 && " · cover"}
      </span>
    </div>
  );
}
