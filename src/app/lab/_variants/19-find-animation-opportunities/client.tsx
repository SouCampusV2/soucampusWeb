"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { estimateDeadlineDays, estimatePrice, formatDeadline } from "@/lib/pricing";
import { DISCORD_INVITE } from "@/lib/site";
import s from "./styles.module.css";

// Отчёт скилла в его же формате: частота → цель → длительность → функция.
// Прошло пять кандидатов из одиннадцати; остальные — в списке «Rejected».
export const APPROVED = [
  { n: 1, what: "Press feedback on every button", frequency: "Tens of times per visit", purpose: "Feedback", recipe: "scale(0.97), 140ms ease-out" },
  { n: 2, what: "Builds grid enters with a stagger", frequency: "Once per visit", purpose: "Preventing a jarring change", recipe: "opacity + translateY(8px), 50ms stagger, 300ms ease-out, once" },
  { n: 3, what: "Order steps open as an accordion", frequency: "Occasional", purpose: "State indication", recipe: "grid-rows 0fr→1fr + opacity, 200ms ease-out" },
  { n: 4, what: "Estimate crossfades when the size changes", frequency: "Occasional", purpose: "Preventing a jarring change", recipe: "opacity 0.6→1 + blur(2px)→0, 160ms" },
  { n: 5, what: "Toast confirms the copied Discord invite", frequency: "Rare", purpose: "Feedback + spatial consistency", recipe: "enters and leaves from the bottom edge (Sonner)" },
];

export const REJECTED = [
  { what: "Hover zoom on build images", why: "Seen tens of times; decoration, not feedback." },
  { what: "Parallax on the hero image", why: "No purpose beyond looking cool." },
  { what: "Countries as a scrolling marquee", why: "Constant motion on text people are trying to read." },
  { what: "Numbers counting up", why: "Data the reader wants to read should not move for style." },
  { what: "Fade-up on every section", why: "Blocks nothing jarring; it only delays content." },
  { what: "Animated nav underline", why: "Navigation is the most repeated interaction on the page." },
];

const Audit = createContext(false);

export function AuditRoot({ children }: { children: React.ReactNode }) {
  const [on, setOn] = useState(false);
  return (
    <Audit.Provider value={on}>
      <Toaster position="bottom-center" offset={96} />
      <button type="button" aria-pressed={on} aria-controls="audit-panel" onClick={() => setOn((v) => !v)} className={s.auditToggle}>
        {on ? "Hide the audit" : "Show the audit"}
      </button>
      {on && (
        <aside id="audit-panel" className={s.panel} aria-label="Animation audit">
          <p className={s.panelTitle}>Approved (5)</p>
          <ol>
            {APPROVED.map((a) => (
              <li key={a.n}>
                <span className={s.pinStatic}>{a.n}</span>
                <span>
                  <b>{a.what}</b>
                  <br />
                  {a.frequency}. {a.purpose}.
                  <br />
                  <code>{a.recipe}</code>
                </span>
              </li>
            ))}
          </ol>
          <p className={s.panelTitle}>Rejected ({REJECTED.length})</p>
          <ul>
            {REJECTED.map((r) => (
              <li key={r.what}>
                <b>{r.what}.</b> {r.why}
              </li>
            ))}
          </ul>
        </aside>
      )}
      {children}
    </Audit.Provider>
  );
}

/** Номерная метка у одобренной анимации — видна только в режиме аудита. */
export function Pin({ n }: { n: number }) {
  const on = useContext(Audit);
  if (!on) return null;
  return <span className={s.pin} aria-hidden="true">{n}</span>;
}

// №2 — ступенчатое появление сетки, один раз.
export function StaggerGrid({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setState("hidden");
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setState("shown");
        io.disconnect();
      }
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={s.grid} data-stagger={state}>
      {children}
    </div>
  );
}

// №3 — аккордеон шагов.
export function Steps({ steps }: { steps: { title: string; text: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ol className={s.steps}>
      {steps.map((step, i) => (
        <li key={step.title}>
          <button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className={`${s.stepBtn} ${s.press}`}>
            <span className={s.stepNum}>{i + 1}</span>
            {step.title}
          </button>
          <div className={s.stepPanel} data-open={open === i}>
            <div>
              <p>{step.text}</p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

// №4 — оценка с мягкой сменой значения.
const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
export function Estimate() {
  const id = useId();
  const [size, setSize] = useState(200);
  const price = eur.format(estimatePrice(size, size));
  const time = formatDeadline(estimateDeadlineDays(size, size));
  return (
    <div className={s.estimate}>
      <label htmlFor={id}>
        Footprint: <b className={s.num}>{size} × {size}</b> blocks
      </label>
      <input id={id} type="range" min={50} max={1000} step={10} value={size} onChange={(e) => setSize(Number(e.target.value))} />
      <p aria-live="polite" className={s.estimateOut}>
        <span key={price} className={s.fadeSwap}>
          About <b className={s.num}>{price}</b>, ready in {time}
        </span>
      </p>
    </div>
  );
}

// №5 — тост после копирования.
export function CopyInvite() {
  return (
    <button
      type="button"
      className={`${s.btn} ${s.btnGhost} ${s.press}`}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(DISCORD_INVITE);
          toast.success("Discord invite copied");
        } catch {
          toast.error("Couldn't copy. Open Discord from the footer instead.");
        }
      }}
    >
      Copy Discord invite
    </button>
  );
}
