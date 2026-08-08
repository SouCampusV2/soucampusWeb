"use client";

import { useState } from "react";
import { Lightbox } from "@/components/Lightbox";

// Галерея заявки в админке: лента миниатюр + разворот на весь экран.
//
// Миниатюры 192×112 — это ровно та величина, на которой не видно ни
// растянутого скрина, ни чужого водяного знака, ни случайно попавшего в
// кадр чата. Решение «пускать карту в магазин» принимается по картинкам,
// поэтому картинки обязаны открываться в полный размер.
//
// Сам разворот — общий Lightbox (он же на странице товара и в
// портфолио). Отдельной остаётся только лента: здесь все кадры равны и
// важен быстрый проход подряд, а на витрине — крупная обложка с лентой
// под ней.
export function ModerationGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [openAt, setOpenAt] = useState<number | null>(null);

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

      {/* markCover — только здесь: модератору важно, какой кадр станет
          обложкой на витрине, покупателю это ничего не говорит. */}
      <Lightbox
        images={images}
        title={title}
        index={openAt}
        onChange={setOpenAt}
        markCover
      />
    </>
  );
}
