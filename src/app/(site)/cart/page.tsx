"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Trash } from "@phosphor-icons/react";
import { useCart } from "@/lib/cart-context";
import { Button } from "@/components/Button";

// Клиентская страница целиком (нужен localStorage через useCart) — как
// у /shop/[slug], metadata живёт в соседнем layout.tsx, потому что
// клиентский компонент не может экспортировать metadata сам.

function formatCents(cents: number, currency = "EUR") {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency });
}

export default function CartPage() {
  const { items, removeItem, totalCents } = useCart();
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  async function checkout() {
    if (state === "loading" || items.length === 0) return;
    setState("loading");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Наружу уходят только slug'и — цену сервер снова берёт из БД, не
        // отсюда (см. AddToCartButton).
        body: JSON.stringify({ items: items.map((i) => ({ slug: i.slug })) }),
      });
      if (!res.ok) throw new Error(`checkout failed: ${res.status}`);
      const { url } = await res.json();
      if (typeof url !== "string" || !url.startsWith("https://")) {
        throw new Error("checkout returned no url");
      }
      window.location.assign(url);
    } catch (e) {
      console.error("Не удалось начать оплату:", e);
      setState("error");
    }
  }

  return (
    <main className="w-full mx-auto max-w-3xl flex-1 px-6 py-16 sm:py-28">
      <h1 className="text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        Your cart
      </h1>

      {items.length === 0 ? (
        <div className="mt-10">
          <p className="text-zinc-600 dark:text-zinc-400">Your cart is empty.</p>
          <Button href="/shop" className="mt-6">
            Browse the shop
          </Button>
        </div>
      ) : (
        <>
          <ul className="mt-10 divide-y divide-zinc-200 dark:divide-zinc-800">
            {items.map((item) => (
              <li key={item.slug} className="flex flex-wrap items-center gap-4 py-5 sm:flex-nowrap">
                <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="96px"
                    className="object-cover"
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/shop/${item.slug}`}
                    className="font-semibold text-zinc-950 hover:underline dark:text-zinc-50"
                  >
                    {item.title}
                  </Link>
                </div>

                <p className="w-20 shrink-0 text-right font-semibold text-zinc-950 dark:text-zinc-50">
                  {formatCents(item.priceCents)}
                </p>

                <button
                  type="button"
                  onClick={() => removeItem(item.slug)}
                  aria-label={`Remove ${item.title} from cart`}
                  className="cursor-pointer text-zinc-400 hover:text-red-600 dark:hover:text-red-400"
                >
                  <Trash size={18} />
                </button>
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
            <p className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              Total: {formatCents(totalCents)}
            </p>
            <div>
              <Button size="lg" onClick={checkout}>
                {state === "loading" ? "Redirecting…" : "Checkout"}
              </Button>
              {state === "error" && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">
                  Something went wrong — please try again.
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
