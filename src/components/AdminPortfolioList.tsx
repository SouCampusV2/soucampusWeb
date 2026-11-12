"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Reorder, useDragControls } from "motion/react";
import { ArrowUp, ArrowDown, DotsSixVertical } from "@phosphor-icons/react";
import type { Project } from "@/lib/projects";
import { readApiError } from "@/lib/api-error";
import { INLINE_LINK, NEW_TAB } from "@/components/Button";
import { PortfolioPublishButton } from "@/components/PortfolioPublishButton";

// Список работ в /admin/portfolio с перестановкой (2026-11-12).
//
// Два способа двигать: тащить за шесть точек или стрелками вверх/вниз.
// Стрелки — не дубль ради красоты: перетаскивание недоступно с клавиатуры
// и неудобно на телефоне, а кнопку нажмёт кто угодно.
//
// Reorder из Motion, а не HTML5 drag-and-drop: тот не работает пальцем
// на телефоне вовсе. Тащится строка только за ручку (dragListener=false) —
// иначе любой клик по строке, включая ссылки Edit и View, начинал бы
// перетаскивание.
//
// Порядок меняется на экране сразу, а на сервер уходит после отпускания
// (или после стрелки) — весь список целиком, номера раздаёт сервер.
// Отказ сервера возвращает список к последнему сохранённому виду: иначе
// экран показывал бы порядок, которого на сайте нет.

type Row = Pick<
  Project,
  "slug" | "title" | "tag" | "image" | "isFeatured" | "isPublished" | "listingUrl" | "listingIsFree"
> & { images: number };

export function AdminPortfolioList({ projects }: { projects: Row[] }) {
  const [items, setItems] = useState(projects);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ref рядом со state: onDragEnd срабатывает раньше, чем React отдаст
  // новый items в замыкание, — без ref ушёл бы порядок до перетаскивания.
  const latest = useRef(projects);
  const saved = useRef(projects);

  function show(list: Row[]) {
    latest.current = list;
    setItems(list);
  }

  async function save(list: Row[]) {
    const before = saved.current.map((p) => p.slug).join("\n");
    if (list.map((p) => p.slug).join("\n") === before) return; // отпустили на месте
    setSaving(true);
    setError(null);
    const response = await fetch("/api/admin/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reorder", slugs: list.map((p) => p.slug) }),
    });
    setSaving(false);
    if (response.ok) {
      saved.current = list;
      return;
    }
    const { message } = await readApiError(response);
    setError(message ?? "Couldn't save the order.");
    show(saved.current);
  }

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const list = items.slice();
    [list[index], list[target]] = [list[target], list[index]];
    show(list);
    void save(list);
  }

  return (
    <>
      <p className="mt-2 min-h-5 text-xs" aria-live="polite">
        {error ? (
          <span className="text-red-600 dark:text-red-400" role="alert">
            {error}
          </span>
        ) : saving ? (
          <span className="text-zinc-500 dark:text-zinc-400">Saving the order…</span>
        ) : null}
      </p>

      <Reorder.Group
        as="ul"
        axis="y"
        values={items}
        onReorder={show}
        className="mt-6 divide-y divide-zinc-200 rounded-3xl border border-zinc-200 dark:divide-zinc-800 dark:border-zinc-800"
      >
        {items.map((project, index) => (
          <PortfolioRow
            key={project.slug}
            project={project}
            position={index + 1}
            first={index === 0}
            last={index === items.length - 1}
            busy={saving}
            onUp={() => move(index, -1)}
            onDown={() => move(index, 1)}
            onDrop={() => void save(latest.current)}
          />
        ))}
      </Reorder.Group>
    </>
  );
}

function PortfolioRow({
  project,
  position,
  first,
  last,
  busy,
  onUp,
  onDown,
  onDrop,
}: {
  project: Row;
  position: number;
  first: boolean;
  last: boolean;
  busy: boolean;
  onUp: () => void;
  onDown: () => void;
  onDrop: () => void;
}) {
  const controls = useDragControls();
  const arrow =
    "rounded-md p-1 text-zinc-400 transition hover:bg-zinc-950/[0.05] hover:text-zinc-950 disabled:pointer-events-none disabled:opacity-30 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50";

  return (
    <Reorder.Item
      value={project}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDrop}
      // Фон обязателен: при перетаскивании строка едет поверх соседей,
      // и прозрачная показала бы их сквозь себя.
      className="relative flex items-center gap-3 bg-[#fbfbff] p-4 first:rounded-t-3xl last:rounded-b-3xl sm:gap-4 dark:bg-zinc-950"
    >
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onPointerDown={(event) => controls.start(event)}
          aria-label={`Drag ${project.title} to reorder`}
          title="Drag to reorder"
          // touch-none: без него палец на телефоне прокручивал бы
          // страницу, а не тащил строку.
          className="cursor-grab touch-none rounded-md p-1 text-zinc-400 hover:bg-zinc-950/[0.05] hover:text-zinc-950 active:cursor-grabbing dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50"
        >
          <DotsSixVertical size={18} weight="bold" aria-hidden />
        </button>
        <div className="flex flex-col">
          <button type="button" onClick={onUp} disabled={first || busy} aria-label={`Move ${project.title} up`} className={arrow}>
            <ArrowUp size={14} weight="bold" aria-hidden />
          </button>
          <button type="button" onClick={onDown} disabled={last || busy} aria-label={`Move ${project.title} down`} className={arrow}>
            <ArrowDown size={14} weight="bold" aria-hidden />
          </button>
        </div>
      </div>

      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-zinc-100 dark:bg-zinc-900">
        {/* draggable=false: иначе браузер тащит саму картинку как файл. */}
        <Image src={project.image} alt="" fill sizes="80px" draggable={false} className="object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-semibold text-zinc-950 dark:text-zinc-50">
          <span className="truncate">{project.title}</span>
          {!project.isPublished && (
            <span className="shrink-0 rounded-full bg-zinc-950/[0.05] px-2 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-50/[0.06] dark:text-zinc-400">
              Draft
            </span>
          )}
        </p>
        <p className="mt-0.5 flex flex-wrap gap-x-3 text-xs text-zinc-500 dark:text-zinc-400">
          <span>#{position}</span>
          <span>{project.tag}</span>
          {project.isFeatured && <span>Carousel</span>}
          {project.listingUrl && (
            <span>{project.listingIsFree ? "Free on store" : "Sold on store"}</span>
          )}
          <span>{project.images} images</span>
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-4 gap-y-1 text-sm">
        <PortfolioPublishButton slug={project.slug} published={project.isPublished} />
        {/* У черновика страницы на сайте нет — там 404. */}
        {project.isPublished && (
          <Link href={`/portfolio/${project.slug}`} {...NEW_TAB} className={INLINE_LINK}>
            View
          </Link>
        )}
        <Link href={`/admin/portfolio/${project.slug}/edit`} className={`font-medium ${INLINE_LINK}`}>
          Edit
        </Link>
        {/* Черновик поста в канал витрины из этой работы (27.10). */}
        <Link
          href={`/admin/discord?tab=showcase&from=${encodeURIComponent(project.slug)}`}
          className={`hidden sm:inline ${INLINE_LINK}`}
        >
          Post to Discord
        </Link>
      </div>
    </Reorder.Item>
  );
}
