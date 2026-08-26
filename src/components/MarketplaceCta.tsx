import Image from "next/image";
import { Unbounded } from "next/font/google";
import { Button } from "@/components/Button";
import { DISCORD_INVITE } from "@/lib/site";

// Тот же дисплейный шрифт, что у hero-заголовков (DESIGN.md → «Hero-секции
// страниц»). Пиксельный шрифт из референса сознательно НЕ заводился: он
// стал бы третьим дисплейным шрифтом в системе и неминуемо расползся бы
// дальше баннера (решение владельца 2026-08-26).
const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

// ⚠️ ТЕКСТ-ЗАГЛУШКА. Владелец даёт свою формулировку оффера (2026-08-26);
// до тех пор здесь честный текст без цифр и обещаний — выдуманная скидка
// хуже отсутствующей, потому что её кто-то придёт требовать.
// Всё, что показывает баннер, лежит здесь: меняется одной правкой, не
// поиском по разметке.
const EYEBROW = "Want anything custom?";
const HEADING = "We'll build it for you";
const SUBTEXT =
  "Spawns, hubs, adventure maps — built to your brief. Tell us what you need and get a price and a timeline the same day.";
const CTA_LABEL = "Talk to us on Discord";
const CTA_HREF = DISCORD_INVITE;

// Скриншот настоящей работы из портфолио, а не рендер на прозрачном фоне
// (как на референсе): такого рендера у нас нет, а фотография показывает
// то, что человек реально получит. Файл лежит в public/, поэтому размеры
// известны заранее (1920×1080) и Next не гадает про раскладку.
const IMAGE_SRC = "/portfolio/ironholt.png";
const IMAGE_ALT = "Ironholt — a custom spawn built by SouCampus";

/**
 * Замыкающий баннер витрины — приглашение заказать постройку и прийти в
 * Discord. Стоит внизу /marketplace во ВСЕХ её состояниях (главная,
 * категория, поиск): человек, не нашедший готовую карту, — как раз тот,
 * кому нужна заказная.
 *
 * Серверный компонент: здесь нет ни состояния, ни обработчиков, значит
 * незачем и утягивать это в браузерный бандл.
 *
 * ЦВЕТА — общие, по правилу инверсии (DESIGN.md → «Правило инверсии
 * цветов в тёмной теме»), а не тёмная панель с референса. На сайте нет
 * тёмных секций с 2026-07-16 (решение владельца), и баннер этого правила
 * не отменяет: в светлой теме он светлый, в тёмной — тёмный.
 *
 * Поверхность приподнята полупрозрачной заливкой, а не своим цветом:
 * bg-zinc-950/[0.03] на светлом фоне даёт чуть более тёмную панель, тот
 * же класс с инверсией — чуть более светлую на тёмном. Один рецепт на обе
 * темы вместо двух подобранных вручную оттенков, которые потом разъедутся.
 */
export function MarketplaceCta() {
  return (
    <section className="relative mt-20 overflow-hidden rounded-3xl border border-zinc-950/[0.06] bg-zinc-950/[0.03] dark:border-zinc-50/[0.08] dark:bg-zinc-50/[0.03] sm:mt-28">
      {/* Оранжевое свечение — тот же приём, что у PageGlow, только внутри
          контейнера: акцент страницы, а не заливка. Обязателен
          overflow-hidden на секции, иначе пятно вылезает за скругление. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-32 h-96 w-96 rounded-full bg-orange-400/25 blur-3xl dark:bg-orange-500/20"
      />

      <div className="relative flex flex-col gap-10 p-8 sm:p-12 lg:flex-row lg:items-center lg:gap-16">
        <div className="max-w-xl lg:flex-1">
          {/* orange-700, а не привычный 600: текст здесь мелкий
              (text-xs), а порог контраста для мелкого — 4.5, не 3.0.
              На нашем светлом фоне orange-600 даёт 3.45 и правило
              нарушает, orange-700 — 5.02. В тёмной теме orange-400 даёт
              8.79, менять там нечего. */}
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-400">
            {EYEBROW}
          </p>
          <h2
            className={`${displayFont.className} mt-4 text-3xl leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl`}
          >
            {HEADING}
          </h2>
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">{SUBTEXT}</p>

          {/* Единственный CTA на баннере — правило «один главный CTA на
              экран» (DESIGN.md → «Цвета»). Внешняя ссылка, поэтому
              target/rel, как у всех наших ссылок в Discord. */}
          <div className="mt-8">
            <Button
              href={CTA_HREF}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
            >
              {CTA_LABEL}
            </Button>
          </div>
        </div>

        {/* Картинка. sizes обязателен: без него Next отдаёт файл под самую
            широкую возможную колонку, а она здесь максимум половина
            контейнера. */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl lg:w-[46%]">
          <Image
            src={IMAGE_SRC}
            alt={IMAGE_ALT}
            fill
            sizes="(min-width: 1024px) 46vw, 100vw"
            className="object-cover"
          />
        </div>
      </div>
    </section>
  );
}
