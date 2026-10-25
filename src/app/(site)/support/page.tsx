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
    <main className="w-full mx-auto grid max-w-6xl flex-1 items-center gap-10 px-6 pb-16 pt-20 sm:grid-cols-2 sm:pb-28">
      {/* Картинка слева на десктопе, но ПОСЛЕ текста на телефоне: человек
          пришёл за помощью, и кнопка должна быть на первом экране.
          Фон у рендера прозрачный, поэтому он ложится на обе темы.
          Исходник (3840px, 3.6 МБ) — assets/portfolio-originals/HugeRender1.png. */}
      <Image
        src="/support-village.webp"
        alt="A Minecraft village with a nether portal, market stalls and players"
        width={1400}
        height={896}
        sizes="(min-width: 1152px) 528px, (min-width: 640px) 50vw, 100vw"
        priority
        className="order-last h-auto w-full sm:order-first"
      />
      <div>
        <span className="text-sm font-semibold text-orange-500">Marketplace</span>
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
    </main>
  );
}
