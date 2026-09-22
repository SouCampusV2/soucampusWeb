"use client";

import { SIZE_MAX, SIZE_MIN, useEstimate } from "../../_shared/useEstimate";
import { CONTACT } from "../../_shared/pages";

// Калькулятор в двойной рамке (soft-skill §4.A). Поля — «ядро» внутри
// оправы, как у всего остального: белое на серебристом, мягкая тень.
// Результат — в тёмном ядре, это единственная тёмная вещь на экране.
export function AgencyEstimator() {
  const e = useEstimate(150);

  return (
    <div className="rounded-[2rem] bg-black/[0.035] p-2 ring-1 ring-black/5 shadow-[0_40px_80px_-30px_rgba(30,36,50,0.25)]">
      <div className="rounded-[calc(2rem-0.5rem)] bg-white p-6 shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] md:p-8">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#5b606b]">{CONTACT.estimateTitle}</p>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Field id="agency-w" label="Width" value={e.width} onChange={e.setWidth} />
          <Field id="agency-h" label="Length" value={e.height} onChange={e.setHeight} />
        </div>
        <div aria-live="polite" className="mt-3 rounded-[1.25rem] bg-[#16181d] p-6 text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.12)]">
          <p className="text-white/60">
            {e.w} × {e.h} blocks
          </p>
          <p className="mt-3 text-[clamp(2.75rem,5vw,4rem)] font-extrabold leading-none tracking-[-0.05em] tabular-nums">{e.priceLabel}</p>
          <p className="mt-2 text-white/70">about {e.deadline}</p>
        </div>
        <p className="mt-4 text-sm text-[#5b606b]">{CONTACT.estimateNote}</p>
      </div>
    </div>
  );
}

function Field({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label htmlFor={id} className="block rounded-[1.25rem] bg-[#eceef1] px-5 py-4 transition-shadow focus-within:ring-2 focus-within:ring-[#16181d]">
      <span className="block text-sm text-[#5b606b]">{label}, blocks</span>
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={SIZE_MIN}
        max={SIZE_MAX}
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        className="mt-1 w-full bg-transparent text-3xl font-extrabold tracking-[-0.04em] tabular-nums outline-none"
      />
    </label>
  );
}
