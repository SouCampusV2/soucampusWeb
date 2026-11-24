// ⚠️ ЛАБОРАТОРИЯ главной, круг 3 (24.11). Выбрано и перенесено: статистика
// С1, бенто Р2+. Здесь: финал страниц (круг 3) и варианты корзины.
// Владелец называет номера — выбранное переносится, папка lab/home
// удаляется. На проде страницы нет (notFound), поиску закрыта.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllProjects } from "@/lib/projects";
import { getAllProducts } from "@/lib/products";
import { FinaleOrbit, FinalePixelSky } from "./FinaleVariants";
import { EmptyChest, EmptyFlower, EmptyShelf, FilledGlass, FilledReceipt } from "./CartVariants";

export const metadata: Metadata = { title: "Home lab", robots: { index: false, follow: false } };

function Chapter({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto max-w-6xl px-6 pt-24">
      <h1 className="text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{title}</h1>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">{text}</p>
    </div>
  );
}

function Label({ n, name, note }: { n: string; name: string; note?: string }) {
  return (
    <div className="mx-auto mt-20 max-w-6xl px-6 pb-6">
      <p className="flex flex-wrap items-baseline gap-3">
        <span className="rounded-full bg-orange-500 px-3 py-1 text-sm font-bold text-zinc-950">{n}</span>
        <span className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{name}</span>
        {note && <span className="text-sm text-zinc-500 dark:text-zinc-400">{note}</span>}
      </p>
    </div>
  );
}

export default async function HomeLab() {
  if (process.env.VERCEL_ENV === "production") notFound();
  const [projects, products] = await Promise.all([getAllProjects(), getAllProducts()]);
  const newest = [...projects].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  const maps = [...products].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  return (
    <main className="flex-1 pb-32">
      <Chapter
        title="Финал страниц — круг 3"
        text="Обе темы: переключите тему в футере и посмотрите оба. Кнопки — таблетки (квадратными их делала ошибка в Button, исправлена во всём сайте)."
      />
      <Label n="Ф4" name="Пиксельное небо" note="Утро в светлой теме, ночь в тёмной; небо полосами, холмы из блоков в три слоя, ёлки и цветы; текст на стекле" />
      <FinalePixelSky />
      <Label n="Ф5" name="Орбита про то, что строится" note="В центре настоящая работа, на кольцах виды построек, стеклянные плашки и карточки, свечение слоями" />
      {newest && <FinaleOrbit image={newest.image} title={newest.title} />}

      <Chapter
        title="Корзина"
        text="Пустая — вместо иконки. Полная — два вида; данные настоящие, кнопки здесь никуда не платят."
      />
      <Label n="КП1" name="Пустой сундук" note="Пиксельный сундук, открытый и пустой, с искрами" />
      <EmptyChest />
      <Label n="КП2" name="Цветок в свечении" note="Знак покачивается" />
      <EmptyFlower />
      <Label n="КП3" name="Сразу витрина" note="«Пусто» одной строкой и три свежие карты" />
      <div className="px-6"><EmptyShelf products={maps} /></div>
      <Label n="КЗ1" name="Строки и стеклянная сводка" note="Крупные картинки, итог крупно, обещания с иконками" />
      <div className="px-6"><FilledGlass products={maps} /></div>
      <Label n="КЗ2" name="Чек" note="Позиции с пунктиром до цены, зубчатый низ, кнопка под чеком" />
      <div className="px-6"><FilledReceipt products={maps} /></div>
    </main>
  );
}
