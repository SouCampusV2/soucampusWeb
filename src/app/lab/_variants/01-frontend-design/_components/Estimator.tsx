"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { estimateDeadlineDays, estimatePrice, formatDeadline } from "@/lib/pricing";
import s from "../styles.module.css";

// Калькулятор заказа. Формула — ТА ЖЕ, что в BuildEstimator на живом
// сайте (src/lib/pricing.ts): ставки, порог и сроки не копируются, а
// импортируются. Справка, разошедшаяся с настоящим расчётом, хуже
// отсутствующей.
//
// Своё здесь — только вид: план участка сверху, расчерченный на чанки
// (16×16 блоков, как в игре). Прямоугольник постройки растёт вместе с
// ползунками, и видно, сколько чанков она займёт.
const MAX = 1000;
const CHUNK = 16;

export function Estimator() {
  const [width, setWidth] = useState(160);
  const [length, setLength] = useState(120);
  const id = useId();

  const price = estimatePrice(width, length);
  const time = formatDeadline(estimateDeadlineDays(width, length));
  const chunks = Math.ceil(width / CHUNK) * Math.ceil(length / CHUNK);

  return (
    <section className={`${s.section} ${s.estimator}`} aria-labelledby={`${id}-title`}>
      <div className={s.estimatorText}>
        <h2 id={`${id}-title`} className={s.h2}>
          What would yours cost?
        </h2>
        <p className={s.muted}>
          Set the footprint in blocks. This is a rough estimate from size alone:
          the exact price and timeline are agreed after we talk.
        </p>

        <label className={s.range} htmlFor={`${id}-w`}>
          <span>Width</span>
          <output htmlFor={`${id}-w`}>{width} blocks</output>
          <input
            id={`${id}-w`}
            type="range"
            min={16}
            max={MAX}
            step={1}
            value={width}
            onChange={(e) => setWidth(Number(e.target.value))}
          />
        </label>
        <label className={s.range} htmlFor={`${id}-l`}>
          <span>Length</span>
          <output htmlFor={`${id}-l`}>{length} blocks</output>
          <input
            id={`${id}-l`}
            type="range"
            min={16}
            max={MAX}
            step={1}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
          />
        </label>

        <div className={s.quoteBox} aria-live="polite">
          <div>
            <span className={s.muted}>About</span>
            <strong className={s.bigNumber}>€{price}</strong>
          </div>
          <div>
            <span className={s.muted}>Ready in</span>
            <strong className={s.bigNumber}>{time}</strong>
          </div>
        </div>

        <Link href="/contact" className={`${s.btn} ${s.btnGrass}`}>
          Order a map this size
        </Link>
      </div>

      <figure className={s.plotWrap}>
        <div className={s.plot} aria-hidden="true">
          <div
            className={s.plotArea}
            style={{ "--w": width / MAX, "--l": length / MAX } as React.CSSProperties}
          />
        </div>
        <figcaption className={s.muted}>
          {width} × {length} blocks takes {chunks} chunks. One square of the
          grid is 4 × 4 chunks.
        </figcaption>
      </figure>
    </section>
  );
}
