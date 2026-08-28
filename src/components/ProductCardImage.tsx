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
  below,
}: {
  images: string[];
  alt: string;
  priceLabel: string;
  /**
   * Подпись карточки — рисуется ПОД фотографией, на фоне-продолжении
   * текущего кадра. Приходит готовой разметкой из серверной ProductCard,
   * чтобы этот компонент оставался единственным клиентским куском
   * карточки.
   *
   * ⚠️ Почему подпись здесь, а не рядом в ProductCard: фон под ней —
   * тот самый скриншот, который открыт СЕЙЧАС, а какой открыт, знает
   * только этот компонент (index листалки живёт в нём). Собери блок
   * снаружи — и при листании фон отстал бы от картинки.
   */
  below?: React.ReactNode;
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
    <>
    {/* pointer-events-none: сама картинка кликов не ловит — они проходят
        насквозь на ссылку-оверлей карточки (см. ProductCard). Обратно
        включены только стрелки.

        ⚠️ ПРОПОРЦИЯ 16:9 — И ЭТО НЕ ВКУСОВОЕ РЕШЕНИЕ. Скриншоты из
        Minecraft приходят широкими; при вертикальной рамке object-cover
        отрезал у кадра бока и растягивал остаток — картинки заметно
        мылились. Пробовали 3:4 (28.08) и вернули в тот же день: рамка
        обязана повторять пропорцию исходника, иначе качество платит за
        раскладку. */}
    <div className="pointer-events-none relative aspect-video w-full overflow-hidden">
      <Image
        src={images[index]}
        alt={alt}
        fill
        // ⚠️ sizes описывает РЕАЛЬНУЮ ширину карточки на каждой
        // раскладке — по нему Next выбирает, какой файл отдать. Пока
        // здесь стояло «20rem на всё, что шире 640», карточка в четыре
        // колонки на широком экране получала картинку уже, чем сама, и
        // браузер растягивал её вверх. Это вторая причина замыленных
        // скриншотов, помимо обрезки.
        sizes="(min-width: 1280px) 22rem, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
        // quality выше стандартных 75: на карточке видно сетку блоков,
        // и артефакты сжатия на ней читаются как грязь, а не как мягкость.
        quality={85}
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

    {/* ПОДПИСЬ ПОД ФОТО, НА ФОНЕ-ПРОДОЛЖЕНИИ КАДРА (2026-08-28, третий
        заход; первые два — панель поверх фото и вертикальная карточка —
        отвергнуты владельцем).

        Идея: текст стоит там же, где всегда, но фон под ним — тот же
        скриншот, растянутый и размытый до неузнаваемости. Остаётся один
        цвет кадра, поэтому граница «фото кончилось» не читается линией:
        снизу картинка как бы растворяется в подписи.

        Три слоя, и порядок важен:

        1) КАРТИНКА, `object-bottom` + `scale-150`. Берём именно НИЗ
           кадра: он и соприкасается с подписью, и его цвет обязан
           продолжиться. Возьми мы центр — под стыком оказался бы чужой
           цвет, и переход стал бы заметнее, а не мягче.
        2) БЛЮР. Крупный (`blur-2xl`): нужен цвет, а не картинка. Любая
           узнаваемая деталь под текстом читалась бы как грязь.
        3) СЛОЙ ЦВЕТА СТРАНИЦЫ поверх. Он возвращает подписи наш обычный
           фон и держит контраст текста: без него тёмный текст на
           случайном скриншоте — лотерея. Прозрачность подобрана так,
           чтобы оттенок кадра проступал, но не спорил с буквами.

        ⚠️ aria-hidden и пустой alt: это ФОН, а не изображение. Скринридер
        уже прочитал ту же картинку выше — второй раз ему её называть
        незачем. */}
    {below && (
      // flex-1 + flex-col: блок обязан тянуться на всю оставшуюся высоту
      // карточки, иначе mt-auto у строки с рейтингом внутри него не
      // работает и у карточек с описанием разной длины эта строка
      // перестаёт выравниваться по одной линии.
      <div className="relative flex flex-1 flex-col">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <Image
            src={images[index]}
            alt=""
            aria-hidden
            fill
            sizes="(min-width: 1280px) 22rem, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw"
            // Фон размывается в кашу, детали не нужны — незачем и
            // качество: тяжёлый файл ради пятна цвета.
            quality={20}
            className="scale-150 object-cover object-bottom blur-2xl"
          />
          <div className="absolute inset-0 bg-[#fbfbff]/82 dark:bg-zinc-950/85" />
        </div>

        <div className="relative flex flex-1 flex-col">{below}</div>
      </div>
    )}
    </>
  );
}
