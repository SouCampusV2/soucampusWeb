"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/Button";
import { ArrowButton } from "@/components/ArrowButton";

type Accent = "orange" | "lime";

// Real client testimonials, condensed to a similar length and a more formal
// tone (source: Discord feedback, collected in a CSV). Country flags are
// still placeholders — swap for real ones once countries + local icon files
// are confirmed (see CountriesMarquee for the local-icon pattern to follow).
// This shape (name/role/flag/text/accent) maps directly onto a future
// `reviews` table when this section is wired up to the database.
// Only two card accents (orange/lime) — the CTA button stays orange either
// way (primary color per DESIGN.md), the accent only tints the card itself.
const reviews = [
  {
    name: "Erik",
    role: "Server Owner, Luckycraft",
    flag: "🇳🇱",
    text: "Worked with SouCampus for over a year across multiple projects — fast communication, reliably great results, and rarely needs creative direction.",
    accent: "orange" as Accent,
  },
  {
    name: "Ghost",
    role: "Owner, GuardiumMC",
    flag: "🇺🇸",
    text: "Consistently impressed by his creativity and skill — every build feels like it belongs in a living world, with a soul and story behind the design.",
    accent: "lime" as Accent,
  },
  {
    name: "rambomine",
    role: "Owner, RamboMC",
    flag: "🇳🇱",
    text: "Incredibly skilled and reliable — builds match the vision perfectly, deadlines are respected, and the attention to detail stands out every time.",
    accent: "orange" as Accent,
  },
  {
    name: "TheErikCZ",
    role: "Founder, BreadBuilds",
    flag: "🇨🇿",
    text: "Worked with SouCampus from early commissions to now supplying builds for our shop — hugely talented, with a great eye for detail.",
    accent: "lime" as Accent,
  },
  {
    name: "Scooter",
    role: "Owner, Stranded",
    flag: "🇳🇱",
    text: "Fast, responsive and easy to work with — every build has consistently exceeded expectations.",
    accent: "orange" as Accent,
  },
  {
    name: "Luke & Sven",
    role: "Owners, AstroSMP",
    flag: "🇳🇱",
    text: "Fantastic results that genuinely improved the player experience on our servers — fast delivery, fair pricing, and an easy recommendation.",
    accent: "lime" as Accent,
  },
  {
    name: "Nathan",
    role: "Owner, LunaSMP",
    flag: "🇳🇱",
    text: "Loved the creativity and the communication — our new spawn is a hit with players. Nothing to complain about.",
    accent: "orange" as Accent,
  },
];

const ACCENT_CARD: Record<Accent, string> = {
  orange: "bg-orange-100 text-zinc-950",
  lime: "bg-lime-100 text-zinc-950",
};

// Эксперимент (ветка experiment/colors): кнопка того же акцента, что и
// карточка, вместо обычного "кнопки всегда orange" из DESIGN.md.
const ACCENT_BUTTON: Record<Accent, string> = {
  orange:
    "text-orange-500 underline decoration-2 underline-offset-4 hover:text-orange-600",
  lime: "text-lime-600 underline decoration-2 underline-offset-4 hover:text-lime-700",
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

export function ClientReviews() {
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
    <section className="bg-[#fbfbff] py-16 sm:py-28">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex items-end justify-between gap-6">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl"
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
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
                    <Skeleton className="h-full w-full" />
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#fbfbff] bg-[#fbfbff] text-xs">
                      {review.flag}
                    </span>
                  </div>

                  <p className="mt-6 text-base font-medium leading-6 text-zinc-950">
                    &ldquo;{review.text}&rdquo;
                  </p>
                </div>

                <div className="mt-8">
                  <footer>
                    <p className="font-semibold">{review.name}</p>
                    <p className="text-sm text-zinc-700">{review.role}</p>
                  </footer>

                  <Button
                    variant="secondary"
                    size="sm"
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
