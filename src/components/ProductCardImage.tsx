"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowCircle } from "@/components/ArrowCircle";

// Фото-область карточки товара со стрелками-листалкой: не уходя с витрины,
// можно посмотреть пару скринов карты, а не только обложку (как на
// BuiltByBit). Вынесено отдельным клиентским компонентом, чтобы сама
// ProductCard осталась серверной — интерактивен здесь только этот кусок.
//
// Стрелки появляются при наведении на карточку (group-hover от родителя) и
// всегда видимы на тач-устройствах, где наведения нет вовсе. Если скрин
// один — стрелок и точек нет: листать нечего.
//
// z-20 у элементов управления: вся карточка накрыта ссылкой-оверлеем
// (см. ProductCard), и без этого клик по стрелке уходил бы на страницу
// товара. preventDefault/stopPropagation — та же страховка на случай
// всплытия.
export function ProductCardImage({
  images,
  alt,
  priceLabel,
  overlay,
}: {
  images: string[];
  alt: string;
  priceLabel: string;
  /**
   * Подпись поверх нижнего края фото (название карты и автор) — приходит
   * готовой разметкой из серверной ProductCard, чтобы этот компонент
   * оставался единственным клиентским куском карточки.
   */
  overlay?: React.ReactNode;
}) {
  const [index, setIndex] = useState(0);
  const many = images.length > 1;

  const step = (e: React.MouseEvent, direction: 1 | -1) => {
    e.preventDefault();
    e.stopPropagation();
    // Кольцевой переход: с последнего кадра вперёд — снова на первый.
    setIndex((i) => (i + direction + images.length) % images.length);
  };

  // По умолчанию стрелки видны (мобильный/планшет — наведения там нет),
  // и только с lg они прячутся до hover, чтобы не спорить с фото.
  const buttonClasses =
    "pointer-events-auto z-20 transition-opacity focus-visible:opacity-100 lg:opacity-0 lg:group-hover:opacity-100";
  // Полупрозрачный тёмный кружок вместо акцентного: стрелки лежат ПОВЕРХ
  // фото, где оранжевый спорил бы с любым кадром. Тот же приём, что у
  // чипов на фотографиях (DESIGN.md) — без dark:-вариантов, читается
  // одинаково в обеих темах.
  const arrowColor = "bg-zinc-950/55 hover:bg-zinc-950/80 text-white backdrop-blur-sm";

  return (
    // pointer-events-none: сама картинка кликов не ловит — они проходят
    // насквозь на ссылку-оверлей карточки (см. ProductCard). Обратно
    // включены только стрелки.
    // ⚠️ Пропорция 3:4, а не 16:9 (2026-08-28). Карточка теперь ЦЕЛИКОМ
    // фотография — подпись переехала на неё стеклянной панелью, белого
    // блока под фото больше нет. На широком кадре панель съедала бы
    // половину картинки; вертикальный кадр даёт ей место и оставляет
    // карту видимой.
    <div className="pointer-events-none relative aspect-[3/4] w-full overflow-hidden">
      <Image
        src={images[index]}
        alt={alt}
        fill
        sizes="(min-width: 640px) 20rem, 85vw"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />

      {many && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-between px-2">
          <button
            type="button"
            aria-label="Previous screenshot"
            onClick={(e) => step(e, -1)}
            className={buttonClasses}
          >
            <ArrowCircle direction="left" className="h-8 w-8" colorClassName={arrowColor} />
          </button>
          <button
            type="button"
            aria-label="Next screenshot"
            onClick={(e) => step(e, 1)}
            className={buttonClasses}
          >
            <ArrowCircle direction="right" className="h-8 w-8" colorClassName={arrowColor} />
          </button>
        </div>
      )}

      {/* Фейд под подписью. Градиент, а не плашка: у карточек кадры
          разные, и сплошная полоса резала бы фото линией, а фейд
          растворяется в нём. Тянется на 60% высоты — на меньшем куске
          светлый скриншот пробивался бы сквозь текст.

          Рисуется ТОЛЬКО когда есть что подписывать: без overlay это был
          бы тёмный край фотографии ни за чем. */}
      {overlay && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-3/5 bg-gradient-to-t from-zinc-950/90 via-zinc-950/55 to-transparent" />
      )}

      {/* Сама подпись. pointer-events-none у контейнера — клики уходят на
          ссылку-оверлей карточки; своё действие включает обратно только
          ссылка автора (см. ProductCard). */}
      {overlay && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-2.5">
          {overlay}
        </div>
      )}

      {/* Точки-индикатор: сколько кадров всего и где мы сейчас.
          ⚠️ Переехали ВВЕРХ, когда низ фото занял текст (2026-08-28):
          снизу они попадали ровно под название. По центру — цена стоит в
          правом верхнем углу, они с ней не спорят. */}
      {many && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center gap-1.5">
          {images.map((src, i) => (
            <span
              key={src}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-4 bg-white" : "w-1.5 bg-white/50"
              }`}
            />
          ))}
        </div>
      )}

      {/* Цена — чип поверх фото, как теги портфолио: без dark:-вариантов,
          по DESIGN.md чипы на фото читаются одинаково в обеих темах. */}
      <span className="absolute right-3 top-3 z-10 rounded-full bg-[#fbfbff]/90 px-3 py-1 text-xs font-semibold text-zinc-950 backdrop-blur-sm">
        {priceLabel}
      </span>
    </div>
  );
}
