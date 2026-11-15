"use client";

// ⚠️ ЛАБОРАТОРИЯ бренда, круг 3 (16.11): /contact. Раскладка «слева текст
// и калькулятор, справа визуал со знаком» (docs/BRAND-IDEAS.md, раздел 4).
import { useCallback, useState } from "react";
import { Unbounded } from "next/font/google";
import { DiscordLogo } from "@phosphor-icons/react";
import { BuildEstimator } from "@/components/BuildEstimator";
import { PixelFan, PixelFlower } from "@/components/brand/PixelArt";
import { BUTTON_PILL } from "@/components/Button";

const display = Unbounded({ weight: "800", subsets: ["latin"] });
const YELLOW_CENTER = { C: "#fed83d", c: "#c6a830" };

/** Доля «размера карты» 0..1 — по площади, в логарифме: 10×10 и 2000×2000 оба должны читаться. */
function sizeShare(w: number, h: number) {
  const area = Math.max(1, w * h);
  return Math.min(1, Math.log(area) / Math.log(2000 * 2000));
}

function Left({ onSize }: { onSize?: (w: number, h: number) => void }) {
  return (
    <div>
      <h1 className={`${display.className} text-4xl leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}>
        I&apos;m here, always on <span className="text-blue-500">Discord</span>
      </h1>
      <p className="mt-4 max-w-md text-zinc-700 dark:text-zinc-300">
        Orders, questions and support — all in one place. We reply on weekdays and weekends alike.
      </p>
      <a href="#" className={`${BUTTON_PILL} mt-6 h-12 bg-blue-500 px-6 text-zinc-950 hover:bg-blue-600`}>
        <DiscordLogo size={20} weight="fill" /> Join Discord
      </a>
      <div className="mt-8 [&>div]:mx-0">
        <BuildEstimator onSizeChange={onSize} />
      </div>
    </div>
  );
}

function Frame({ children, right }: { children: React.ReactNode; right: React.ReactNode }) {
  return (
    <section className="relative overflow-hidden py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[40rem] w-[70rem] -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.3), transparent 70%)" }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 md:grid-cols-2">
        {children}
        <div className="flex justify-center">{right}</div>
      </div>
    </section>
  );
}

/** К1 — большой цветок справа, стоит. */
export function ContactStill() {
  return (
    <Frame right={<PixelFlower colors={YELLOW_CENTER} className="w-full max-w-md drop-shadow-[0_30px_60px_rgba(59,130,246,0.35)]" />}>
      <Left />
    </Frame>
  );
}

/** К2 — цветок растёт вместе с размером карты в калькуляторе. */
export function ContactGrow() {
  const [share, setShare] = useState(sizeShare(100, 100));
  const onSize = useCallback((w: number, h: number) => setShare(sizeShare(w, h)), []);
  return (
    <Frame
      right={
        <PixelFlower
          colors={YELLOW_CENTER}
          className="w-full max-w-md transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `scale(${0.35 + 0.75 * share})` }}
        />
      }
    >
      <Left onSize={onSize} />
    </Frame>
  );
}

/** К3 — веер: чем больше карта, тем больше залитых лепестков. */
export function ContactFan() {
  const [step, setStep] = useState(2);
  const onSize = useCallback((w: number, h: number) => {
    const area = w * h;
    // Пороги по площади: 50×50, 150×150, 400×400, 1000×1000.
    setStep(area < 2500 ? 1 : area < 22500 ? 2 : area < 160000 ? 3 : area < 1000000 ? 4 : 5);
  }, []);
  return (
    <Frame right={<PixelFan step={step} on="#ff6900" off="#ffffff" className="w-full max-w-md drop-shadow-xl" />}>
      <Left onSize={onSize} />
    </Frame>
  );
}

/** К4 — нижние секции: знаки вместо картинок-переписок. */
export function ContactSections() {
  return (
    <div className="mx-auto max-w-6xl px-6">
      <section className="grid items-center gap-10 py-14 sm:grid-cols-2">
        <div className="grid aspect-[4/3] place-items-center rounded-3xl bg-blue-100 dark:bg-blue-950">
          <PixelFlower colors={YELLOW_CENTER} className="w-1/2" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">Talk it through on Discord</h2>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Describe the idea, send references, ask anything — the whole order lives in one chat.
          </p>
        </div>
      </section>
      <section className="grid items-center gap-10 border-t border-zinc-200 py-14 dark:border-zinc-800 sm:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">Quick answers</h2>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">Price, timeline and revisions — the usual questions, answered below.</p>
        </div>
        <div className="grid aspect-[4/3] place-items-center rounded-3xl bg-orange-50 dark:bg-zinc-900">
          <PixelFan step={5} on="#ff6900" off="#ffffff" className="w-1/2" />
        </div>
      </section>
    </div>
  );
}
