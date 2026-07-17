"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import { Unbounded } from "next/font/google";
import { ArrowCircle } from "@/components/ArrowCircle";
import { ArrowButton } from "@/components/ArrowButton";
import { Button } from "@/components/Button";
import type { Project } from "@/lib/projects";

// Same display font as the homepage Hero — rhymes the two "hero" headings.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

type Props = {
  projects: Project[];
};

// Honeyfrost-style hero: a row of panels, the active one expanded via
// animated flexGrow. Hover expands on desktop, tap/click expands on
// touch devices (hover doesn't exist there) — same interaction either way.
// Hover must "settle" on a panel for this long before it takes over — a
// quick pass across the row doesn't fire a switch every panel it crosses.
const HOVER_HOLD_MS = 90;

// The expanding-panel layout only reads well with a handful of panels —
// cap the carousel itself, the rest live in the grid below.
const MAX_CAROUSEL_ITEMS = 5;

export function PortfolioHero({ projects: allProjects }: Props) {
  const projects = allProjects.slice(0, MAX_CAROUSEL_ITEMS);
  const [active, setActive] = useState(0);
  const current = projects[active];
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  const goTo = (i: number) =>
    setActive(((i % projects.length) + projects.length) % projects.length);

  const scheduleActive = (i: number) => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    hoverTimeout.current = setTimeout(() => setActive(i), HOVER_HOLD_MS);
  };

  const cancelSchedule = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
  };

  return (
    <section className="relative pt-20">
      {/* w-screen, not w-full: this section (unlike Hero.tsx/Contact's hero)
          lives nested inside /portfolio's own padded <main className="px-6">,
          so a percentage width here would resolve against the section's own
          (narrower-than-viewport) box instead of the real viewport — on
          mobile, where <main>'s max-w-6xl cap doesn't kick in, that shortfall
          (~48px, main's own left+right px-6) was visible as the gradient
          not quite reaching the screen edges. main's padding is symmetric,
          so the section's horizontal center still lines up with the
          viewport's, and left-1/2 -translate-x-1/2 centers correctly. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[36rem] w-screen max-w-[90rem] -translate-x-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(163,230,53,0.35),transparent_70%)]"
      />

      <div className="flex items-end justify-between gap-6">
        <div>
          <h1
            className={`${displayFont.className} text-4xl leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
          >
            Portfolio
          </h1>
          <p className="mt-3 max-w-xl text-zinc-600 dark:text-zinc-400">
           <b>Latest:</b> Hover or tap a build to preview it, then click/tap again for the full story.
          </p>
        </div>

        <div className="flex shrink-0 gap-3">
          <ArrowButton
            direction="left"
            onClick={() => goTo(active - 1)}
            colorClassName="bg-lime-400 hover:bg-lime-500 text-zinc-950"
          />
          <ArrowButton
            direction="right"
            onClick={() => goTo(active + 1)}
            colorClassName="bg-lime-400 hover:bg-lime-500 text-zinc-950"
          />
        </div>
      </div>

      {/* Mobile-only: the hover-expanding panel row below reads fine on
          desktop (a pointer to hover with, plenty of horizontal room for 5
          panels) but breaks down on a phone — 4 collapsed ~64px panels plus
          gaps leave almost no room for the "expanded" one, and there's no
          hover at all on touch. Below `sm:` it's swapped for a plain
          single-image carousel instead: swipe left/right (drag + threshold)
          or the arrow buttons above, no expand/collapse choreography. The
          drag handler lives on the OUTER block (image + title/specs/CTA
          together), not just the photo — swiping anywhere over the card,
          including the text underneath, changes the project, not just a
          swipe that lands exactly on the picture. */}
      <div className="mt-10 sm:hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={current.slug}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) goTo(active + 1);
              else if (info.offset.x > 60) goTo(active - 1);
            }}
            className="cursor-grab select-none active:cursor-grabbing"
          >
            <div className="relative h-[420px] w-full overflow-hidden rounded-2xl">
              <Image
                src={current.image}
                alt={current.title}
                fill
                sizes="100vw"
                className="pointer-events-none object-cover"
                priority
              />
              <span className="pointer-events-none absolute left-4 top-4 rounded-full bg-lime-300/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-950">
                {current.tag}
              </span>

              <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
                {projects.map((project, i) => (
                  <span
                    key={project.slug}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      i === active ? "bg-lime-400" : "bg-white/70"
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="mt-4">
              <h2
                className={`${displayFont.className} text-2xl uppercase leading-tight tracking-tight text-zinc-950 dark:text-zinc-50`}
              >
                {current.title}
              </h2>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">{current.summary}</p>
              <ul className="mt-3 space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
                <li>
                  <span className="font-semibold text-zinc-950 dark:text-zinc-50">Size:</span> {current.size}
                </li>
                <li>
                  <span className="font-semibold text-zinc-950 dark:text-zinc-50">Built in:</span>{" "}
                  {current.deadline}
                </li>
                <li>
                  <span className="font-semibold text-zinc-950 dark:text-zinc-50">Price:</span> {current.price}
                </li>
              </ul>
              <Button
                href={`/portfolio/${current.slug}`}
                size="lg"
                colorClassName="rounded-full bg-lime-400 text-zinc-950 hover:bg-lime-500"
                className="group mt-5 gap-3"
              >
                Check this
                <ArrowCircle
                  direction="right"
                  variant="bare"
                  className="h-6 w-6 transition-transform duration-300 group-hover:-rotate-45"
                  colorClassName="text-zinc-950"
                />
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="mt-10 hidden h-[420px] gap-3 sm:flex sm:h-[520px]">
        {projects.map((project, i) => {
          const isActive = i === active;
          return (
            <motion.div
              key={project.slug}
              onMouseEnter={() => scheduleActive(i)}
              onMouseLeave={cancelSchedule}
              onClick={() => {
                // On touch devices there's no hover to "preview" a panel
                // first — the old handler always navigated immediately, so
                // tapping any inactive panel skipped the preview entirely
                // and jumped straight to its detail page. First tap now
                // just activates/expands the panel (mirroring what hover
                // does on desktop); a second tap on the already-active
                // panel is what navigates.
                cancelSchedule();
                if (isActive) {
                  router.push(`/portfolio/${project.slug}`);
                } else {
                  setActive(i);
                }
              }}
              role="link"
              tabIndex={0}
              aria-label={`View ${project.title}`}
              animate={{ flexGrow: isActive ? 8 : 1 }}
              transition={{ type: "spring", stiffness: 140, damping: 26 }}
              style={{ flexBasis: 0 }}
              className="relative min-w-[64px] shrink-0 cursor-pointer overflow-hidden rounded-2xl"
            >
              <Image
                src={project.image}
                alt={project.title}
                fill
                sizes="(min-width: 640px) 60vw, 100vw"
                className={`object-cover transition-all duration-500 ${
                  isActive ? "scale-100 brightness-100" : "scale-110 brightness-[0.55]"
                }`}
                priority={i === 0}
              />

              {isActive ? (
                <span className="absolute left-4 top-4 rounded-full bg-lime-300/90 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-950 sm:left-6 sm:top-6">
                  {project.tag}
                </span>
              ) : (
                <>
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-zinc-950/60 to-transparent" />
                  <span className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs font-semibold uppercase tracking-wide text-white [writing-mode:vertical-rl]">
                    {project.title}
                  </span>
                </>
              )}
            </motion.div>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.slug}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25 }}
          className="mt-4 hidden gap-6 sm:grid sm:grid-cols-[1fr_1.4fr_auto] sm:items-start sm:gap-10"
        >
          <h2
            className={`${displayFont.className} text-2xl uppercase leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl`}
          >
            {current.title}
          </h2>

          <div>
            <p className="text-zinc-600 dark:text-zinc-400">{current.summary}</p>
            <ul className="mt-3 space-y-1.5 text-sm text-zinc-700 dark:text-zinc-300">
              <li>
                <span className="font-semibold text-zinc-950 dark:text-zinc-50">Size:</span> {current.size}
              </li>
              <li>
                <span className="font-semibold text-zinc-950 dark:text-zinc-50">Built in:</span> {current.deadline}
              </li>
              <li>
                <span className="font-semibold text-zinc-950 dark:text-zinc-50">Price:</span> {current.price}
              </li>
            </ul>
          </div>

          <Button
            href={`/portfolio/${current.slug}`}
            size="lg"
            colorClassName="rounded-full bg-lime-400 text-zinc-950 hover:bg-lime-500"
            className="group shrink-0 gap-3 hover:!scale-100"
          >
            Check this
            <ArrowCircle
              direction="right"
              variant="bare"
              className="h-6 w-6 transition-transform duration-300 group-hover:-rotate-45"
              colorClassName="text-zinc-950"
            />
          </Button>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
