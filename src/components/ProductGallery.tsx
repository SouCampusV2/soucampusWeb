"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { ArrowCircle } from "@/components/ArrowCircle";

// Галерея товара: большой кадр + лента миниатюр под ним, как на витринах
// ассетов (образец — скриншот от владельца 2026-07-27). Обложка всегда
// первая, дальше скрины из product_images по их position.
//
// Если картинка одна — рисуем просто фото без ленты и стрелок: пустая
// панель управления под единственным кадром выглядела бы как поломка.
export function ProductGallery({
  images,
  title,
}: {
  images: string[];
  title: string;
}) {
  const [index, setIndex] = useState(0);
  const stripRef = useRef<HTMLDivElement>(null);
  const many = images.length > 1;

  // Кольцевой переход + подтягивание выбранной миниатюры в видимую часть
  // ленты: иначе на длинной галерее активная миниатюра уезжает за край и
  // непонятно, где ты находишься.
  const select = (next: number) => {
    const normalized = (next + images.length) % images.length;
    setIndex(normalized);
    stripRef.current?.children[normalized]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "nearest",
    });
  };

  // Кнопка — только позиционирование; сам кружок со стрелкой рисует
  // ArrowCircle (DESIGN.md: стрелку не пересобирать в новом месте).
  // Цвет — полупрозрачный тёмный, как у чипов поверх фото: акцентный
  // оранжевый спорил бы с кадром.
  const buttonClasses = "absolute top-1/2 z-10 -translate-y-1/2";
  const arrowColor = "bg-zinc-950/55 hover:bg-zinc-950/80 text-white backdrop-blur-sm";

  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-2xl">
        <Image
          src={images[index]}
          alt={
            index === 0 ? title : `${title} — screenshot ${index + 1}`
          }
          fill
          sizes="(min-width: 1024px) 640px, 100vw"
          className="object-cover"
          // priority только у первого кадра: это LCP-картинка страницы.
          // Остальные грузятся обычным порядком, когда до них дойдёт.
          priority={index === 0}
        />

        {many && (
          <>
            <button
              type="button"
              aria-label="Previous screenshot"
              onClick={() => select(index - 1)}
              className={`${buttonClasses} left-3`}
            >
              <ArrowCircle direction="left" className="h-10 w-10" colorClassName={arrowColor} />
            </button>
            <button
              type="button"
              aria-label="Next screenshot"
              onClick={() => select(index + 1)}
              className={`${buttonClasses} right-3`}
            >
              <ArrowCircle direction="right" className="h-10 w-10" colorClassName={arrowColor} />
            </button>
          </>
        )}
      </div>

      {/* Лента миниатюр. Полоса прокрутки скрыта — листается свайпом или
          теми же стрелками сверху, как в остальных каруселях сайта. */}
      {many && (
        <div
          ref={stripRef}
          className="mt-3 flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => select(i)}
              aria-label={`Show screenshot ${i + 1}`}
              aria-current={i === index}
              className={`relative aspect-video w-28 shrink-0 overflow-hidden rounded-lg border-2 transition-colors sm:w-32 ${
                i === index
                  ? "border-orange-500 dark:border-orange-400"
                  : "border-transparent hover:border-zinc-300 dark:hover:border-zinc-700"
              }`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="8rem"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
