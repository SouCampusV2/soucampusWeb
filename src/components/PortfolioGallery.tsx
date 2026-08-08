"use client";

import { useState } from "react";
import Image from "next/image";
import { Lightbox } from "@/components/Lightbox";

// Фотографии работы на /portfolio/[slug]: главный кадр + сетка остальных,
// любой открывается во весь экран с листанием (общий Lightbox).
//
// Вёрстка ровно та же, что была прямо в page.tsx, — вынос сюда нужен
// только потому, что разворот требует состояния, а страница серверная.
// Клиентским стал один этот блок, а не вся страница: заголовок, таблица
// параметров и описание по-прежнему рендерятся на сервере.
//
// Листается ВСЁ вместе, включая обложку: для посетителя это просто фото
// одной постройки, и «первая» ничем не отличается от остальных.
export function PortfolioGallery({
  image,
  gallery,
  title,
}: {
  image: string;
  gallery?: string[];
  title: string;
}) {
  const [openAt, setOpenAt] = useState<number | null>(null);

  // Обложка первой, дальше галерея. Дубли отбрасываем: у части работ
  // обложка продублирована в gallery, и без этого она открывалась бы
  // дважды подряд.
  const images = [image, ...(gallery ?? []).filter((src) => src !== image)];

  return (
    <>
      <div className="relative mt-10 aspect-video overflow-hidden rounded-2xl">
        <Image
          src={image}
          alt={title}
          fill
          sizes="(min-width: 1024px) 768px, 100vw"
          className="cursor-zoom-in object-cover"
          priority
          onClick={() => setOpenAt(0)}
        />
      </div>

      {images.length > 1 && (
        <div className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-4">
          {images.slice(1).map((src, i) => (
            <div
              key={src}
              className="relative aspect-video overflow-hidden rounded-2xl"
            >
              <Image
                src={src}
                alt={`${title} — photo ${i + 2}`}
                fill
                sizes="(min-width: 1024px) 384px, (min-width: 640px) 50vw, 100vw"
                className="cursor-zoom-in object-cover"
                // +1: нулевой кадр — обложка выше, сетка начинается с первого.
                onClick={() => setOpenAt(i + 1)}
              />
            </div>
          ))}
        </div>
      )}

      <Lightbox images={images} title={title} index={openAt} onChange={setOpenAt} />
    </>
  );
}
