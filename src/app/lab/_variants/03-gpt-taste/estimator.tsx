"use client";

import { SIZE_MAX, SIZE_MIN, useEstimate } from "../../_shared/useEstimate";
import { CONTACT } from "../../_shared/pages";

// Калькулятор для клетки bento на Contact. Два ползунка, а не два поля:
// скилл просит «кинематографичности», и крупные цифры, которые меняются
// под пальцем, делают это лучше формы. Поля ввода остаются рядом — точный
// размер ползунком не набрать.
export function CinemaEstimator() {
  const e = useEstimate(150);

  return (
    <div className="flex h-full flex-col justify-between gap-8 rounded-3xl border border-white/10 bg-white/[0.04] p-7 text-white md:p-9">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-2xl font-semibold tracking-[-0.02em]">{CONTACT.estimateTitle}</h2>
        <p className="text-sm text-white/50">
          {e.w} × {e.h} blocks
        </p>
      </div>

      <div className="grid gap-6">
        <Slider label="Width" value={e.width} onChange={e.setWidth} />
        <Slider label="Length" value={e.height} onChange={e.setHeight} />
      </div>

      <div className="grid grid-cols-2 gap-3" aria-live="polite">
        <div className="rounded-2xl bg-[#e8ff5a] p-5 text-black">
          <p className="text-sm text-black/60">Price from</p>
          <p className="mt-1 text-[clamp(2rem,4vw,3rem)] font-semibold leading-none tracking-[-0.04em] tabular-nums">{e.priceLabel}</p>
        </div>
        <div className="rounded-2xl border border-white/10 p-5">
          <p className="text-sm text-white/50">Timeline</p>
          <p className="mt-1 text-[clamp(1.5rem,3vw,2.25rem)] font-semibold leading-none tracking-[-0.03em]">{e.deadline}</p>
        </div>
      </div>
      <p className="text-sm text-white/45">{CONTACT.estimateNote}</p>
    </div>
  );
}

function Slider({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const id = `cinema-${label.toLowerCase()}`;
  return (
    <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2">
      <label htmlFor={id} className="text-white/60">{label}</label>
      <input
        type="number"
        inputMode="numeric"
        min={SIZE_MIN}
        max={SIZE_MAX}
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        aria-label={`${label}, blocks`}
        className="w-24 rounded-full border border-white/15 bg-transparent px-4 py-2 text-right tabular-nums text-white outline-none focus:border-white/50"
      />
      <input
        id={id}
        type="range"
        min={SIZE_MIN}
        max={SIZE_MAX}
        step={5}
        value={Number(value) || SIZE_MIN}
        onChange={(ev) => onChange(ev.target.value)}
        className="col-span-2 w-full accent-[#e8ff5a]"
      />
    </div>
  );
}
