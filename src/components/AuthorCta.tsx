"use client";

import { useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Unbounded } from "next/font/google";

// Same display font as the site's other hero headings.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

// Concentric solid-color circles, largest first so each subsequent (smaller)
// circle paints on top and covers the previous one's center — what's left
// visible is a ring the width of the size difference, in that ring's own
// flat color. Stacked back-to-front like this, the circles together read as
// one smooth gradient even though every ring is a single flat color, same
// idea as the reference screenshot. growTo values keep the outer rings
// growing further on scroll than the inner ones (mirrors the original
// growTo = 1.15 + i*0.05 formula from the hand-coded reference).
// The *smallest* ring sits closest to the section's own middle (lowest
// `riseUp`, reads as "furthest back"), bigger rings rise further up from
// there. `top` is computed as `calc(50% - riseUpPx)` below, not a plain
// percentage, so positions stay fixed regardless of the section's actual
// height. Sizes are ~20% smaller than before, and `riseUp` is tuned per
// ring so each bigger ring's bottom edge peeks out ~30px below the smaller
// one in front of it (was ~15px, which read as too overlapped/layered) —
// bottom edge = radius - riseUp, so riseUp_i = riseUp_(i+1) + Δradius - 30.
// Dark-theme colors are each one step (100) darker on the lime scale than
// the light-theme color (e.g. 250 -> 350). Expressed via the dedicated
// .author-ring-N classes in globals.css, not dark:bg-lime-N or an arbitrary
// dark:bg-[#hex] utility — both tie in specificity with the manual custom-step
// .bg-lime-N classes (this site's `dark:` variant uses :where(), which is
// zero-specificity) and silently lose to them. See the CSS comment there.
const RINGS = [
  { size: 1920, growTo: 1.55, riseUp: 770, color: "bg-lime-250 author-ring-0" },
  { size: 1680, growTo: 1.48, riseUp: 680, color: "bg-lime-350 author-ring-1" },
  { size: 1440, growTo: 1.41, riseUp: 590, color: "bg-lime-450 author-ring-2" },
  { size: 1160, growTo: 1.34, riseUp: 480, color: "bg-lime-550 author-ring-3" },
  { size: 920, growTo: 1.27, riseUp: 390, color: "bg-lime-650 author-ring-4" },
];

// Closing section for the homepage, built from a reference the user coded
// by hand: concentric rings that grow on scroll and drift with the mouse
// behind a portrait. Recolored onto the site's normal light theme (white
// background, no dark exception needed) — each ring carries one flat step
// of the lime scale instead of the reference's single blurred gradient
// image, per the user's request that every ring "own" its own color.
// Scroll progress reuses CountriesMarquee's exact formula — it grows 0→1
// smoothly as the section crosses the viewport, regardless of how tall the
// section itself is. The reference's own formula (-rect.top / (rect.height
// - windowHeight)) divides by a value close to zero for a ~100vh section,
// which is what made the growth feel like a jump instead of a smooth scroll.
// Scale at rest (scroll progress 0) — baked into the rings' initial inline
// style below too, so the first paint already matches what tick() would
// compute, instead of flashing at native (unscaled, untranslated) size for
// one frame and then jumping to the right place once JS kicks in.
const REST_SCALE = 1.05;

// Shared fade-up-on-scroll config for the tag/heading/paragraph/button —
// only the transition delay differs between them (staggered reveal).
const fadeUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.3 } as const,
};

export function AuthorCta() {
  const sectionRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const ringRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let targetProgress = 0;
    let currentProgress = 0;
    let targetParallax = { x: 0, y: 0 };
    const currentParallax = { x: 0, y: 0 };
    let rafId = 0;

    // Progress is driven by how far the page itself has scrolled, not by
    // this section's position — it now sits as the very first thing on the
    // page, already fully in view at scrollY 0, so a viewport-relative rect
    // formula would report a large progress before the user scrolls at all
    // (that's what made the rings look pre-grown and flat on load). Tying
    // it to scrollY instead means rings start at REST_SCALE at the top of
    // the page and grow in as the user actually scrolls down.
    function measure() {
      const progress = window.scrollY / (window.innerHeight * 0.8);
      targetProgress = Math.max(0, Math.min(1, progress));
      wake();
    }

    function onMouseMove(e: MouseEvent) {
      targetParallax = {
        x: (e.clientX / window.innerWidth - 0.5) * 16,
        y: (e.clientY / window.innerHeight - 0.5) * 16,
      };
      wake();
    }

    // Lerp both values toward their targets and repaint only while
    // something is still moving — an unconditional requestAnimationFrame
    // loop here would keep mutating styles forever, even once everything
    // has settled, which is what was making the whole page feel laggy.
    function tick() {
      currentProgress += (targetProgress - currentProgress) * 0.08;
      currentParallax.x += (targetParallax.x - currentParallax.x) * 0.08;
      currentParallax.y += (targetParallax.y - currentParallax.y) * 0.08;

      const wrap = wrapRef.current;
      if (wrap) {
        wrap.style.transform = `translate(${currentParallax.x}px, ${currentParallax.y}px)`;
      }

      ringRefs.current.forEach((ring, i) => {
        if (!ring) return;
        const { growTo } = RINGS[i];
        const scale = REST_SCALE + (growTo - REST_SCALE) * currentProgress;
        ring.style.transform = `translate(-50%, -50%) scale(${scale})`;
      });

      const settled =
        Math.abs(targetProgress - currentProgress) < 0.0005 &&
        Math.abs(targetParallax.x - currentParallax.x) < 0.05 &&
        Math.abs(targetParallax.y - currentParallax.y) < 0.05;

      rafId = settled ? 0 : requestAnimationFrame(tick);
    }

    function wake() {
      if (!rafId) rafId = requestAnimationFrame(tick);
    }

    measure();
    wake();
    // passive: true — these handlers never call preventDefault, so the
    // browser doesn't need to wait for them before scrolling/painting.
    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure);
    document.addEventListener("mousemove", onMouseMove, { passive: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      document.removeEventListener("mousemove", onMouseMove);
    };
  }, []);

  return (
    // -mt-[82px]: the navbar's wrapper (Navbar.tsx, `sticky top-4`) still
    // reserves its own ~82px of normal document flow before this section —
    // sticky isn't `fixed`, it doesn't remove itself from flow, it just gets
    // visually offset by `top-4` once unstuck. That reserved 82px is what
    // was showing as a plain white gap above the rings no matter how the
    // glow/gradient here was tuned. Since this section is now the page's
    // very first thing, pulling it up by exactly that reserved height makes
    // it start at the true top of the page; the navbar still renders on top
    // of it visually (z-50), so nothing is lost, just no more gap beneath it.
    <div className="relative -mt-[82px]">
      <section
        ref={sectionRef}
        className="relative flex flex-col items-center overflow-hidden pb-16 pt-24 text-center sm:pb-28 bg-[radial-gradient(circle,rgba(163,230,53,0.45),transparent_72%)]"
      >
        {/* overflow-hidden here (both axes) clips the oversized rings/glow to
            this section's own box — without it, the rings' bounding box
            (they're absolutely positioned and escape normal layout) was
            inflating the page's total scrollable area and bleeding visually
            into the section above, which is what made scrolling feel janky
            and made the rings look like they belonged to no section at all.
            `html { overflow-x: hidden }` in globals.css stays as a second,
            site-wide safety net, but the real fix is clipping at the source. */}

        {/* Soft ambient glow behind the rings — same radial-gradient recipe as
            Hero.tsx's own glow, just recentered on the rings. No bg-[#fbfbff]
            on this <section> — it relies on the page's own white background
            showing through, same as Hero.tsx. This section has no z-index of
            its own, so it never becomes a stacking context; giving it an
            opaque background here would paint above this -z-10 div (in the
            root stacking context) and hide the glow completely, which is
            what was happening before. */}

        {/* Full-section overlay so `top: calc(50% - riseUpPx)` (see RINGS
            above) resolves against the section's own height. overflow-hidden
            on the section crops whatever sticks out past its edges. RINGS'
            px sizes/offsets are plain desktop constants with no viewport
            awareness of their own — on a 375px phone they'd render at the
            exact same absolute pixel size as on a 1920px desktop, i.e. way
            oversized relative to the screen. `wrapRef` already gets its own
            inline `transform` from the parallax tick() loop, and each ring
            gets its own inline scale from the scroll-grow loop — adding a
            *static* CSS scale on either of those elements would just get
            clobbered by those inline styles. So the mobile scale-down lives
            on this extra, JS-untouched wrapper instead: scaling a parent
            multiplies with a child's own transform rather than replacing
            it, so it shrinks the whole ring system uniformly without fighting
            the animation. */}
        <div className="absolute inset-0 -translate-y-[150px] scale-50 sm:translate-y-0 sm:scale-100">
          <div ref={wrapRef} className="pointer-events-none absolute inset-0">
            {RINGS.map((ring, i) => (
              <div
                key={ring.size}
                ref={(el) => {
                  ringRefs.current[i] = el;
                }}
                className={`absolute left-1/2 rounded-full ${ring.color}`}
                style={{
                  top: `calc(50% - ${ring.riseUp}px)`,
                  width: ring.size,
                  height: ring.size,
                  transform: `translate(-50%, -50%) scale(${REST_SCALE})`,
                }}
              />
            ))}
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center px-6">
        {/* TODO: replace with a real photo — silhouette placeholder for now */}
        <motion.svg
          initial={{ opacity: 0, y: 80, scale: 1.08 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 1 }}
          className="mb-2 w-64 max-w-[65vw] sm:w-80"
          viewBox="0 0 320 420"
        >
          <defs>
            <linearGradient id="authorCtaPersonGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#d4d4d8" />
              <stop offset="1" stopColor="#52525b" />
            </linearGradient>
          </defs>
          <circle cx="160" cy="95" r="70" fill="url(#authorCtaPersonGradient)" />
          <path
            d="M60 420 C60 260 100 210 160 210 C220 210 260 260 260 420 Z"
            fill="url(#authorCtaPersonGradient)"
          />
        </motion.svg>

        <motion.span
          {...fadeUp}
          transition={{ duration: 0.8 }}
          className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-orange-600"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            className="h-4 w-4"
            aria-hidden="true"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c0-4 4-6 8-6s8 2 8 6" />
          </svg>
          Author
        </motion.span>

        <motion.h2
          {...fadeUp}
          transition={{ duration: 0.8, delay: 0.1 }}
          className={`${displayFont.className} text-4xl leading-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
        >
          Hi! My name is Eugene c:
        </motion.h2>

        <motion.p
          {...fadeUp}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="mt-4 max-w-md leading-7 text-zinc-700 dark:text-zinc-300"
        >
          8 years building worlds in Minecraft professionally. My goal is to
          turn every idea into a map worth exploring.
        </motion.p>
        </div>
      </section>
    </div>
  );
}
