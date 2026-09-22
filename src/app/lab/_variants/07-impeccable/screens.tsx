"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";
import { SIZE_MAX, SIZE_MIN, useEstimate } from "../../_shared/useEstimate";
import s from "./styles.module.css";

// Интерактивные куски внутренних экранов варианта Inventory. Каждый —
// кусок родной грамматики игры, а не «веб-компонент в пиксельном шрифте»:
// список миров с поиском, форма «Edit Server Info», книга с перелистыванием.

// ── Select World ──────────────────────────────────────────────────────────
// Как в игре: поле поиска сверху, список строк (иконка, имя, две серые
// строки), выбранная обведена белым; действие — кнопками под списком.
// Стрелки вверх/вниз двигают выбор; открывает постройку кнопка под списком.
type World = {
  slug: string;
  title: string;
  tag: string;
  image: string;
  size: string;
  deadline: string;
  price: string;
  summary: string;
};

export function WorldList({ worlds, orderHref }: { worlds: World[]; orderHref: string }) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(worlds[0]?.slug);
  const listId = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? worlds.filter((w) => `${w.title} ${w.tag}`.toLowerCase().includes(q)) : worlds;
  }, [query, worlds]);

  // Выбор, который отфильтровали, не пропадает молча: берём первый видимый.
  const current = shown.find((w) => w.slug === selected) ?? shown[0];

  function onKey(e: React.KeyboardEvent, index: number) {
    const step = e.key === "ArrowDown" ? 1 : e.key === "ArrowUp" ? -1 : 0;
    if (!step) return;
    e.preventDefault();
    const next = shown[Math.min(shown.length - 1, Math.max(0, index + step))];
    if (!next) return;
    setSelected(next.slug);
    refs.current[next.slug]?.focus();
  }

  return (
    <div className={s.worldWrap}>
      <div>
        <label className={s.srOnly} htmlFor={`${listId}-q`}>Search worlds</label>
        <input
          id={`${listId}-q`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className={s.field}
        />
        <ul id={listId} className={s.worlds} aria-label="Worlds">
          {shown.map((w, i) => (
            <li key={w.slug}>
              <button
                ref={(el) => {
                  refs.current[w.slug] = el;
                }}
                type="button"
                className={s.world}
                aria-pressed={w.slug === current?.slug}
                tabIndex={w.slug === current?.slug ? 0 : -1}
                onClick={() => setSelected(w.slug)}
                onKeyDown={(e) => onKey(e, i)}
              >
                <span className={s.worldIcon}>
                  <Image src={w.image} alt="" fill sizes="64px" className={s.cover} />
                </span>
                <span className={s.worldText}>
                  <span className={s.white}>{w.title}</span>
                  <span className={s.gray}>{w.tag}</span>
                  <span className={s.gray}>
                    {w.size}, built in {w.deadline}
                  </span>
                </span>
              </button>
            </li>
          ))}
          {shown.length === 0 && <li className={s.empty}>No worlds match &quot;{query}&quot;</li>}
        </ul>
        <div className={s.menuRow}>
          {current ? (
            <Link href={`/portfolio/${current.slug}`} className={s.btn}>Open selected build</Link>
          ) : (
            <span className={`${s.btn} ${s.btnOff}`} aria-disabled="true">Open selected build</span>
          )}
          <Link href={orderHref} className={s.btn}>Order a map</Link>
        </div>
      </div>

      {current && (
        <div className={s.panelDark} aria-live="polite">
          <div className={s.itemPreview}>
            <Image src={current.image} alt={current.title} fill sizes="(min-width: 900px) 40vw, 90vw" className={s.cover} />
          </div>
          <h2 className={s.itemTitle}>{current.title}</h2>
          <p className={s.itemText}>{current.summary}</p>
          <dl className={s.itemStats}>
            <dt>Size</dt><dd>{current.size}</dd>
            <dt>Built in</dt><dd>{current.deadline}</dd>
            <dt>Price</dt><dd>{current.price}</dd>
          </dl>
        </div>
      )}
    </div>
  );
}

// ── Edit Server Info → калькулятор ────────────────────────────────────────
// Два поля в игровом стиле (чёрный прямоугольник в серой рамке), под ними —
// «строка сервера», которая показывает цену и срок как пинг и MOTD.
export function MapInfoForm() {
  const e = useEstimate(150);

  return (
    <div className={s.panelDark}>
      <h2 className={s.panelTitle}>Edit Map Info</h2>
      <div className={s.formGrid}>
        <label className={s.formLabel}>
          <span className={s.gray}>Map width (blocks)</span>
          <input
            type="number"
            inputMode="numeric"
            min={SIZE_MIN}
            max={SIZE_MAX}
            value={e.width}
            onChange={(ev) => e.setWidth(ev.target.value)}
            className={s.field}
          />
        </label>
        <label className={s.formLabel}>
          <span className={s.gray}>Map length (blocks)</span>
          <input
            type="number"
            inputMode="numeric"
            min={SIZE_MIN}
            max={SIZE_MAX}
            value={e.height}
            onChange={(ev) => e.setHeight(ev.target.value)}
            className={s.field}
          />
        </label>
      </div>
      <div className={s.server} aria-live="polite">
        <span className={s.serverIconBlock} aria-hidden="true" />
        <span className={s.serverText}>
          <span className={s.white}>
            Your map, {e.w}×{e.h}
          </span>
          <span className={s.yellowInline}>from {e.priceLabel}</span>
          <span className={s.gray}>Estimated build time: {e.deadline}</span>
        </span>
      </div>
      <p className={s.panelNote}>An estimate, not a quote. The final price is agreed on Discord.</p>
    </div>
  );
}

// ── Written Book ──────────────────────────────────────────────────────────
// Книга с перелистыванием: номер страницы сверху справа, стрелки внизу.
// На каждой странице — один вопрос и ответ. ← и → листают, когда книга в
// фокусе. Все страницы лежат в серверном HTML (скрытые — через hidden), так
// что ответы видны поисковику и без JS, хотя глазу показана одна страница.
type BookPage = { title: string; body: string };

export function Book({ pages, label }: { pages: readonly BookPage[]; label: string }) {
  const [index, setIndex] = useState(0);
  const last = pages.length - 1;
  const go = (step: number) => setIndex((i) => Math.min(last, Math.max(0, i + step)));

  return (
    <div
      className={s.book}
      role="group"
      aria-roledescription="book"
      aria-label={label}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }}
    >
      <p className={s.bookPageNo} aria-live="polite">
        Page {index + 1} of {pages.length}
      </p>
      {pages.map((page, i) => (
        <article key={page.title} hidden={i !== index} className={s.bookPage}>
          <h3 className={s.bookTitle}>{page.title}</h3>
          <p>{page.body}</p>
        </article>
      ))}
      <div className={s.bookNav}>
        <button type="button" onClick={() => go(-1)} disabled={index === 0} aria-label="Previous page" className={s.bookArrow}>
          ◀
        </button>
        <button type="button" onClick={() => go(1)} disabled={index === last} aria-label="Next page" className={s.bookArrow}>
          ▶
        </button>
      </div>
    </div>
  );
}
