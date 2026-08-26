import Image from "next/image";
import { Unbounded } from "next/font/google";
import { ArrowCircle } from "@/components/ArrowCircle";
import { Button } from "@/components/Button";
import { DISCORD_INVITE } from "@/lib/site";

// Тот же дисплейный шрифт, что у hero-заголовков (DESIGN.md → «Hero-секции
// страниц»). Пиксельный шрифт из референса сознательно НЕ заводился: он
// стал бы третьим дисплейным шрифтом в системе и неминуемо расползся бы
// дальше баннера (решение владельца 2026-08-26).
const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

// Всё, что показывает баннер, лежит здесь: меняется одной правкой, а не
// поиском по разметке.
//
// ⚠️ Оффер — НАСТОЯЩЕЕ обещание деньгами (формулировка владельца
// 2026-08-26). Меняешь условие здесь — меняй и то, что отвечают человеку
// в Discord: скидку придут требовать по тому тексту, который тут написан.
const EYEBROW = "Want anything custom?";
const HEADING = "We'll build it for you";
const OFFER = "€25 off your first commission";
const OFFER_NOTE = "for maps from 250×250 blocks";
const SUBTEXT =
  "Spawns, hubs, adventure maps — built to your brief. Tell us what you need and get a price and a timeline the same day.";
const CTA_LABEL = "Order in Discord";

// ⚠️ Кнопка ведёт ПРЯМО в Discord, и этим отличается от кнопок «Order a
// map» в навбаре и в hero — те идут на /contact. Решение владельца
// 2026-08-26: калькулятор и FAQ он продублирует в самом Discord, значит
// лишний шаг через сайт здесь ничего не добавляет. Надпись поэтому
// другая: одинаковые надписи, ведущие в разные места, — ровно то, что мы
// сегодня же чинили у кнопок заказа.
const CTA_HREF = DISCORD_INVITE;

// Фото настоящей работы, а не рендер на прозрачном фоне из референса:
// такого рендера у нас нет, а фотография показывает то, что человек
// реально получит.
const IMAGE_SRC = "/portfolio/dragon-shrine.png";

/**
 * Замыкающий баннер витрины — предложение заказать постройку. Стоит внизу
 * /marketplace во ВСЕХ её состояниях (главная, категория, поиск, пустой
 * результат): человек, не нашедший готовую карту, — как раз тот, кому
 * нужна заказная.
 *
 * Серверный компонент: ни состояния, ни обработчиков, значит незачем
 * утягивать это в браузерный бандл.
 *
 * КАК УСТРОЕН ФОН. Фотография лежит на всю секцию, поверх неё —
 * растушёвка от края с текстом к прозрачному: слева читается текст,
 * справа проступает постройка. Растушёвка красится ЦВЕТОМ СТРАНИЦЫ
 * (#fbfbff / zinc-950), поэтому сходится с фоном сайта без стыка, а
 * тёмная версия появляется по общему правилу инверсии — тёмных секций на
 * сайте нет с 16.07, и баннер этого решения не отменяет.
 *
 * ⚠️ Направление растушёвки разное по ширине экрана, и это не украшение.
 * На узком фото стоит ЗА текстом целиком, поэтому пелена идёт снизу вверх
 * и почти не пропускает картинку — иначе текст ляжет прямо на камни. На
 * широком текст занимает левую треть, и пелена идёт слева направо,
 * оставляя правую часть фотографии открытой.
 */
export function MarketplaceCta() {
  return (
    // max-w-5xl внутри витрины, которая сама тянется до 120rem: баннер
    // сознательно УЖЕ каталога (решение владельца 2026-08-26). Растянутый
    // во всю ширину, он читался как ещё одна секция страницы; узкий — как
    // врезка, на которую глаз возвращается.
    <section className="relative mx-auto mt-20 min-h-[22rem] max-w-5xl overflow-hidden rounded-3xl border border-zinc-950/[0.06] dark:border-zinc-50/[0.08] sm:mt-28 sm:min-h-[24rem]">
      <Image
        src={IMAGE_SRC}
        // Декоративный фон: то же самое сказано словами рядом, и читалке
        // незачем описывать камни второй раз.
        alt=""
        fill
        sizes="(min-width: 1024px) 64rem, 100vw"
        // Кадр смещён вправо (object-position 72%): слева лежит текст, и
        // показывать там середину фотографии значит прятать постройку под
        // пеленой. Видно её правую часть — ту, что не перекрыта.
        className="object-cover object-[72%_center]"
      />

      {/* Пелена. from-* — тот край, где лежит текст. */}
      <div
        aria-hidden
        className="absolute inset-0 bg-gradient-to-t from-[#fbfbff] from-40% via-[#fbfbff]/90 to-[#fbfbff]/55 dark:from-zinc-950 dark:via-zinc-950/90 dark:to-zinc-950/55 sm:bg-gradient-to-r sm:from-[#fbfbff] sm:from-40% sm:via-[#fbfbff]/80 sm:via-65% sm:to-transparent dark:sm:from-zinc-950 dark:sm:via-zinc-950/80 dark:sm:to-transparent"
      />

      {/* Оранжевое свечение — акцент страницы, тот же приём, что у
          PageGlow, только внутри контейнера. overflow-hidden на секции
          обязателен, иначе пятно вылезает за скругление. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-32 h-96 w-96 rounded-full bg-orange-400/25 blur-3xl dark:bg-orange-500/20"
      />

      <div className="relative max-w-md p-8 sm:p-12">
        {/* orange-700, а не привычный 600: текст мелкий (text-xs), а порог
            контраста для мелкого — 4.5, не 3.0. На нашем светлом фоне
            orange-600 даёт 3.45, orange-700 — 5.02. В тёмной теме
            orange-400 даёт 8.79, менять там нечего. */}
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-700 dark:text-orange-400">
          {EYEBROW}
        </p>

        <h2
          className={`${displayFont.className} mt-4 text-3xl leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl`}
        >
          {HEADING}
        </h2>

        {/* Оффер — ТЕКСТОМ, без заливки (решение владельца 2026-08-26).
            Сначала он был оранжевым чипом; на фотографии тот читался как
            наклейка поверх картинки и спорил с единственной кнопкой,
            которая тоже оранжевая. Цветом остаётся сам текст — этого
            хватает, чтобы глаз нашёл цифру. */}
        <p className="mt-6">
          <span className="text-lg font-bold text-orange-700 dark:text-orange-400">
            {OFFER}
          </span>{" "}
          <span className="text-sm text-zinc-600 dark:text-zinc-400">
            {OFFER_NOTE}
          </span>
        </p>

        <p className="mt-5 text-zinc-600 dark:text-zinc-400">{SUBTEXT}</p>

        {/* Единственный CTA на баннере — правило «один главный CTA на
            экран» (DESIGN.md → «Цвета»).

            Стрелка ЗДЕСЬ ЕСТЬ, и это не противоречит кнопкам «Order a
            map», где её сегодня же сняли. Правило одно и то же: поворот
            на -45 означает «уходишь с сайта». Те кнопки ведут на
            /contact, эта — в Discord. */}
        <div className="mt-8">
          <Button
            href={CTA_HREF}
            target="_blank"
            rel="noopener noreferrer"
            variant="primary"
            size="md"
            className="group gap-2"
          >
            {CTA_LABEL}
            <ArrowCircle
              direction="right"
              variant="bare"
              className="h-5 w-5 transition-transform duration-300 group-hover:-rotate-45"
              colorClassName="text-zinc-950"
            />
          </Button>
        </div>
      </div>
    </section>
  );
}
