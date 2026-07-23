"use client";

import { useState } from "react";
import { Button } from "@/components/Button";

// Кнопка "Buy" на странице товара. Клиентская — ей нужны состояние
// (защита от двойного клика) и fetch по нажатию; сама страница товара
// остаётся серверной, клиентский островок — только эта кнопка.
//
// Наружу уходит ТОЛЬКО slug. Цену кнопка не знает и не отправляет —
// строка на кнопке ("Buy — €15") чисто косметическая, сумму платежа
// определяет сервер по БД (см. /api/checkout).
export function BuyButton({ slug, label }: { slug: string; label: string }) {
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function startCheckout() {
    if (state === "loading") return;
    setState("loading");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug }),
      });
      if (!res.ok) throw new Error(`checkout failed: ${res.status}`);
      const { url } = await res.json();
      if (typeof url !== "string" || !url.startsWith("https://")) {
        throw new Error("checkout returned no url");
      }
      // Уводим вкладку на страницу оплаты Stripe. Не window.open: попапы
      // режутся блокировщиками, а покупателю всё равно возвращаться
      // сюда же через success_url.
      window.location.assign(url);
      // Состояние не сбрасываем: пока браузер уходит на Stripe, кнопка
      // должна оставаться заблокированной.
    } catch (e) {
      console.error("Не удалось начать оплату:", e);
      setState("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Button size="lg" onClick={startCheckout}>
        {state === "loading" ? "Redirecting…" : label}
      </Button>
      {state === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400" role="alert">
          Something went wrong — please try again.
        </p>
      )}
    </div>
  );
}
