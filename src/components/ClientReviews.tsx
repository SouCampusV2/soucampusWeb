"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { Flag } from "@/components/Flag";
import type { Review } from "@/lib/reviews";

type Accent = Review["accent"];

// Only two card accents (orange/lime) — the CTA button stays orange either
// way (primary color per DESIGN.md), the accent only tints the card itself.
const ACCENT_CARD: Record<Accent, string> = {
  orange: "bg-orange-100 text-zinc-950 dark:bg-orange-950 dark:text-zinc-50",
  lime: "bg-lime-100 text-zinc-950 dark:bg-lime-950 dark:text-zinc-50",
};

// Card width used to be a fixed 340px, always — on a 375px phone that's
// almost the entire screen with no room to peek the next card, and the
// carousel's arrows were hidden below `sm:` besides, so mobile had no way
// to reach cards past the first (see RESPONSIVE_PLAN.md). Card width is now
// responsive via CSS (`w-[78vw] sm:w-[340px]`), so `cardWidth` below is
// *measured* from the actual rendered card rather than assumed — the
// spring-animated `x` offset needs the real pixel width to land each card
// in the same place the CSS put it, at any viewport size.
const CARD_GAP = 24;
const DEFAULT_CARD_WIDTH = 340;

// Same accent color as the card, underlined text link (secondary Button
// styling) — эксперимент "кнопка того же акцента, что и карточка" вместо
// обычного "кнопки всегда orange" из DESIGN.md, был здесь ещё до того, как
// у ссылки "Read story" появилась настоящая цель.
// Схема кнопок сайта: светлая 500/600, тёмная 400/500 (см. Button.tsx).
// Lime — сознательное исключение в СВЕТЛОЙ теме: это текст-ссылка, а не
// заливка, и lime-500 на почти белом фоне даёт контраст 1.9 при пороге
// 4.5 — надпись просто не читается. Поэтому светлая половина сдвинута на
// шаг вниз (600/700), тёмная идёт по общему правилу.
const ACCENT_BUTTON: Record<Accent, string> = {
  orange:
    "text-orange-500 underline decoration-2 underline-offset-4 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-500",
  lime: "text-lime-600 underline decoration-2 underline-offset-4 hover:text-lime-700 dark:text-lime-400 dark:hover:text-lime-500",
};

// Отзывы приходят пропсом, а не импортом массива: компонент клиентский
// ("use client"), в базу ходит серверная страница app/(site)/page.tsx и
// передаёт сюда готовый список.
export function ClientReviews({ reviews }: { reviews: Review[] }) {
  const [index, setIndex] = useState(0);
  const [cardWidth, setCardWidth] = useState(DEFAULT_CARD_WIDTH);
  const [visible, setVisible] = useState(3);
  const firstCardRef = useRef<HTMLQuoteElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function measure() {
      const card = firstCardRef.current;
      const track = trackRef.current;
      if (!card || !track) return;
      const width = card.getBoundingClientRect().width;
      setCardWidth(width);
      setVisible(Math.max(1, Math.round(track.clientWidth / (width + CARD_GAP))));
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const step = cardWidth + CARD_GAP;
  const maxIndex = Math.max(0, reviews.length - visible);

  return (
    <section id="reviews" className="scroll-mt-24 bg-[#fbfbff] py-16 dark:bg-zinc-950 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-end justify-between gap-6">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl"
          >
            Hear from clients working with me
          </motion.h2>

          <div className="flex shrink-0 gap-3">
            <ArrowButton
              direction="left"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
            />
            <ArrowButton
              direction="right"
              onClick={() => setIndex((i) => Math.min(maxIndex, i + 1))}
              disabled={index === maxIndex}
            />
          </div>
        </div>
      </div>

      <div className="mt-12 overflow-hidden">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            ref={trackRef}
            className="flex cursor-grab gap-6 active:cursor-grabbing"
            drag="x"
            dragConstraints={{ left: -maxIndex * step, right: 0 }}
            dragElastic={0.15}
            onDragEnd={(_, info) => {
              const threshold = step / 3;
              if (info.offset.x < -threshold) setIndex((i) => Math.min(maxIndex, i + 1));
              else if (info.offset.x > threshold) setIndex((i) => Math.max(0, i - 1));
            }}
            animate={{ x: -index * step }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            {reviews.map((review, i) => (
              <blockquote
                key={review.name}
                ref={i === 0 ? firstCardRef : undefined}
                className={`flex w-[78vw] shrink-0 flex-col justify-between rounded-3xl p-6 sm:w-[340px] ${
                  i % 2 === 1 ? "sm:mt-8" : ""
                } ${ACCENT_CARD[review.accent]}`}
              >
                <div>
                  {/* TODO: replace with real client photo */}
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full">
                    <Skeleton className="h-full w-full" />
                  </div>

                  <p className="mt-6 text-base font-medium leading-6 text-zinc-950 dark:text-zinc-50">
                    &ldquo;{review.text}&rdquo;
                  </p>
                </div>

                <div className="mt-8">
                  <footer>
                    <p className="font-semibold">
                      {review.name}
                      {review.flag && <Flag emoji={review.flag} className="ml-1.5" />}
                    </p>
                    <p className="text-sm text-zinc-700 dark:text-zinc-300">{review.role}</p>
                  </footer>

                  <Button
                    href={`/reviews/${review.slug}`}
                    variant="tertiary"
                    size="lg"
                    colorClassName={ACCENT_BUTTON[review.accent]}
                    className="mt-6"
                  >
                    Read story
                  </Button>
                </div>
              </blockquote>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
