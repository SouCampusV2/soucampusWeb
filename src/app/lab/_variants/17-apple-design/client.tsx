"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AnimatePresence,
  MotionConfig,
  animate,
  motion,
  useMotionValue,
  type PanInfo,
} from "motion/react";
import { useEffect, useRef, useState } from "react";

// apple-design, переведённый на веб. Параметры пружин — из таблицы скилла:
//   обычный UI      damping 1.0 (bounce 0), response ~0.35s
//   бросок/свайп    damping ~0.8 (bounce 0.2) — перелёт только там, где
//                   жест сам нёс импульс
const SPRING_UI = { type: "spring" as const, bounce: 0, duration: 0.35 };
const SPRING_FLICK = { type: "spring" as const, bounce: 0.2, duration: 0.45 };

type Build = { slug: string; title: string; tag: string; image: string; summary: string; size: string; deadline: string; price: string };

/** Уважение к «меньше движения» на всё дерево: пружины → короткие переходы. */
export function Motion({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

// ── Лента работ: 1:1 под пальцем, бросок с проекцией инерции ──
//
// Куда ляжет лента, считается не по месту отпускания, а по тому, КУДА
// её бросили: позиция + скорость × коэффициент (§6 «Momentum
// projection»). Затем — к ближайшей карточке, пружиной, которая
// принимает скорость жеста (§5 «Velocity handoff»). За краями — резинка
// (dragElastic), а не жёсткий стоп (§9).
export function Carousel({ builds, onOpen }: { builds: Build[]; onOpen: (b: Build) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [bounds, setBounds] = useState({ left: 0, right: 0, step: 1 });
  const dragged = useRef(false);

  useEffect(() => {
    function measure() {
      const t = track.current;
      const v = viewport.current;
      if (!t || !v) return;
      const card = t.firstElementChild as HTMLElement | null;
      const gap = 16;
      setBounds({ left: Math.min(0, v.clientWidth - t.scrollWidth), right: 0, step: (card?.offsetWidth ?? 300) + gap });
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  function onDragEnd(_: unknown, info: PanInfo) {
    const projected = x.get() + info.velocity.x * 0.2;
    const snapped = Math.round(projected / bounds.step) * bounds.step;
    const target = Math.max(bounds.left, Math.min(bounds.right, snapped));
    animate(x, target, { ...SPRING_FLICK, velocity: info.velocity.x });
  }

  function step(dir: 1 | -1) {
    const target = Math.max(bounds.left, Math.min(bounds.right, Math.round(x.get() / bounds.step) * bounds.step - dir * bounds.step));
    animate(x, target, SPRING_UI);
  }

  return (
    <div>
      <div ref={viewport} className="overflow-hidden px-5 md:px-[max(20px,calc((100vw-1080px)/2))]">
        <motion.div
          ref={track}
          drag="x"
          style={{ x, touchAction: "pan-y" }}
          dragConstraints={{ left: bounds.left, right: bounds.right }}
          dragElastic={0.18}
          dragMomentum={false}
          onDragStart={() => (dragged.current = true)}
          onDragEnd={onDragEnd}
          className="flex w-max cursor-grab gap-4 active:cursor-grabbing"
        >
          {builds.map((b) => (
            <button
              key={b.slug}
              type="button"
              onPointerDown={() => (dragged.current = false)}
              onClick={() => !dragged.current && onOpen(b)}
              className="group w-[78vw] max-w-[340px] shrink-0 select-none text-left"
            >
              <div className="relative aspect-[3/4] overflow-hidden rounded-[28px] bg-black/5 transition-transform duration-150 group-active:scale-[0.98]">
                <Image src={b.image} alt="" fill draggable={false} sizes="340px" className="pointer-events-none object-cover" />
              </div>
              <span className="mt-3 block text-[17px] font-semibold tracking-[-0.01em]">{b.title}</span>
              <span className="block text-[15px] text-black/50">{b.tag}</span>
            </button>
          ))}
        </motion.div>
      </div>
      <div className="mx-auto mt-6 flex max-w-[1080px] justify-end gap-2 px-5">
        <button type="button" onClick={() => step(-1)} aria-label="Previous" className="grid size-11 place-items-center rounded-full bg-black/[0.06] text-lg active:scale-95">‹</button>
        <button type="button" onClick={() => step(1)} aria-label="Next" className="grid size-11 place-items-center rounded-full bg-black/[0.06] text-lg active:scale-95">›</button>
      </div>
    </div>
  );
}

// ── Нижняя панель (sheet) ──
//
// Входит снизу и уходит вниз — один путь туда и обратно (§7). Под ней
// затемнение: это модальная задача («dim to focus», §12). Тянется
// пальцем 1:1; вверх — почти не пускает (резинка), вниз — закрывается,
// если утащили далеко ИЛИ быстро махнули (решает скорость, а не только
// расстояние, §5).
export function Sheet({ build, onClose }: { build: Build | null; onClose: () => void }) {
  useEffect(() => {
    if (!build) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [build, onClose]);

  return (
    <AnimatePresence>
      {build && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-40 bg-black/35"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={SPRING_UI}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fluid-sheet-title"
            className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[88dvh] w-full max-w-xl overflow-hidden rounded-t-[32px] bg-white/85 pb-[env(safe-area-inset-bottom)] shadow-[0_-20px_60px_rgba(0,0,0,0.2)] backdrop-blur-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={SPRING_UI}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.05, bottom: 1 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 140 || info.velocity.y > 600) onClose();
            }}
          >
            <div className="mx-auto mt-3 h-1.5 w-10 rounded-full bg-black/20" aria-hidden="true" />
            <div className="relative mx-5 mt-4 aspect-[16/10] overflow-hidden rounded-[22px]">
              <Image src={build.image} alt={build.title} fill sizes="560px" className="pointer-events-none object-cover" draggable={false} />
            </div>
            <div className="p-6">
              <p className="text-[15px] text-black/50">{build.tag}</p>
              <h3 id="fluid-sheet-title" className="text-[28px] font-bold leading-tight tracking-[-0.02em]">{build.title}</h3>
              <p className="mt-2 text-[17px] leading-relaxed text-black/70">{build.summary}</p>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-[15px]">
                <div><dt className="text-black/50">Size</dt><dd className="font-semibold tabular-nums">{build.size}</dd></div>
                <div><dt className="text-black/50">Built in</dt><dd className="font-semibold">{build.deadline}</dd></div>
                <div><dt className="text-black/50">Price</dt><dd className="font-semibold">{build.price}</dd></div>
              </dl>
              <div className="mt-6 flex gap-2">
                <Link href={`/portfolio/${build.slug}`} className="flex-1 rounded-full bg-black py-3.5 text-center text-[17px] font-semibold text-white active:scale-[0.98]">Open build</Link>
                <button type="button" onClick={onClose} className="rounded-full bg-black/[0.06] px-6 text-[17px] font-semibold active:scale-[0.98]">Close</button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

export function Gallery({ builds }: { builds: Build[] }) {
  const [open, setOpen] = useState<Build | null>(null);
  return (
    <>
      <Carousel builds={builds} onOpen={setOpen} />
      <Sheet build={open} onClose={() => setOpen(null)} />
    </>
  );
}

// ── Сегментный переключатель тарифов ──
// Плашка переезжает пружиной (layoutId) — без перелёта: это не бросок.
type Plan = { name: string; price: string; text: string };

export function PlanPicker({ plans }: { plans: Plan[] }) {
  const [i, setI] = useState(1);
  const plan = plans[i];
  return (
    <div>
      <div role="tablist" aria-label="Plans" className="inline-flex max-w-full flex-wrap rounded-full bg-black/[0.06] p-1">
        {plans.map((p, j) => (
          <button
            key={p.name}
            role="tab"
            aria-selected={j === i}
            onClick={() => setI(j)}
            className="relative rounded-full px-4 py-2 text-[15px] font-semibold"
          >
            {j === i && <motion.span layoutId="apple-seg" transition={SPRING_UI} className="absolute inset-0 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)]" />}
            <span className="relative">{p.name}</span>
          </button>
        ))}
      </div>
      {plan && (
        <motion.div key={plan.name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={SPRING_UI} className="mt-8">
          <p className="text-[48px] font-bold tracking-[-0.03em] tabular-nums">{plan.price}</p>
          <p className="mt-2 max-w-xl text-[19px] leading-relaxed text-black/60">{plan.text}</p>
        </motion.div>
      )}
    </div>
  );
}
