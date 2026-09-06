"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { List, X } from "@phosphor-icons/react";
import { useDismiss } from "@/lib/useDismiss";

// Разделы админки.
//
// ⚠️ ГАМБУРГЕР НА ТЕЛЕФОНЕ, а не прокручиваемая лента (замечание
// владельца 2026-09-06). Лента появилась 14 августа и решала настоящую
// задачу — шесть разделов не помещаются в 360px, — но решала её плохо:
// горизонтальная прокрутка НИЧЕМ О СЕБЕ НЕ СООБЩАЕТ. Полоски прокрутки
// на телефоне нет, обрезанный на середине пункт выглядит как край
// экрана, и «Announce» с «Comments» просто не существовали для того,
// кто не догадался потянуть вбок. Спрятанное в меню честнее спрятанного
// за краем: у меню хотя бы есть кнопка.
//
// Список один на обе раскладки — правило, выведенное 1 сентября на
// меню аккаунта: две копии пунктов расходятся при первой же правке.
const SECTIONS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/moderation", label: "Queue" },
  // «Products», а не «Catalog» (2026-09-06): страница живёт по адресу
  // /admin/products, форма добавления — /admin/products/new, и в
  // разговоре это тоже «продукты». Название вкладки было единственным
  // местом, где то же самое звалось иначе.
  { href: "/admin/products", label: "Products" },
  { href: "/admin/applications", label: "Creators" },
  { href: "/admin/comments", label: "Comments" },
  { href: "/admin/announce", label: "Announce" },
];

const LINK =
  "shrink-0 whitespace-nowrap font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50";

export function AdminNav() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Тот же хук, что у всех выпадашек сайта (29.08): закрытие по клику
  // мимо и по Escape описано один раз.
  useDismiss(ref, () => setOpen(false), { enabled: open });

  return (
    <>
      {/* Десктоп: разделы в строку, как было. */}
      <nav className="hidden items-center gap-4 text-sm md:flex">
        {SECTIONS.map((section) => (
          <Link key={section.href} href={section.href} className={LINK}>
            {section.label}
          </Link>
        ))}
      </nav>

      {/* Телефон: кнопка и выпадающий список. */}
      <div ref={ref} className="relative md:hidden">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-950/[0.05] dark:text-zinc-300 dark:hover:bg-zinc-50/[0.06]"
        >
          {open ? <X size={18} /> : <List size={18} />}
          Sections
        </button>

        {open && (
          // Тот же рецепт стекла, что у остальных выпадашек
          // (DESIGN.md → «Стекло»).
          <ul className="absolute left-0 z-50 mt-2 w-52 overflow-hidden rounded-2xl border border-white/60 bg-[#fbfbff]/95 py-1 shadow-xl shadow-zinc-950/10 backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-zinc-900/95">
            {SECTIONS.map((section) => (
              <li key={section.href}>
                <Link
                  href={section.href}
                  onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-950/[0.05] dark:text-zinc-300 dark:hover:bg-zinc-50/[0.06]"
                >
                  {section.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
