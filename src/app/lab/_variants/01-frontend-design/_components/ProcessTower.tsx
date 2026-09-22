"use client";

import { useEffect, useRef, useState } from "react";
import s from "../styles.module.css";

// Пять шагов заказа — тексты с живой главной, дословно.
//
// Номера здесь уместны (frontend-design разрешает их только для
// настоящей последовательности): шаги идут строго по порядку, и номер
// говорит «где ты в процессе».
const STEPS = [
  { title: "Request", text: "Reach out via the contact form or Discord and describe your idea." },
  { title: "Discussion", text: "We work out the details, style, timeline and price." },
  { title: "Deposit", text: "We lock in the terms and you pay a partial deposit." },
  { title: "Building", text: "I build the map and show you progress along the way." },
  { title: "Delivery", text: "Final walkthrough, revisions, remaining payment, map handover." },
];

// Башня: один блок на шаг. Снизу земля, выше камень и доски, сверху
// трава — порядок слоёв, в котором строят в игре.
const BLOCKS = ["dirt", "stone", "plank", "plank", "grass"] as const;

// Пока читаешь шаги, слева растёт башня — блок на каждый пройденный шаг.
//
// «Пройденным» шаг считается, когда его строка пересекла середину
// экрана. Ловит это IntersectionObserver с полем в одну линию посреди
// экрана (rootMargin -50% сверху и снизу), без слушателя скролла.
export function ProcessTower() {
  const [reached, setReached] = useState(0);
  const items = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const index = Number((entry.target as HTMLElement).dataset.index);
          const above = entry.boundingClientRect.top < window.innerHeight / 2;
          if (entry.isIntersecting || above) {
            setReached((r) => Math.max(r, index + 1));
          } else {
            setReached((r) => Math.min(r, index));
          }
        }
      },
      { rootMargin: "-50% 0px -50% 0px" }
    );
    items.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <section className={`${s.section} ${s.process}`} aria-labelledby="process-title">
      <div className={s.processAside}>
        <h2 id="process-title" className={s.h2}>
          How an order goes
        </h2>
        <div className={s.tower} aria-hidden="true">
          {BLOCKS.map((kind, i) => (
            <span
              key={i}
              className={`${s.block} ${s[`block_${kind}`]}`}
              data-placed={i < reached ? "true" : "false"}
            />
          ))}
        </div>
      </div>

      <ol className={s.steps}>
        {STEPS.map((step, i) => (
          <li
            key={step.title}
            ref={(el) => {
              items.current[i] = el;
            }}
            data-index={i}
            data-reached={i < reached ? "true" : "false"}
            className={s.step}
          >
            <span className={s.stepNum}>{i + 1}</span>
            <div>
              <h3 className={s.stepTitle}>{step.title}</h3>
              <p className={s.stepText}>{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
