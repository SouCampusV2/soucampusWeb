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
  priority = false,
}: {
  images: string[];
  alt: string;
  priceLabel: string;
  /**
   * Грузить обложку сразу, без ожидания прокрутки.
   *
   * ⚠️ Ставится ТОЛЬКО первой карточке первого ряда витрины. С 07.09
   * каталог приходит уже в серверном HTML, и первая обложка стала
   * LCP-элементом страницы — а она была ленивой, то есть мы сами просили
   * браузер отложить ровно то, по чему нас меряют. Ровно та же ошибка,
   * что до этого нашлась у баннера заказа.
   *
   * ⚠️ И только ОДНОЙ. Пометить так весь ряд — значит отменить ленивую
   * загрузку для восьми картинок сразу: они начнут соревноваться за
   * канал с той единственной, которая и есть LCP, и сделают хуже.
   */
  priority?: boolean;
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
  // Кружок стрелки крупнее на тач-экране. Ровно там он и нужен: с lg
  // стрелки вообще спрятаны до наведения, то есть 32px — это размер
  // для мыши, которой промахнуться нечем, а на телефоне они видны
  // всегда и жмутся пальцем поверх фото.
  const arrowSize = "h-8 w-8 pointer-coarse:h-10 pointer-coarse:w-10";
  // Полупрозрачный тёмный кружок вместо акцентного: стрелки лежат ПОВЕРХ
  // фото, где оранжевый спорил бы с любым кадром. Тот же приём, что у
  // чипов на фотографиях (DESIGN.md) — без dark:-вариантов, читается
  // одинаково в обеих темах.
  const arrowColor = "bg-zinc-950/55 hover:bg-zinc-950/80 text-white backdrop-blur-sm";

  return (
    // pointer-events-none: сама картинка кликов не ловит — они проходят
    // насквозь на ссылку-оверлей карточки (см. ProductCard). Обратно
    // включены только стрелки.
    <div className="pointer-events-none relative aspect-video w-full overflow-hidden">
      <Image
        src={images[index]}
        alt={alt}
        fill
        sizes="(min-width: 640px) 20rem, 85vw"
        priority={priority}
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
            <ArrowCircle direction="left" className={arrowSize} colorClassName={arrowColor} />
          </button>
          <button
            type="button"
            aria-label="Next screenshot"
            onClick={(e) => step(e, 1)}
            className={buttonClasses}
          >
            <ArrowCircle direction="right" className={arrowSize} colorClassName={arrowColor} />
          </button>
        </div>
      )}

      {/* Точки-индикатор: сколько кадров всего и где мы сейчас. */}
      {many && (
        <div className="pointer-events-none absolute inset-x-0 bottom-2 z-10 flex justify-center gap-1.5">
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
