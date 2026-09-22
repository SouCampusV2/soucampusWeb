"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Entry = { slug: string; label: string; skill: string; idea: string };

// Переключатель вариантов — плашка внизу экрана, как в прошлой лаборатории.
//
// ⚠️ Это «хром» лаборатории, а не часть какого-либо варианта: поэтому он
// нарочно нейтральный (серый, системный шрифт) и не берёт ничего из
// вариантов. Иначе он бы красил собой каждый из двадцати пяти дизайнов.
//
// Клавиши: [ и ] — предыдущий и следующий вариант, L — список.
// Ввод в поля (калькуляторы в вариантах) клавиши не перехватывает.
export function LabSwitcher({ current, variants, bottom }: { current: number; variants: Entry[]; bottom?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [modal, setModal] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const total = variants.length;
  const prev = variants[(current - 1 + total) % total];
  const next = variants[(current + 1) % total];
  const entry = variants[current];

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "[") router.push(`/lab?v=${prev.slug}`);
      else if (e.key === "]") router.push(`/lab?v=${next.slug}`);
      else if (e.key === "l" || e.key === "L") setOpen((o) => !o);
      else if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router, prev.slug, next.slug]);

  // Пока у варианта открыто модальное окно (шторка Vaul, диалог Radix),
  // переключатель прячется: иначе он накрывает кнопки внутри окна. Такие
  // окна ставят <body> pointer-events: none — на это и смотрим.
  useEffect(() => {
    const body = document.body;
    const check = () => setModal(body.style.pointerEvents === "none");
    const mo = new MutationObserver(check);
    mo.observe(body, { attributes: true, attributeFilter: ["style"] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (!panelRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open]);

  const btn =
    "grid h-10 w-10 shrink-0 place-items-center rounded-full text-lg text-neutral-200 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white";

  return (
    <div
      ref={panelRef}
      className="fixed inset-x-0 bottom-4 z-[2147483000] flex flex-col items-center gap-2 px-3 font-[system-ui,sans-serif]"
      style={{
        colorScheme: "dark",
        bottom: bottom ? `calc(${bottom}px + env(safe-area-inset-bottom))` : undefined,
        visibility: modal ? "hidden" : undefined,
      }}
    >
      {open && (
        <div
          id="lab-list"
          className="max-h-[60dvh] w-full max-w-md overflow-y-auto rounded-2xl bg-neutral-900/95 p-2 text-sm text-neutral-200 shadow-2xl ring-1 ring-white/10 backdrop-blur"
        >
          <ol>
            {variants.map((v, i) => (
              <li key={v.slug}>
                <Link
                  href={`/lab?v=${v.slug}`}
                  onClick={() => setOpen(false)}
                  aria-current={i === current ? "page" : undefined}
                  className={`flex gap-3 rounded-xl px-3 py-2 hover:bg-white/10 ${
                    i === current ? "bg-white/15" : ""
                  }`}
                >
                  <span className="w-5 shrink-0 text-right tabular-nums text-neutral-500">{i + 1}</span>
                  <span className="min-w-0">
                    <span className="font-semibold text-white">{v.label}</span>{" "}
                    <span className="text-neutral-400">/ {v.skill}</span>
                    <span className="block text-neutral-400">{v.idea}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="flex max-w-full items-center gap-1 rounded-full bg-neutral-900/95 p-1 text-sm text-neutral-200 shadow-2xl ring-1 ring-white/10 backdrop-blur">
        <Link href={`/lab?v=${prev.slug}`} className={btn} aria-label={`Previous: ${prev.label}`}>
          ‹
        </Link>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-controls="lab-list"
          className="min-w-0 rounded-full px-3 py-2 text-left hover:bg-white/10"
        >
          <span className="tabular-nums text-neutral-500">
            {current + 1}/{total}
          </span>{" "}
          <span className="font-semibold text-white">{entry.label}</span>{" "}
          <span className="hidden text-neutral-400 sm:inline">/ {entry.skill}</span>
        </button>
        <Link href={`/lab?v=${next.slug}`} className={btn} aria-label={`Next: ${next.label}`}>
          ›
        </Link>
      </div>
    </div>
  );
}
