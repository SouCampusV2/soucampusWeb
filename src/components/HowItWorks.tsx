"use client";

import { useEffect, useRef, useState } from "react";
import {
  EnvelopeSimple,
  ChatCircleText,
  Wallet,
  Cube,
  Gift,
  PaperPlaneTilt,
} from "@phosphor-icons/react/dist/ssr";
import { PixelFan } from "@/components/brand/PixelArt";
import { Button, TERTIARY_UNDERLINE } from "@/components/Button";

// Иконка на шаг (2026-10-06, набор выбран владельцем): письмо → разговор
// → кошелёк → блок → подарок. Простые и однозначные, без игровых
// метафор. `dist/ssr` — как на /about: иконкам не нужен
// контекст Phosphor, и так они не тянут его в бандл.
const steps = [
  { title: "Request", icon: EnvelopeSimple, text: "Reach out via the contact form or Discord and describe your idea." },
  { title: "Discussion", icon: ChatCircleText, text: "We work out the details, style, timeline and price." },
  { title: "Deposit", icon: Wallet, text: "We lock in the terms and you pay a partial deposit." },
  { title: "Building", icon: Cube, text: "I build the map and show you progress along the way." },
  { title: "Delivery", icon: Gift, text: "Final walkthrough, revisions, remaining payment, map handover." },
];

// С 16.11 (бренд, docs/BRAND-IDEAS.md, раздел 3; лаборатория — вариант З5):
// рядом с шагами пиксельный веер SouCampus. Пока секция проезжает через
// экран, его части заливаются по шагам: шаг 1 — солнце, шаги 2–5 — по три
// лепестка. Пройденные шаги ярче.
//
// Решения владельца, чтобы не вернуть отвергнутое:
//   · веер пиксельный, не гладкий;
//   · секция ОБЫЧНОЙ длины. Заливка идёт от положения секции на экране,
//     а не от «прилипшего» веера с длинной прокруткой — тот вариант
//     (15.11) вышел слишком длинным и с огромными отступами;
//   · монохром без окантовки: в светлой теме пустой веер белый, залитый
//     чёрный, в тёмной наоборот;
//   · фон нейтральный везде — и на главной, и на /contact (до 16.11 был
//     лайм и синий по акценту страницы).

/** Сколько шагов пройдено (0–5) — по тому, как секция проезжает через экран. */
function useScrollStep() {
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    let frame = 0;
    const measure = () => {
      frame = 0;
      const el = ref.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 — верх секции у низа экрана, 1 — низ секции на 70% высоты экрана.
      const t = (vh - r.top) / (r.height + vh * 0.3);
      setStep(Math.max(0, Math.min(5, Math.floor(t * 6))));
    };
    // Прокрутка приходит чаще кадров — считаем не чаще раза за кадр.
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);
  return { ref, step };
}

// Шестой пункт «Your map is next» — везде (17.11, владелец). showContact —
// кнопка Contact me под ним: только на главной, на самой /contact она вела
// бы на ту же страницу.
export function HowItWorks({ showContact = false }: { showContact?: boolean }) {
  const { ref, step } = useScrollStep();
  return (
    <section
      ref={ref}
      // Цвета веера — CSS-переменные: светлая тема белый → чёрный, тёмная наоборот.
      className="bg-zinc-100 py-16 [--fan-off:#ffffff] [--fan-on:#09090b] sm:py-20 dark:bg-zinc-900 dark:[--fan-off:#09090b] dark:[--fan-on:#fafafa]"
    >
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <PixelFan
          step={step}
          on="var(--fan-on)"
          off="var(--fan-off)"
          className="order-2 mx-auto w-56 md:order-1 md:w-full md:max-w-xs"
        />
        <div className="order-1 md:order-2">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
            How an order works
          </h2>
          <p className="mt-2 max-w-xl text-zinc-700 dark:text-zinc-300">
            From the first message to a finished map — a transparent process in
            5 steps.
          </p>
          {/* Сетка — на обёртке, список внутри «contents»: пять шагов в две
              колонки оставляют пустой шестую ячейку, и кнопка встаёт в неё,
              на одну линию с шагами. Внутрь <ol> её класть нельзя — там
              только <li>. */}
          <div className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <ol className="contents">
            {steps.map((s, i) => (
              <li
                key={s.title}
                className={`flex gap-3 transition-opacity duration-300 ${step > i ? "opacity-100" : "opacity-45"}`}
              >
                <span className="w-10 shrink-0 text-2xl font-bold tabular-nums text-blue-800 dark:text-blue-400">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div>
                  {/* Иконка справа от названия шага, цветом текста (просьба
                      владельца 06.10). */}
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    {s.title}
                    <s.icon size={22} aria-hidden="true" className="shrink-0" />
                  </h3>
                  <p className="mt-1 max-w-xs text-sm text-zinc-700 dark:text-zinc-300">{s.text}</p>
                </div>
              </li>
            ))}
          </ol>
          {/* Шестой пункт — не шаг, а приглашение (17.11, владелец: «сделай
              06 с заголовком, подписью и кнопкой, синей, наравне с
              цифрами»). Та же разметка, что у шага, номер тем же синим;
              всегда яркий — прокрутка его не приглушает. Кнопка tertiary,
              синяя, как ссылки секции на /contact. */}
          <div className="flex gap-3">
              <span className="w-10 shrink-0 text-2xl font-bold tabular-nums text-blue-800 dark:text-blue-400">
                06
              </span>
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  Your map is next
                  <PaperPlaneTilt size={22} aria-hidden="true" className="shrink-0" />
                </h3>
                <p className="mt-1 max-w-xs text-sm text-zinc-700 dark:text-zinc-300">
                  One message is all it takes to start.
                </p>
                {showContact && (
                  <Button
                    href="/contact"
                    variant="tertiary"
                    pageTransition
                    className="mt-1"
                    colorClassName={`text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 ${TERTIARY_UNDERLINE}`}
                  >
                    Contact me
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
