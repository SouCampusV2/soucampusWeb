"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useId, useState } from "react";
import { SIZE_MAX, SIZE_MIN, useEstimate } from "../../_shared/useEstimate";
import { CONTACT } from "../../_shared/pages";
import s from "./styles.module.css";

// Интерактивные куски страниц студии варианта Lenses. Каждый приём
// подписан линзой, из которой он взят (как на лендинге):
//   Jakub — незаметная полировка: общий layout, мягкие входы, выход тише;
//   Jhey  — CSS-игрушка: блок травы, растянутый в плиту карты;
//   Emil  — формы и частые действия: движения нет, отклик мгновенный.

const SPRING = { type: "spring" as const, duration: 0.45, bounce: 0 };
const ENTER = { opacity: 0, y: 8, filter: "blur(4px)" };
const SHOWN = { opacity: 1, y: 0, filter: "blur(0px)" };
// Jakub: выход тише входа — короче и без сдвига на всю высоту.
const EXIT = { opacity: 0, scale: 0.97, filter: "blur(2px)", transition: { duration: 0.15 } };

// ── Portfolio: фильтр с общим layout ──────────────────────────────────────

type Work = { slug: string; title: string; tag: string; image: string; size: string };

export function WorkFilter({ works }: { works: Work[] }) {
  const tags = ["All", ...Array.from(new Set(works.map((w) => w.tag)))];
  const [tag, setTag] = useState("All");
  const shown = tag === "All" ? works : works.filter((w) => w.tag === tag);

  return (
    <LayoutGroup>
      {/* Jakub «Shared layout»: подложка переезжает к выбранной вкладке,
          а не гаснет в одной и загорается в другой. */}
      <div role="tablist" aria-label="Filter by type" className={s.tabs}>
        {tags.map((t) => (
          <button key={t} type="button" role="tab" aria-selected={tag === t} onClick={() => setTag(t)} className={s.tab}>
            {tag === t && <motion.span layoutId="lens-filter" className={s.tabBg} transition={SPRING} />}
            <span className={s.tabText}>
              {t}
              <span className={s.tabCount}>{t === "All" ? works.length : works.filter((w) => w.tag === t).length}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Jakub: карточки не прыгают на новые места — layout анимирует
          перестановку, уходящие гаснут тише, чем появляются новые. */}
      <motion.ul layout className={s.grid} style={{ listStyle: "none", padding: 0 }}>
        <AnimatePresence mode="popLayout" initial={false}>
          {shown.map((w) => (
            <motion.li key={w.slug} layout initial={ENTER} animate={SHOWN} exit={EXIT} transition={SPRING}>
              <Link href={`/portfolio/${w.slug}`} className={s.card}>
                <span className={s.cardImg}>
                  <Image src={w.image} alt="" fill sizes="(min-width: 900px) 30vw, 100vw" />
                </span>
                <span className={s.cardTitle}>{w.title}</span>
                <span className={s.muted}>{w.tag}, {w.size}</span>
              </Link>
            </motion.li>
          ))}
        </AnimatePresence>
      </motion.ul>
    </LayoutGroup>
  );
}

// ── Contact: плита карты и число, которое меняется тихо ───────────────────

/** Jakub «Contextual transitions»: новое значение проявляется, старое гаснет. */
function Rolling({ value }: { value: string }) {
  return (
    <span className={s.rolling}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: -6, filter: "blur(2px)", transition: { duration: 0.12 } }}
          transition={SPRING}
          style={{ display: "inline-block" }}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

export function SlabEstimator() {
  const e = useEstimate(150);
  const id = useId();
  // Jhey «think in cuboids»: тот же блок травы, что на лендинге, но его
  // ширину и глубину задаёт размер карты. Пропорция — от большей стороны,
  // чтобы 400×100 был вытянутой плитой, а не кубом.
  const longest = Math.max(e.w, e.h);
  const wRatio = e.w / longest;
  const dRatio = e.h / longest;

  return (
    <div className={s.slabWrap}>
      <div className={s.card} style={{ padding: 24 }}>
        <h2 className={s.h2} style={{ fontSize: 28 }}>{CONTACT.estimateTitle}</h2>
        {/* Emil: поля ввода без анимаций — это форма, её трогают часто. */}
        <div className={s.formRow}>
          <label htmlFor={`${id}-w`}>
            Width, blocks
            <input id={`${id}-w`} type="number" inputMode="numeric" min={SIZE_MIN} max={SIZE_MAX} value={e.width} onChange={(ev) => e.setWidth(ev.target.value)} className={s.input} />
          </label>
          <label htmlFor={`${id}-h`}>
            Length, blocks
            <input id={`${id}-h`} type="number" inputMode="numeric" min={SIZE_MIN} max={SIZE_MAX} value={e.height} onChange={(ev) => e.setHeight(ev.target.value)} className={s.input} />
          </label>
        </div>
        <dl className={s.result} aria-live="polite">
          <div>
            <dt className={s.muted}>Price from</dt>
            <dd><Rolling value={e.priceLabel} /></dd>
          </div>
          <div>
            <dt className={s.muted}>Timeline</dt>
            <dd><Rolling value={e.deadline} /></dd>
          </div>
        </dl>
        <p className={s.muted} style={{ fontSize: 14, margin: "14px 0 0" }}>{CONTACT.estimateNote}</p>
      </div>

      <div className={s.slabScene} aria-hidden="true">
        <div
          className={s.slab}
          style={{
            ["--w" as string]: `calc(var(--size) * ${wRatio})`,
            ["--d" as string]: `calc(var(--size) * ${dRatio})`,
          }}
        >
          <span className={s.slabTop} />
          <span className={s.slabFront} />
          <span className={s.slabBack} />
          <span className={s.slabLeft} />
          <span className={s.slabRight} />
        </div>
        <p className={s.slabLabel}>{e.w} × {e.h}</p>
      </div>
    </div>
  );
}

// ── FAQ: аккордеон с высотой auto ─────────────────────────────────────────

export function Faq({ items }: { items: readonly { question: string; answer: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className={s.faq}>
      {items.map((item, i) => {
        const on = open === i;
        return (
          <div key={item.question} className={s.faqItem}>
            <h3 style={{ margin: 0 }}>
              <button type="button" aria-expanded={on} onClick={() => setOpen(on ? null : i)} className={s.faqQ}>
                {item.question}
                {/* Jakub: иконка меняет смысл (+ → ×) поворотом, а не подменой. */}
                <motion.span animate={{ rotate: on ? 45 : 0 }} transition={SPRING} className={s.faqIcon} aria-hidden="true">
                  +
                </motion.span>
              </button>
            </h3>
            <AnimatePresence initial={false}>
              {on && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0, transition: { duration: 0.18 } }}
                  transition={SPRING}
                  style={{ overflow: "hidden" }}
                >
                  <p className={s.faqA}>{item.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}

// ── About: подсветка, которая переезжает за указателем ────────────────────

export function SkillHover({ groups }: { groups: { title: string; items: readonly string[] }[] }) {
  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className={s.skillGroups} onPointerLeave={() => setHover(null)}>
      {groups.map((group) => (
        <div key={group.title}>
          <h3 className={s.muted} style={{ fontSize: 15, fontWeight: 600, margin: "0 0 10px" }}>{group.title}</h3>
          <ul className={s.skills}>
            {group.items.map((item) => (
              <li key={item} onPointerEnter={() => setHover(item)} className={s.skill}>
                {/* Jakub: одна подложка на все пункты, переезжает, а не мигает. */}
                {hover === item && <motion.span layoutId="lens-skill" className={s.skillBg} transition={SPRING} />}
                <span className={s.skillText}>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
