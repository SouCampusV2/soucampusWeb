"use client";

import Link from "next/link";
import { WAIVER_TEXT } from "@/lib/legal";

// Галочка отказа от права на отзыв (2026-09-26). Одна на оба пути оплаты
// — корзину и «Buy now» на странице карты: текст согласия обязан быть
// дословно одним, иначе в споре не доказать, на что человек согласился.
//
// Галочка — удобство и честность перед покупателем, а не защита:
// решает /api/checkout, который без `waiver: true` платный заказ не
// создаёт.
//
// Ссылка на #refunds — в той же строке: право ЕС требует, чтобы человек
// понимал, от чего отказывается, в момент отказа.
export function WaiverCheckbox({
  checked,
  onChange,
  missing,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** Нажали оплату без галочки — подсветить, а не молчать. */
  missing?: boolean;
}) {
  return (
    <div>
      <label className="flex cursor-pointer items-start gap-2.5 text-left text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-invalid={missing || undefined}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-orange-500 pointer-coarse:h-5 pointer-coarse:w-5"
        />
        <span>
          {WAIVER_TEXT}{" "}
          <Link
            href="/terms#refunds"
            className="underline underline-offset-2 hover:text-zinc-950 dark:hover:text-zinc-50"
          >
            Terms
          </Link>
        </span>
      </label>
      {missing && (
        <p className="mt-1.5 text-xs text-red-600 dark:text-red-400" role="alert">
          Tick the box to continue to payment.
        </p>
      )}
    </div>
  );
}
