"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useId, useState } from "react";
import { estimateDeadlineDays, estimatePrice, formatDeadline } from "@/lib/pricing";
import s from "./styles.module.css";

type Row = { slug: string; title: string; tag: string; size: string; deadline: string; image: string };
type SortKey = "title" | "tag" | "size";

/** «250×250» → 62 500 блоков; всё непонятное уходит в конец. */
function area(size: string) {
  const m = size.match(/(\d+)\s*[×x]\s*(\d+)/);
  return m ? Number(m[1]) * Number(m[2]) : Number.POSITIVE_INFINITY;
}

/** Адрес с изменённым параметром. Остальные параметры (в т.ч. ?v= лаборатории) сохраняются. */
function useHref() {
  const params = useSearchParams();
  const pathname = usePathname();
  return (patch: Record<string, string>) => {
    const next = new URLSearchParams(params?.toString());
    for (const [k, v] of Object.entries(patch)) next.set(k, v);
    return `${pathname}?${next.toString()}`;
  };
}

// ── Таблица работ: сортировка живёт в адресе (Navigation & State) ──
export function BuildsTable({ projects, static: isStatic = false }: { projects: Row[]; static?: boolean }) {
  return isStatic ? <Table projects={projects} sort="title" dir="asc" /> : <SortedTable projects={projects} />;
}

function SortedTable({ projects }: { projects: Row[] }) {
  const params = useSearchParams();
  const sort = (["title", "tag", "size"].includes(params?.get("sort") ?? "") ? params?.get("sort") : "title") as SortKey;
  const dir = params?.get("dir") === "desc" ? "desc" : "asc";
  return <Table projects={projects} sort={sort} dir={dir} linked />;
}

function Table({ projects, sort, dir, linked = false }: { projects: Row[]; sort: SortKey; dir: "asc" | "desc"; linked?: boolean }) {
  const sorted = [...projects].sort((a, b) => {
    const r = sort === "size" ? area(a.size) - area(b.size) : a[sort].localeCompare(b[sort], "en");
    return dir === "asc" ? r : -r;
  });

  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <caption className="sr-only">Builds, sorted by {sort}, {dir === "asc" ? "ascending" : "descending"}</caption>
        <thead>
          <tr>
            <th scope="col"><span className="sr-only">Preview</span></th>
            <SortHeader label="Build" col="title" sort={sort} dir={dir} linked={linked} />
            <SortHeader label="Type" col="tag" sort={sort} dir={dir} linked={linked} />
            <SortHeader label="Size (Blocks)" col="size" sort={sort} dir={dir} linked={linked} numeric />
            <th scope="col">Built In</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((p) => (
            <tr key={p.slug}>
              <td className={s.thumbCell}>
                <Image src={p.image} alt="" width={96} height={60} loading="lazy" className={s.thumb} />
              </td>
              <th scope="row" className={s.buildName}>
                <Link href={`/portfolio/${p.slug}`}>{p.title}</Link>
              </th>
              <td>{p.tag}</td>
              <td className={s.num}>{p.size}</td>
              <td>{p.deadline}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortHeader({
  label,
  col,
  sort,
  dir,
  linked,
  numeric = false,
}: {
  label: string;
  col: SortKey;
  sort: SortKey;
  dir: "asc" | "desc";
  linked: boolean;
  numeric?: boolean;
}) {
  const active = sort === col;
  const ariaSort = active ? (dir === "asc" ? "ascending" : "descending") : "none";
  const nextDir = active && dir === "asc" ? "desc" : "asc";
  return (
    <th scope="col" aria-sort={ariaSort} className={numeric ? s.num : undefined}>
      {linked ? <SortLink col={col} nextDir={nextDir} label={label} active={active} dir={dir} /> : label}
    </th>
  );
}

function SortLink({ col, nextDir, label, active, dir }: { col: SortKey; nextDir: string; label: string; active: boolean; dir: string }) {
  const href = useHref();
  return (
    <Link href={href({ sort: col, dir: nextDir })} scroll={false} className={s.sortLink}>
      {label}
      <span aria-hidden="true" className={s.sortIcon} data-active={active} data-dir={dir} />
    </Link>
  );
}

// ── Отзывы-вкладки, выбранная — в адресе (?review=slug) ──
type Review = { slug: string; name: string; role: string; text: string };

export function ReviewTabs({ reviews }: { reviews: Review[] }) {
  const params = useSearchParams();
  const href = useHref();
  const selected = reviews.find((r) => r.slug === params?.get("review")) ?? reviews[0];
  if (!selected) return null;

  return (
    <div className={s.reviews}>
      <ul className={s.reviewList} aria-label="Clients">
        {reviews.map((r) => (
          <li key={r.slug}>
            <Link
              href={href({ review: r.slug })}
              scroll={false}
              aria-current={r.slug === selected.slug ? "true" : undefined}
              className={s.reviewLink}
            >
              {r.name}
            </Link>
          </li>
        ))}
      </ul>
      <figure className={s.quote} aria-live="polite">
        <blockquote>&ldquo;{selected.text}&rdquo;</blockquote>
        <figcaption className={s.muted}>
          {selected.name}, {selected.role}
        </figcaption>
      </figure>
    </div>
  );
}

// ── Калькулятор (Forms) ──
const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
const MIN = 1;
const MAX = 2000;

export function Estimator() {
  const id = useId();
  const [width, setWidth] = useState("200");
  const [length, setLength] = useState("200");
  const w = Number(width);
  const l = Number(length);
  const valid = (n: number) => Number.isInteger(n) && n >= MIN && n <= MAX;
  const ok = valid(w) && valid(l);

  return (
    <form className={s.form} onSubmit={(e) => e.preventDefault()} noValidate>
      <div className={s.field}>
        <label htmlFor={`${id}-w`}>Width (Blocks)</label>
        <input
          id={`${id}-w`}
          name="width"
          type="number"
          inputMode="numeric"
          autoComplete="off"
          min={MIN}
          max={MAX}
          value={width}
          onChange={(e) => setWidth(e.target.value)}
          aria-invalid={!valid(w)}
          aria-describedby={!valid(w) ? `${id}-w-err` : undefined}
        />
        {!valid(w) && <p id={`${id}-w-err`} className={s.error}>Enter a whole number from {MIN} to {MAX}.</p>}
      </div>
      <div className={s.field}>
        <label htmlFor={`${id}-l`}>Length (Blocks)</label>
        <input
          id={`${id}-l`}
          name="length"
          type="number"
          inputMode="numeric"
          autoComplete="off"
          min={MIN}
          max={MAX}
          value={length}
          onChange={(e) => setLength(e.target.value)}
          aria-invalid={!valid(l)}
          aria-describedby={!valid(l) ? `${id}-l-err` : undefined}
        />
        {!valid(l) && <p id={`${id}-l-err`} className={s.error}>Enter a whole number from {MIN} to {MAX}.</p>}
      </div>
      <output htmlFor={`${id}-w ${id}-l`} className={s.result} aria-live="polite">
        {ok ? (
          <>
            <span className={s.resultPrice}>{eur.format(estimatePrice(w, l))}</span>
            <span className={s.muted}>Ready in {formatDeadline(estimateDeadlineDays(w, l))}. A rough estimate from size alone; the exact price is agreed after we talk.</span>
          </>
        ) : (
          <span className={s.muted}>Fix the highlighted field to see an estimate.</span>
        )}
      </output>
    </form>
  );
}
