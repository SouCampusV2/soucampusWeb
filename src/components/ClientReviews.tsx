"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ReviewAvatar } from "@/components/ReviewAvatar";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";
import { Flag } from "@/components/Flag";
import type { Review } from "@/lib/reviews";
import { ACCENT_CARD, ACCENT_RING } from "@/lib/review-accent";

type Accent = Review["accent"];

// Возврат со страницы отзыва: её ссылка «назад» ведёт на /#review-<slug>.
// Якорь нарочно НЕ совпадает ни с одним id на странице — иначе браузер (и
// Next) прокрутил бы к карточке сам, через scrollIntoView, а тот сдвигает
// и горизонтальный overflow-hidden карусели. Её положение задаёт только
// `x` из Motion, и чужой сдвиг сбил бы его на ширину карточки. Поэтому
// якорь разбирает сама карусель: листает к карточке и прокручивает
// страницу к секции.
const RETURN_HASH_PREFIX = "#review-";
const HIGHLIGHT_MS = 2200;

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

  const [returnedTo, setReturnedTo] = useState<string | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Меряет карточку и ряд; возвращает, сколько карточек помещается —
    // он нужен и здесь, и ниже, при возврате к отзыву, а стейт к тому
    // моменту ещё не обновится.
    function measure() {
      const card = firstCardRef.current;
      const track = trackRef.current;
      if (!card || !track) return null;
      const width = card.getBoundingClientRect().width;
      const fits = Math.max(1, Math.round(track.clientWidth / (width + CARD_GAP)));
      setCardWidth(width);
      setVisible(fits);
      return fits;
    }

    function returnToReview(fits: number) {
      const hash = window.location.hash;
      if (!hash.startsWith(RETURN_HASH_PREFIX)) return;
      const slug = decodeURIComponent(hash.slice(RETURN_HASH_PREFIX.length));
      const target = reviews.findIndex((r) => r.slug === slug);
      if (target === -1) return;

      // Ставим нужную карточку первой, насколько позволяет край: у
      // последних двух на десктопе сдвигаться дальше некуда, и они
      // окажутся видны правее — но видны.
      setIndex(Math.min(target, Math.max(0, reviews.length - fits)));
      setReturnedTo(slug);

      // Next после перехода сам прокручивает страницу к началу сегмента
      // (ему не нашлось элемента с таким id), и делает это раньше нас,
      // в фазе коммита. Кадр спустя — уже наша очередь.
      requestAnimationFrame(() =>
        sectionRef.current?.scrollIntoView({ block: "start" }),
      );
    }

    const fits = measure();
    if (fits !== null) returnToReview(fits);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // reviews приходят пропсом с сервера и между рендерами не меняются;
    // перезапускать разбор якоря при их смене незачем.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Подсветка карточки, к которой вернулись, гаснет сама — это подсказка
  // «ты был здесь», а не выделение, которое надо снимать.
  useEffect(() => {
    if (!returnedTo) return;
    const timer = setTimeout(() => setReturnedTo(null), HIGHLIGHT_MS);
    return () => clearTimeout(timer);
  }, [returnedTo]);

  const step = cardWidth + CARD_GAP;
  const maxIndex = Math.max(0, reviews.length - visible);

  return (
    <section ref={sectionRef} id="reviews" className="scroll-mt-24 bg-[#fbfbff] py-16 dark:bg-zinc-950 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        {/* min-w-0 по той же причине, что в PortfolioHero: без него
            заголовок не даёт ряду стрелок сжаться, и на узком экране
            правая стрелка уходит за край. Ряд здесь устроен ровно так же,
            значит и лечится одинаково. */}
        <div className="flex items-end justify-between gap-6">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="min-w-0 text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl"
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

      {/* data-draggable — для npm run check:responsive. Он считает
          поломкой кнопку, отрезанную непрокручиваемым предком: именно так
          14.09 пропала стрелка на /portfolio. Но карусель обрезает
          содержимое НАРОЧНО, а добраться до него можно перетаскиванием —
          и по вёрстке это неотличимо от настоящей потери. Поэтому
          отличие объявляется здесь, в разметке, а не угадывается
          скриптом. Ставится только там, где содержимое действительно
          вытаскивается жестом. */}
      {/* py-2 при mt-10 вместо прежнего mt-12 — место под рамку карточки, к
          которой вернулись со страницы отзыва (ring + offset = 6px):
          overflow-hidden срезал бы её сверху и снизу. Видимый отступ от
          заголовка тот же. */}
      <div data-draggable className="mt-10 overflow-hidden py-2">
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
                className={`flex w-[78vw] shrink-0 flex-col justify-between rounded-3xl p-6 ring-orange-500 ring-offset-4 ring-offset-[#fbfbff] transition-shadow duration-500 dark:ring-offset-zinc-950 sm:w-[340px] ${
                  i % 2 === 1 ? "sm:mt-8" : ""
                } ${returnedTo === review.slug ? "ring-2" : "ring-0"} ${ACCENT_CARD[review.accent]}`}
              >
                <div>
                  <ReviewAvatar
                    avatars={review.avatars}
                    name={review.name}
                    size="md"
                    ringClassName={ACCENT_RING[review.accent]}
                  />

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
