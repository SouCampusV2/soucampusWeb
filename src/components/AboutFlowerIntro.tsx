"use client";

import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Unbounded } from "next/font/google";

// Первая секция /about с 15.11 (бренд, docs/BRAND-IDEAS.md, раздел 2):
// слева — кто я, справа — большой цветок SouCampus, который растёт и
// чуть поворачивается, пока страницу прокручивают. Заменила AuthorCta
// («зелёное яблоко на пол-экрана» — не нравилось владельцу).
//
// Как устроено:
//   · секция выше экрана (md:min-h-[150svh]), обе колонки прилипают
//     (sticky): текст и цветок стоят, цветок растёт, потом оба уходят.
//     Прилипал бы только цветок — короткий текст уехал бы, и цветок
//     полэкрана рос бы рядом с пустотой;
//   · рост — Motion useScroll по самой секции: 0 — верх секции у верха
//     экрана, 1 — низ секции ушёл наверх. Масштаб и поворот — функции этого
//     числа (useTransform), React при прокрутке не перерисовывается;
//   · ⚠️ цветок в разметке САМОГО БОЛЬШОГО размера, а уменьшен
//     трансформацией (FLOWER.from < 1). Наоборот (маленький, растянутый
//     scale > 1) браузер растягивает уже готовую картинку слоя, и края
//     SVG мылятся. Так края чёткие на любом шаге;
//   · prefers-reduced-motion — цветок стоит в среднем размере, не
//     двигается; на телефоне он над текстом и без прилипания.
//
// Ручки для экспериментов (цвет, размер, ход) — FLOWER ниже. Цвет — файл
// знака из public/brand/smooth/transparent/: neutral (оранжевый), light
// (кремовый), dark (почти чёрный).

const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

const FLOWER = {
  src: "/brand/smooth/transparent/flower-neutral.svg",
  from: 0.46, // масштаб в начале секции (от полного размера)
  to: 1, // в конце — полный размер
  turn: 15, // поворот за всю прокрутку, градусов
};

export function AboutFlowerIntro() {
  const sectionRef = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [FLOWER.from, FLOWER.to]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, FLOWER.turn]);
  const still = (FLOWER.from + FLOWER.to) / 2;

  return (
    <section
      ref={sectionRef}
      className="grid gap-10 pt-28 sm:pt-32 md:min-h-[150svh] md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:gap-16"
    >
      {/* Цветок первым в разметке — на телефоне он над текстом; на
          десктопе колонки меняются местами через order. */}
      <div className="md:order-2">
        <div className="md:sticky md:top-24 flex justify-center">
          {/* aria-hidden: знак — украшение, рядом с текстом про меня он
              ничего не сообщает; имя студии и так в шапке. */}
          <motion.img
            src={FLOWER.src}
            alt=""
            aria-hidden="true"
            width={512}
            height={512}
            style={reduce ? { scale: still } : { scale, rotate }}
            className="aspect-square w-72 max-w-full will-change-transform sm:w-96 md:w-full md:max-w-[34rem]"
          />
        </div>
      </div>

      <div className="md:order-1 md:sticky md:top-24 md:self-start md:pt-[12svh]">
        <span className="text-sm font-semibold text-lime-600">About me</span>
        <h2
          className={`${displayFont.className} mt-3 text-4xl leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
        >
          Hi! My name is Eugene c:
        </h2>
        <p className="mt-6 max-w-md text-lg leading-8 text-zinc-700 dark:text-zinc-300">
          8 years building worlds in Minecraft professionally. My goal is to
          turn every idea into a map worth exploring.
        </p>
      </div>
    </section>
  );
}
