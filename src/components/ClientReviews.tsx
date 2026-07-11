"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Skeleton } from "@/components/Skeleton";
import { Button } from "@/components/Button";
import { ArrowCircle } from "@/components/ArrowCircle";

// TODO: replace with real client photos, quotes and names — this shape
// (name/role/flag/text/accent) should map directly onto a future
// `reviews` table when this section is wired up to the database.
const reviews = [
  {
    name: "Client A",
    role: "Server Owner, Placeholder SMP",
    flag: "🇸🇬",
    text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Delivered on time and exactly what we asked for.",
    accent: "orange" as const,
  },
  {
    name: "Client B",
    role: "Founder, Placeholder Studio",
    flag: "🇺🇸",
    text: "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua, the whole build exceeded expectations.",
    accent: "lime" as const,
  },
  {
    name: "Client C",
    role: "Community Manager, Placeholder Network",
    flag: "🇬🇧",
    text: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip.",
    accent: "blue" as const,
  },
  {
    name: "Client D",
    role: "Owner, Placeholder Realm",
    flag: "🇦🇺",
    text: "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat.",
    accent: "orange" as const,
  },
  {
    name: "Client E",
    role: "Founder, Placeholder Guild",
    flag: "🇩🇪",
    text: "Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim.",
    accent: "lime" as const,
  },
  {
    name: "Client F",
    role: "Owner, Placeholder Server",
    flag: "🇨🇦",
    text: "At vero eos et accusamus et iusto odio dignissimos ducimus qui blanditiis praesentium.",
    accent: "blue" as const,
  },
  {
    name: "Client G",
    role: "Producer, Placeholder Network",
    flag: "🇳🇱",
    text: "Nam libero tempore, cum soluta nobis est eligendi optio cumque nihil impedit quo minus.",
    accent: "orange" as const,
  },
];

const ACCENT_CARD = {
  orange: "bg-orange-100 text-zinc-950",
  lime: "bg-lime-100 text-zinc-950",
  blue: "bg-blue-100 text-zinc-950",
};

const CARD_WIDTH = 340;
const CARD_GAP = 24;
const STEP = CARD_WIDTH + CARD_GAP;
const VISIBLE = 3;
const MAX_INDEX = Math.max(0, reviews.length - VISIBLE);

const ArrowButton = ({
  direction,
  onClick,
  disabled,
}: {
  direction: "left" | "right";
  onClick: () => void;
  disabled: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={direction === "left" ? "Previous" : "Next"}
    className="cursor-pointer disabled:cursor-default disabled:opacity-30"
  >
    <ArrowCircle
      direction={direction}
      className="h-11 w-11"
      colorClassName="bg-zinc-950 hover:bg-zinc-800 text-lime-300"
    />
  </button>
);

export function ClientReviews() {
  const [index, setIndex] = useState(0);

  return (
    <section className="bg-[#fbfbff] py-28">
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

          <div className="hidden shrink-0 gap-3 sm:flex">
            <ArrowButton
              direction="left"
              onClick={() => setIndex((i) => Math.max(0, i - 1))}
              disabled={index === 0}
            />
            <ArrowButton
              direction="right"
              onClick={() => setIndex((i) => Math.min(MAX_INDEX, i + 1))}
              disabled={index === MAX_INDEX}
            />
          </div>
        </div>
      </div>

      <div className="mt-12 overflow-hidden">
        <div className="mx-auto max-w-6xl px-6">
          <motion.div
            className="flex gap-6"
            animate={{ x: -index * STEP }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            {reviews.map((review, i) => (
              <blockquote
                key={review.name}
                style={{ width: CARD_WIDTH }}
                className={`flex shrink-0 flex-col justify-between rounded-3xl p-6 ${
                  i % 2 === 1 ? "mt-8" : ""
                } ${ACCENT_CARD[review.accent]}`}
              >
                <div>
                  {/* TODO: replace with real client photo */}
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
                    <Skeleton className="h-full w-full" />
                    <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[#fbfbff] bg-white text-xs">
                      {review.flag}
                    </span>
                  </div>

                  <p className="mt-6 text-base font-medium leading-6 text-zinc-900">
                    &ldquo;{review.text}&rdquo;
                  </p>
                </div>

                <div className="mt-8">
                  <footer>
                    <p className="font-semibold">{review.name}</p>
                    <p className="text-sm text-zinc-700">{review.role}</p>
                  </footer>

                  <Button variant="secondary" size="sm" className="mt-6">
                    Read {review.name.split(" ")[1] ?? review.name}&apos;s story
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
