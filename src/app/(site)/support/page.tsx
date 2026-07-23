import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { Button } from "@/components/Button";
import { DISCORD_INVITE } from "@/lib/site";

// Same display font as every other page hero.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with an order from the shop.",
  // Заглушка (реальный канал поддержки пока — Discord) — прячем от
  // индексации до полноценной страницы, как /terms до Этапа 4.
  robots: { index: false, follow: true },
};

// Отдельная от /contact страница: /contact — это заявка на новый заказ
// (кастомная постройка), /support — помощь с уже купленным в магазине
// товаром. Разные цели, разная аудитория — сознательно не одна страница
// с двумя заголовками.
export default function SupportPage() {
  return (
    <main className="w-full mx-auto max-w-6xl flex-1 px-6 py-16 sm:py-28">
      <div className="mx-auto max-w-2xl">
        <span className="text-sm font-semibold text-orange-500">Shop</span>
        <h1
          className={`${displayFont.className} mt-3 text-4xl tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
        >
          Support
        </h1>
        <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-400">
          Question about an order, a missing download link, or something not
          working as expected? For now, the fastest way to reach us is
          Discord — a proper support form is on the way.
        </p>
        <div className="mt-8">
          <Button href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer">
            Contact on Discord
          </Button>
        </div>
      </div>
    </main>
  );
}
