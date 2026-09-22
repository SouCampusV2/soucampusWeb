"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Toaster, toast } from "sonner";
import { DISCORD_INVITE } from "@/lib/site";
import s from "./styles.module.css";

// Тосты — Sonner. Внизу по центру: вход и выход по одному краю
// («spatial consistency»), смахиваются пальцем.
export function Toasts() {
  return <Toaster position="bottom-center" offset={96} toastOptions={{ className: s.toast }} />;
}

// Кнопка «скопировать инвайт». Действие без видимого результата —
// ровно тот случай, когда тост нужен: подтвердить, что интерфейс услышал.
export function CopyDiscord({ className }: { className: string }) {
  async function copy() {
    try {
      await navigator.clipboard.writeText(DISCORD_INVITE);
      toast.success("Discord invite copied", { description: "Paste it into Discord to join the server." });
    } catch {
      toast.error("Couldn't copy the link", { description: "Your browser blocked the clipboard. Open Discord instead.", action: { label: "Open", onClick: () => window.open(DISCORD_INVITE, "_blank") } });
    }
  }
  return (
    <button type="button" onClick={copy} className={className}>
      Copy Discord invite
    </button>
  );
}

// Раскрытие картинки снизу вверх (clip-path inset), один раз, когда
// до неё доскроллили на 100px. Без JS картинка просто видна.
export function Reveal({ children, className }: { children: React.ReactNode; className: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"idle" | "hidden" | "shown">("idle");

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (el.getBoundingClientRect().top < window.innerHeight) return;
    setState("hidden");
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setState("shown");
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -100px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} data-reveal={state}>
      {children}
    </div>
  );
}

// Слайдер сравнения: верхняя картинка обрезана clip-path справа на
// (100 − позиция)%. Указатель захватывается (setPointerCapture), чтобы
// тянуть можно было и за пределами элемента. Стрелки двигают на 5%.
export function Compare({ a, b, title }: { a: string; b: string; title: string }) {
  const [pos, setPos] = useState(50);
  const box = useRef<HTMLDivElement>(null);

  function fromPointer(clientX: number) {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  }

  return (
    <div
      ref={box}
      className={s.compare}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        fromPointer(e.clientX);
      }}
      onPointerMove={(e) => e.buttons === 1 && fromPointer(e.clientX)}
    >
      <Image src={b} alt={`${title}, second angle`} fill sizes="(min-width: 900px) 880px, 100vw" />
      <div className={s.compareTop} style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <Image src={a} alt={`${title}, first angle`} fill sizes="(min-width: 900px) 880px, 100vw" />
      </div>
      <div
        role="slider"
        tabIndex={0}
        aria-label="Compare the two angles"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pos)}
        className={s.handle}
        style={{ left: `${pos}%` }}
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") setPos((p) => Math.max(0, p - 5));
          if (e.key === "ArrowRight") setPos((p) => Math.min(100, p + 5));
        }}
      />
    </div>
  );
}

// Вкладки с «идеальным» переходом цвета: список нарисован дважды.
// Нижний — обычный, верхний — «активный» (тёмный фон, белый текст) и
// обрезан clip-path'ом ровно по активной вкладке. Меняется вкладка —
// анимируется только clip-path, и цвет перетекает целиком.
type Review = { slug: string; name: string; role: string; text: string };

export function ClipTabs({ reviews }: { reviews: Review[] }) {
  const [active, setActive] = useState(0);
  const [clip, setClip] = useState("inset(0 100% 0 0 round 999px)");
  const list = useRef<HTMLDivElement>(null);
  const tabs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const el = tabs.current[active];
    const box = list.current;
    if (!el || !box) return;
    const { offsetLeft: left, offsetWidth: width } = el;
    const right = box.offsetWidth - left - width;
    setClip(`inset(0 ${right}px 0 ${left}px round 999px)`);
  }, [active]);

  const r = reviews[active];

  return (
    <div>
      <div ref={list} className={s.tabs}>
        <div role="tablist" aria-label="Clients" className={s.tabRow}>
          {reviews.map((x, i) => (
            <button
              key={x.slug}
              ref={(el) => {
                tabs.current[i] = el;
              }}
              role="tab"
              aria-selected={i === active}
              onClick={() => setActive(i)}
              className={s.tab}
            >
              {x.name}
            </button>
          ))}
        </div>
        <div aria-hidden="true" className={`${s.tabRow} ${s.tabRowActive}`} style={{ clipPath: clip }}>
          {reviews.map((x) => (
            <span key={x.slug} className={s.tab}>{x.name}</span>
          ))}
        </div>
      </div>
      {r && (
        <figure key={r.slug} className={s.quote}>
          <blockquote>{r.text}</blockquote>
          <figcaption className={s.muted}>{r.role}</figcaption>
        </figure>
      )}
    </div>
  );
}

// Аккордеон: высота через grid-template-rows 0fr → 1fr (анимируется без
// замера), плюс opacity. 220ms ease-out: открывается — сразу отвечает.
export function StepsAccordion({ steps }: { steps: { title: string; text: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ol className={s.steps}>
      {steps.map((step, i) => {
        const isOpen = open === i;
        return (
          <li key={step.title}>
            <button type="button" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : i)} className={s.stepBtn}>
              <span className={s.stepNum}>{i + 1}</span>
              <span className={s.stepTitle}>{step.title}</span>
              <span aria-hidden="true" className={s.chev} data-open={isOpen} />
            </button>
            <div className={s.panel} data-open={isOpen}>
              <div>
                <p>{step.text}</p>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
