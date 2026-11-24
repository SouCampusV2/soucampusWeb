import type { Metadata } from "next";
import Image from "next/image";
import { Unbounded } from "next/font/google";
import { EnvelopeSimple } from "@phosphor-icons/react/dist/ssr";
import { ArrowCircle } from "@/components/ArrowCircle";
import { Button } from "@/components/Button";
import { DISCORD_INVITE, SUPPORT_EMAIL } from "@/lib/site";

// Same display font as every other page hero.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with an order from the marketplace.",
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
    // Та же сетка, что у /contact: max-w-6xl и две колонки. До 25.10 текст
    // жался в max-w-2xl посередине, и страница выглядела у́же соседних.
    // items-start, а не items-center: по центру текст сползал вниз вслед
    // за высокой картинкой, и зазор под навбаром выходил больше pt-20
    // (DESIGN.md → «Отступ от навбара»).
    <main className="w-full mx-auto grid max-w-6xl flex-1 items-start gap-10 px-6 pb-16 pt-20 sm:grid-cols-2 sm:pb-28">
      <div>
        {/* Заголовок — имя страницы, без плашки (16.11, одна схема на весь сайт). */}
        <h1
          className={`${displayFont.className} text-4xl tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
        >
          Support
        </h1>
        <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-400">
          Question about an order, a missing download link, or something not
          working as expected? Reach us on Discord for the fastest reply, or
          email us — a proper support form is on the way.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          {/* Стрелка с поворотом -45 при наведении — тот же приём и тот
              же образец, что у «Join Discord» на /contact. Поворот здесь
              не украшение: по DESIGN.md он означает «уходишь с сайта», а
              Discord — чужая площадка. У кнопок «Order a map», ведущих на
              свою страницу, стрелки нет намеренно. */}
          <Button
            href={DISCORD_INVITE}
            target="_blank"
            rel="noopener noreferrer"
            className="group gap-3"
          >
            Contact on Discord
            <ArrowCircle
              direction="right"
              variant="bare"
              className="h-6 w-6 transition-transform duration-300 group-hover:-rotate-45"
              colorClassName="text-zinc-950"
            />
          </Button>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="inline-flex items-center gap-2 text-sm font-semibold text-orange-500 underline decoration-2 underline-offset-4 transition-colors hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-500"
          >
            {SUPPORT_EMAIL}
            <EnvelopeSimple size={18} weight="bold" />
          </a>
        </div>
      </div>
      {/* Работа из портфолио, а не отдельный рендер: файл уже лежит на
          сайте и уже оптимизирован Next. На телефоне встаёт под текст —
          человек пришёл за помощью, кнопка должна быть на первом экране. */}
      <Image
        src="/portfolio/pirate-rpg.jpeg"
        alt="Pirate RPG — a pirate harbour town under a ship-shaped tavern"
        width={1680}
        height={945}
        sizes="(min-width: 1152px) 528px, (min-width: 640px) 50vw, 100vw"
        // 90, как у скриншотов карт (ProductGallery): при 75 по умолчанию
        // мелкая листва и черепица мылятся. Значение обязано быть в
        // images.qualities (next.config.ts), иначе Next его не отдаст.
        quality={90}
        priority
        // Кадр целиком, 16:9, без object-cover: рамка повторяет пропорцию
        // исходника (DESIGN.md → «Вёрстка»), иначе качество платит за раскладку.
        className="h-auto w-full rounded-3xl"
      />
    </main>
  );
}
