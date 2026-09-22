"use client";

import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Check, Copy } from "@phosphor-icons/react";
import { useState } from "react";
import { DISCORD_INVITE } from "@/lib/site";
import s from "./styles.module.css";

// Линза Jakub Krehel (главная для лендинга): вход = opacity + 8px + blur
// 4px, пружина без отскока 0.45s. «Если движение заметно — его много».
const ENTER = { opacity: 0, y: 8, filter: "blur(4px)" };
const SHOWN = { opacity: 1, y: 0, filter: "blur(0px)" };
const SPRING = { type: "spring" as const, duration: 0.45, bounce: 0 };

export function Lenses({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Появление при входе в кадр, один раз, с шагом по индексу. */
export function Enter({ children, i = 0, className }: { children: React.ReactNode; i?: number; className?: string }) {
  return (
    <motion.div
      className={className}
      initial={ENTER}
      whileInView={SHOWN}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ ...SPRING, delay: i * 0.05 }}
    >
      {children}
    </motion.div>
  );
}

// Смена иконки по состоянию (Jakub, «Contextual icon transitions»):
// copy → check через opacity + scale + blur, а не мгновенная подмена.
export function CopyInvite() {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(DISCORD_INVITE);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.open(DISCORD_INVITE, "_blank");
    }
  }
  return (
    <button type="button" onClick={copy} className={s.ghost} aria-live="polite">
      <span className={s.iconSlot}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={copied ? "check" : "copy"}
            initial={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
            transition={{ duration: 0.2 }}
            className={s.icon}
          >
            {copied ? <Check size={16} weight="bold" /> : <Copy size={16} />}
          </motion.span>
        </AnimatePresence>
      </span>
      {copied ? "Invite copied" : "Copy Discord invite"}
    </button>
  );
}

// Выбор тарифа: общая подложка переезжает (layoutId, Jakub «Shared
// layout»), описание сменяется с тихим выходом (выход мягче входа).
type Plan = { name: string; price: string; text: string };
export function Plans({ plans }: { plans: Plan[] }) {
  const [i, setI] = useState(plans.length - 1);
  const plan = plans[i];
  return (
    <div className={s.plans}>
      <div role="tablist" aria-label="Plans" className={s.planTabs}>
        {plans.map((p, j) => (
          <button key={p.name} role="tab" aria-selected={i === j} onClick={() => setI(j)} className={s.planTab}>
            {i === j && <motion.span layoutId="lens-plan" className={s.planBg} transition={SPRING} />}
            <span className={s.planTabText}>
              <b>{p.name}</b>
              <span>{p.price}</span>
            </span>
          </button>
        ))}
      </div>
      <div className={s.planBody}>
        <AnimatePresence mode="wait" initial={false}>
          {plan && (
            <motion.div
              key={plan.name}
              initial={ENTER}
              animate={SHOWN}
              exit={{ opacity: 0, y: -4, filter: "blur(2px)", transition: { duration: 0.15 } }}
              transition={SPRING}
            >
              <p className={s.planPrice}>{plan.price}</p>
              <p className={s.muted}>{plan.text}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
