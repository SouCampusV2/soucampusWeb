"use client";

import Image from "next/image";
import { motion, useReducedMotion, useScroll, useTransform, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState } from "react";

// Карточка «стопки» (taste-skill §5.A).
//
// Все карточки липнут к верху в одном родителе, поэтому каждая следующая
// наезжает на предыдущую сама, CSS-ом. JS отвечает только за одно:
// уезжающая карточка уменьшается до 0.92 и тускнеет до 0.55, пока новая
// её накрывает. Прогресс берётся от ЕЁ собственного места в потоке:
// «верх карточки у верха экрана» → «низ карточки у верха экрана» — ровно
// то время, за которое следующая поднимается на экран.
export function StackCard({ children, last }: { children: React.ReactNode; last: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.92]);
  const opacity = useTransform(scrollYProgress, [0, 1], [1, 0.55]);
  const still = last || reduce;

  return (
    <div ref={ref} className="sticky top-0 flex h-[100dvh] items-center px-3 py-6 md:px-5">
      <motion.div
        style={still ? undefined : { scale, opacity }}
        className="h-full w-full origin-top will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
}

// Картинка hero: три постройки сменяют друг друга раз в пять секунд.
// При «меньше движения» стоит первая и не меняется.
export function HeroCycle({ images }: { images: { src: string; alt: string }[] }) {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduce || images.length < 2) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % images.length), 5000);
    return () => window.clearInterval(id);
  }, [reduce, images.length]);

  const current = images[index];
  if (!current) return null;

  return (
    <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl bg-[var(--card)] md:aspect-auto md:h-[min(72dvh,680px)]">
      <AnimatePresence initial={false}>
        <motion.div
          key={current.src}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
        >
          <Image src={current.src} alt={current.alt} fill priority={index === 0} sizes="(min-width: 768px) 45vw, 100vw" className="object-cover" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
