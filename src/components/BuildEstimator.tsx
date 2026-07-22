"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { CaretDown, CaretRight, Check, Clock, Info, MagnifyingGlass, Ruler } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { ArrowCircle } from "@/components/ArrowCircle";
import { DISCORD_INVITE } from "@/lib/site";
import { estimatePrice, estimateDeadlineDays, formatDeadline } from "@/lib/pricing";

// Wise-style "calculator" card, adapted for map size -> price/timeline
// instead of currency conversion. All numbers here are an estimate shown
// instantly client-side — the real quote still happens on Discord (see the
// disclaimer + CTA at the bottom), so this never needs to be authoritative,
// just in the right ballpark. The actual formula lives in src/lib/pricing.ts
// (shared with terms/page.tsx's plain-text explanation of the same numbers).

// EUR is the site's real pricing currency (see /terms#pricing) — every
// other currency here is a live-converted display convenience for
// international clients. No flags: emoji flags (regional-indicator symbol
// pairs) render unreliably on Windows without the right font — it falls
// back to showing the raw two-letter code as plain text (e.g. "GB" next to
// "GBP"), which looked like a bug rather than a flag. Real per-currency
// image flags would need one asset per entry for a ~30-item list, not
// worth it for a decorative touch — code + name carries the same
// information cleanly on every platform.
// POPULAR_CODES surface first in the dropdown, same idea as Wise's own
// "Popular currencies" group; the rest fall into "All currencies" below it.
const POPULAR_CODES = ["EUR", "GBP", "USD"];

// Frankfurter (frankfurter.dev) — free, no API key, ECB-sourced daily
// rates, CORS-enabled for a direct browser fetch. Wise's own rates aren't
// public like this (their real API is for authenticated transfers, not a
// page like this one), so Frankfurter is the honest equivalent: a real
// live mid-market rate, just not Wise's specific one. Two calls on mount:
// the full currency name list (for the dropdown), and every rate against
// EUR at once (rather than one request per currency switch).
function useCurrencies() {
  const [names, setNames] = useState<Record<string, string>>({ EUR: "Euro" });
  const [rates, setRates] = useState<Record<string, number>>({ EUR: 1 });

  useEffect(() => {
    let cancelled = false;

    fetch("https://api.frankfurter.dev/v1/currencies")
      .then((res) => res.json())
      .then((data: Record<string, string>) => {
        if (!cancelled) setNames((prev) => ({ ...prev, ...data }));
      })
      .catch(() => {});

    fetch("https://api.frankfurter.dev/v1/latest?from=EUR")
      .then((res) => res.json())
      .then((data: { rates?: Record<string, number> }) => {
        if (!cancelled && data.rates) setRates((prev) => ({ ...prev, ...data.rates }));
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return { names, rates };
}

function CurrencyDropdown({
  currency,
  names,
  onChange,
}: {
  currency: string;
  names: Record<string, string>;
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const allCodes = useMemo(() => Object.keys(names).sort(), [names]);
  const q = query.trim().toLowerCase();
  const matches = (code: string) =>
    !q || code.toLowerCase().includes(q) || names[code]?.toLowerCase().includes(q);

  const popular = POPULAR_CODES.filter((c) => names[c] && matches(c));
  const rest = allCodes.filter((c) => !POPULAR_CODES.includes(c) && matches(c));

  const Row = ({ code }: { code: string }) => (
    <li key={code}>
      <button
        type="button"
        onClick={() => {
          onChange(code);
          setOpen(false);
          setQuery("");
        }}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <span className="font-semibold text-zinc-950 dark:text-zinc-50">{code}</span>
        <span className="truncate text-sm text-zinc-500 dark:text-zinc-400">{names[code]}</span>
        {code === currency && (
          <Check size={16} weight="bold" className="ml-auto shrink-0 text-orange-500" />
        )}
      </button>
    </li>
  );

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 cursor-pointer items-center gap-2 rounded-full bg-[#fbfbff] pl-3 pr-3 text-sm font-semibold text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50"
      >
        {currency}
        <CaretDown size={12} weight="bold" className="text-zinc-950 dark:text-zinc-50" />
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+8px)] z-10 w-72 overflow-hidden rounded-2xl border border-zinc-200 bg-[#fbfbff] shadow-lg dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center gap-2 border-b border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
            <MagnifyingGlass size={16} className="shrink-0 text-zinc-400" />
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a currency / country"
              className="w-full bg-transparent text-sm text-zinc-950 outline-none placeholder:text-zinc-400 dark:text-zinc-50"
            />
          </div>

          <div className="max-h-72 overflow-y-auto p-2">
            {popular.length > 0 && (
              <>
                <p className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  Popular currencies
                </p>
                <ul>
                  {popular.map((code) => (
                    <Row key={code} code={code} />
                  ))}
                </ul>
              </>
            )}

            {rest.length > 0 && (
              <>
                <p className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  All currencies
                </p>
                <ul>
                  {rest.map((code) => (
                    <Row key={code} code={code} />
                  ))}
                </ul>
              </>
            )}

            {popular.length === 0 && rest.length === 0 && (
              <p className="px-3 py-6 text-center text-sm text-zinc-400">No matches</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function BuildEstimator() {
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(100);
  const [currency, setCurrency] = useState("EUR");
  const { names, rates } = useCurrencies();

  const priceEur = useMemo(() => estimatePrice(width, height), [width, height]);
  const deadlineLabel = useMemo(
    () => formatDeadline(estimateDeadlineDays(width, height)),
    [width, height]
  );

  const rate = rates[currency] ?? 1;
  const displayedPrice = Math.round(priceEur * rate);

  const clampSize = (n: number) => Math.min(2000, Math.max(1, n));

  return (
    <div className="relative mx-auto max-w-md rounded-3xl border border-white/50 bg-white/20 p-6 shadow-lg shadow-zinc-950/5 backdrop-blur-2xl dark:border-white/10 dark:bg-zinc-900/30 sm:p-8">
      {/* A flat, uniform tint reads as "translucent plastic," not glass —
          real glass catches light unevenly. This fakes that with a soft
          highlight in the top-left corner (where the light in this section's
          own glow would plausibly come from) fading to nothing. Clipped by
          its OWN rounded+overflow-hidden wrapper rather than the card's —
          the card itself can't have overflow-hidden, the currency dropdown
          below needs to pop outside its bounds. */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div className="absolute -left-1/4 -top-1/3 h-2/3 w-2/3 rounded-full bg-white/40 blur-3xl dark:bg-white/10" />
      </div>
      <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">
        Map size (blocks)
      </p>
      <div className="mt-2 flex items-center gap-3">
        <div className="flex flex-1 items-center gap-2 rounded-full bg-[#fbfbff] px-5 py-3 dark:bg-zinc-950">
          <Ruler size={18} className="shrink-0 text-zinc-400" />
          <input
            type="number"
            min={1}
            max={2000}
            value={width}
            onChange={(e) => setWidth(clampSize(Number(e.target.value) || 1))}
            className="w-full bg-transparent text-lg font-semibold text-zinc-950 outline-none dark:text-zinc-50"
            aria-label="Width in blocks"
          />
        </div>
        <span className="text-zinc-400">×</span>
        <div className="flex flex-1 items-center gap-2 rounded-full bg-[#fbfbff] px-5 py-3 dark:bg-zinc-950">
          <input
            type="number"
            min={1}
            max={2000}
            value={height}
            onChange={(e) => setHeight(clampSize(Number(e.target.value) || 1))}
            className="w-full bg-transparent text-lg font-semibold text-zinc-950 outline-none dark:text-zinc-50"
            aria-label="Height in blocks"
          />
        </div>
      </div>

      <p className="mt-6 text-sm font-medium text-zinc-600 dark:text-zinc-400">
        Estimated price
      </p>
      <p className="text-4xl font-extrabold tracking-tight text-orange-500 sm:text-5xl">
        {currency === "EUR" ? "€" : ""}
        {displayedPrice.toLocaleString()}
        {currency !== "EUR" ? ` ${currency}` : ""}
      </p>
      {currency !== "EUR" && (
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          ≈ €{priceEur.toLocaleString()} EUR — the currency actually billed
        </p>
      )}

      <div className="mt-6 flex items-center gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#fbfbff] dark:bg-zinc-950">
          <Clock size={20} className="text-zinc-500 dark:text-zinc-400" />
        </span>
        <div>
          <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
            Estimated timeline
          </p>
          <p className="font-semibold text-zinc-950 dark:text-zinc-50">
            {deadlineLabel}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <CurrencyDropdown currency={currency} names={names} onChange={setCurrency} />

        <Link
          href="/terms#pricing"
          className="flex h-9 items-center gap-1.5 rounded-full bg-[#fbfbff] pl-2.5 pr-2 text-xs font-semibold text-zinc-950 transition-colors hover:text-blue-600 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:text-blue-400"
        >
          <Info size={14} weight="bold" />
          How the price is calculated
          <CaretRight size={12} weight="bold" />
        </Link>
      </div>

      <div className="mt-4 rounded-2xl bg-blue-100 p-4 text-sm leading-6 text-zinc-700 dark:bg-blue-950 dark:text-zinc-300">
        A rough estimate based on size alone — the exact price and timeline
        depend on detail and style too, and are confirmed once we talk
        through your idea on Discord.
      </div>

      <Button
        href={DISCORD_INVITE}
        target="_blank"
        rel="noopener noreferrer"
        variant="primary"
        size="lg"
        className="group mt-6 w-full gap-3"
      >
        Get an exact quote
        <ArrowCircle
          direction="right"
          variant="bare"
          className="h-6 w-6 transition-transform duration-300 group-hover:-rotate-45"
          colorClassName="text-zinc-950"
        />
      </Button>
    </div>
  );
}
