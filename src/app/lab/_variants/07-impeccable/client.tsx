"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import s from "./styles.module.css";

// ── Достижения ──
// Тосты выезжают справа по одному, когда секция попадает в экран, —
// как «Advancement made!» в игре. Без JS и при «меньше движения» они
// просто стоят на месте.
export function AdvancementToasts({ items }: { items: { id: string; title: string; text: string }[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setLive(true);
        io.disconnect();
      }
    }, { threshold: 0.4 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <ul ref={ref} className={s.toasts} data-live={live}>
      {items.map((item, i) => (
        <li key={item.id} className={s.toast} style={{ animationDelay: `${i * 450}ms` }}>
          <span className={s.toastIcon} aria-hidden="true" />
          <span>
            <span className={s.yellow}>Advancement made!</span>
            <span className={s.white}>
              {item.title} {item.text}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

// ── Инвентарь ──
// Слоты — кнопки. Наведение показывает игровой тултип; клик (и тап на
// телефоне, где наведения нет) выбирает предмет, и он описан в панели
// рядом, со ссылкой на страницу работы. Стрелки двигают выбор.
type Item = {
  slug: string;
  title: string;
  tag: string;
  image: string;
  size: string;
  deadline: string;
  price: string;
  summary: string;
};

const SLOTS = 27;

export function Inventory({ items, headingId }: { items: Item[]; headingId: string }) {
  const [selected, setSelected] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const item = items[selected];

  function onKey(e: React.KeyboardEvent, i: number) {
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 9, ArrowUp: -9 }[e.key];
    if (!step) return;
    e.preventDefault();
    const next = Math.min(items.length - 1, Math.max(0, i + step));
    setSelected(next);
    refs.current[next]?.focus();
  }

  return (
    <div className={s.invWrap}>
      <div className={s.panel}>
        <h2 id={headingId} className={s.panelTitleDark}>Recent builds</h2>
        <div className={s.slots}>
          {Array.from({ length: SLOTS }, (_, i) => {
            const it = items[i];
            if (!it) return <span key={i} className={s.slot} aria-hidden="true" />;
            return (
              <button
                key={it.slug}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                className={`${s.slot} ${s.slotFilled}`}
                aria-pressed={i === selected}
                tabIndex={i === selected ? 0 : -1}
                onClick={() => setSelected(i)}
                onKeyDown={(e) => onKey(e, i)}
              >
                <Image src={it.image} alt={it.title} fill sizes="64px" className={s.slotImg} />
                <span className={s.tooltip} role="presentation">
                  <span className={s.white}>{it.title}</span>
                  <span className={s.gray}>{it.tag}</span>
                  <span className={s.blue}>Size: {it.size}</span>
                  <span className={s.blue}>Built in: {it.deadline}</span>
                </span>
              </button>
            );
          })}
        </div>
        <p className={s.panelNote2}>Inventory</p>
      </div>

      {item && (
        <div className={s.panelDark} aria-live="polite">
          <div className={s.itemPreview}>
            <Image src={item.image} alt="" fill sizes="(min-width: 900px) 40vw, 90vw" className={s.cover} />
          </div>
          <h3 className={s.itemTitle}>{item.title}</h3>
          <p className={s.gray}>{item.tag}</p>
          <p className={s.itemText}>{item.summary}</p>
          <dl className={s.itemStats}>
            <dt>Size</dt><dd>{item.size}</dd>
            <dt>Built in</dt><dd>{item.deadline}</dd>
            <dt>Price</dt><dd>{item.price}</dd>
          </dl>
          <Link href={`/portfolio/${item.slug}`} className={`${s.btn} ${s.btnWide}`}>Open this build</Link>
        </div>
      )}
    </div>
  );
}

// ── Торговля с жителем ──
// Слева список сделок (цена → тариф), справа описание выбранной.
type Plan = { name: string; price: string; text: string };

export function Trades({ plans, headingId }: { plans: Plan[]; headingId: string }) {
  const [selected, setSelected] = useState(plans.length - 1);
  const plan = plans[selected];

  return (
    <div className={`${s.panel} ${s.trade}`}>
      <h2 id={headingId} className={s.panelTitleDark}>Build library: trades</h2>
      <div className={s.tradeGrid}>
        <div role="listbox" aria-label="Plans" className={s.tradeList}>
          {plans.map((p, i) => (
            <button
              key={p.name}
              type="button"
              role="option"
              aria-selected={i === selected}
              onClick={() => setSelected(i)}
              className={s.tradeRow}
            >
              <span className={s.tradePrice}>{p.price}</span>
              <span className={s.tradeArrow} aria-hidden="true" />
              <span>{p.name}</span>
            </button>
          ))}
        </div>
        {plan && (
          <div className={s.tradeDetail}>
            <p className={s.tradeName}>{plan.name}</p>
            <p className={s.tradeCost}>{plan.price}</p>
            <p>{plan.text}</p>
            <p className={s.tradeNote}>Subscribe to the build library, or order something of your own.</p>
          </div>
        )}
      </div>
    </div>
  );
}
