import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/Button";
import { DISCORD_INVITE, SUPPORT_EMAIL } from "@/lib/site";

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
          working as expected? Reach us on Discord for the fastest reply, or
          email us — a proper support form is on the way.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Button href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer">
            Contact on Discord
          </Button>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-orange-500 underline decoration-2 underline-offset-4 transition-colors hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-500"
          >
            <EnvelopeSimple size={18} weight="bold" />
            {SUPPORT_EMAIL}
          </a>
        </div>
      </div>
    </main>
  );
}
