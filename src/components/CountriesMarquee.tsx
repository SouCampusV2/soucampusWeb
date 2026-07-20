"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";

const CIRCLE_SIZE = 128;

// Decorative list, kept as a local array on purpose — unlike `reviews` or
// `stats`, this changes rarely and doesn't need to live in a database table.
// Shaped the same way regardless (id/label/src per row) so every data
// source on the site follows one consistent style.
const COUNTRIES = [
  { id: "eur", label: "Eurozone", src: "/countries/eur.svg" },
  { id: "usd", label: "United States", src: "/countries/usd.svg" },
  { id: "nl", label: "Netherlands", src: "/countries/nl.svg" },
  { id: "gbp", label: "United Kingdom", src: "/countries/gbp.svg" },
  { id: "de", label: "Germany", src: "/countries/de.svg" },
  { id: "fr", label: "France", src: "/countries/fr.svg" },
  { id: "it", label: "Italy", src: "/countries/it.svg" },
  { id: "ca", label: "Canada", src: "/countries/ca.svg" },
  { id: "uah", label: "Ukraine", src: "/countries/uah.svg" },
  { id: "ee", label: "Estonia", src: "/countries/ee.svg" },
];

export function CountriesMarquee() {
  const roadRef = useRef<HTMLDivElement>(null);
  const wheelsRef = useRef<HTMLDivElement>(null);
  const chipRefs = useRef<(HTMLSpanElement | null)[]>([]);

  useEffect(() => {
    let targetMoveX = 0;
    let currentMoveX = 0;
    let rafId = 0;

    function measureTarget() {
      const road = roadRef.current;
      if (!road) return;

      const rect = road.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Movement progress as the section crosses the viewport (0 → 1 → 0)
      let progress = 1 - rect.bottom / (windowHeight + rect.height);
      progress = Math.max(0, Math.min(1, progress));

      const maxMove = road.clientWidth * 0.6;
      targetMoveX = progress * maxMove;
    }

    function tick() {
      // Lerp toward the scroll-derived target — smooths out jumpy scroll events.
      currentMoveX += (targetMoveX - currentMoveX) * 0.08;

      const wheels = wheelsRef.current;
      if (wheels) {
        // -200px base offset shifts the whole row (arrow + flags) left together.
        wheels.style.transform = `translateX(${currentMoveX - 200}px)`;
      }

      chipRefs.current.forEach((chip) => {
        if (!chip) return;
        const radius = chip.offsetWidth / 2;
        const rotation = (currentMoveX / radius) * (180 / Math.PI);
        chip.style.transform = `rotate(${rotation}deg)`;
      });

      rafId = requestAnimationFrame(tick);
    }

    measureTarget();
    rafId = requestAnimationFrame(tick);
    window.addEventListener("scroll", measureTarget);
    window.addEventListener("resize", measureTarget);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", measureTarget);
      window.removeEventListener("resize", measureTarget);
    };
  }, []);

  const loop = [...COUNTRIES, ...COUNTRIES];

  return (
    <section className="overflow-hidden border-t border-zinc-200 py-12 dark:border-zinc-800 sm:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
          Countries I&apos;ve worked with
        </h2>
      </div>

      <div ref={roadRef} className="mt-10 overflow-hidden">
        <div className="[mask-image:linear-gradient(to_right,black_88%,transparent)]">
          <div ref={wheelsRef} className="flex w-max items-center gap-2 sm:gap-4">
            <span className="relative flex h-20 w-20 shrink-0 items-center justify-center sm:h-32 sm:w-32">
              <span
                aria-hidden
                className="absolute inset-y-0 right-0 w-screen rounded-r-full bg-lime-400 dark:bg-lime-950"
              />
              <span className="relative z-10 flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-zinc-950 text-lime-500 dark:text-lime-950 dark:bg-zinc-50 sm:h-24 sm:w-24">
                <svg
                  className="h-6 w-6 dark:h-[26px] dark:w-[26px]"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <path d="m13.293 4.707 6.293 6.293a1 1 0 0 1 0 1.414l-6.293 6.293-1.414-1.414L16.586 13H4v-2h12.586l-4.707-4.879 1.414-1.414z" />
                </svg>
              </span>
            </span>

            {loop.map((country, i) => (
              <span
                key={`${country.id}-${i}`}
                ref={(el) => {
                  chipRefs.current[i] = el;
                }}
                className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 sm:h-32 sm:w-32"
              >
                <Image
                  src={country.src}
                  alt={country.label}
                  width={CIRCLE_SIZE}
                  height={CIRCLE_SIZE}
                  className="h-full w-full object-cover"
                />
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
