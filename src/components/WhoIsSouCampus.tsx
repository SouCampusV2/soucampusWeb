import Image from "next/image";
import {
  DiscordLogo,
  YoutubeLogo,
  TiktokLogo,
  InstagramLogo,
  XLogo,
  Planet,
} from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/Button";
import { DISCORD_INVITE } from "@/lib/site";

// «Who is SouCampus» на главной (2026-10-10) — вариант 03b из локальной
// лаборатории, выбран владельцем после трёх итераций. Бенто-сетка: скин на
// два ряда слева, справа сверху текст, снизу две цифры и соцсети.
//
// ⚠️ Заголовок и первая фраза — для поиска, а не для красоты. «Who is
// SouCampus» — дословно брендовый запрос (в Google и в ИИ-поиске), и
// первая фраза отвечает на него тем же определением, что SITE_TAGLINE и
// JSON-LD главной. Одно определение во всех местах и складывает «сущность»
// SouCampus. Меняешь формулировку здесь — сверь с site.ts.
//
// Цифры — с /about (15 лет в игре, около десяти постоянных клиентов).
// Поменялись там — поменяй и здесь.

// Шесть главных профилей, а не все десять из футера: в плитку 3×2 больше не
// влезает, а Patreon, ChunkFactory, Reddit и GitHub для первого знакомства
// второстепенны. Полный список остаётся в футере.
const SOCIALS = [
  { label: "YouTube", href: "https://www.youtube.com/@SouCampus", icon: YoutubeLogo },
  { label: "TikTok", href: "https://www.tiktok.com/@soucampus", icon: TiktokLogo },
  { label: "Instagram", href: "https://www.instagram.com/soucampusbuilds/", icon: InstagramLogo },
  { label: "X", href: "https://x.com/SouCampusBuilds", icon: XLogo },
  { label: "PlanetMinecraft", href: "https://www.planetminecraft.com/member/soucampus/", icon: Planet },
  { label: "Discord", href: DISCORD_INVITE, icon: DiscordLogo },
];

const CARD = "rounded-3xl bg-zinc-100 dark:bg-zinc-900";

export function WhoIsSouCampus() {
  return (
    // Без нижнего отступа (10.10): за секцией сразу Recent projects, и
    // два полных py-28 подряд давали 224px пустоты — блоки читались как
    // чужие друг другу. Зазор между ними теперь задаёт одна Recent projects.
    <section className="mx-auto max-w-6xl px-6 pt-16 sm:pt-28">
      <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
        Who is SouCampus
      </h2>

      <div className="mt-10 grid gap-4 sm:mt-12 md:auto-rows-[minmax(13rem,auto)] md:grid-cols-4">
        {/* Скин задан ВЫСОТОЙ плитки и стоит абсолютно: растёт вместе с
            рядами, а бока, не влезшие по ширине, обрезает overflow-hidden.
            В поток не входит намеренно — иначе картинка сама раздувала бы
            высоту рядов. 75% высоты — подобрано владельцем (94 было много).
            Исходник 276×368 меньше места под него, отсюда мягкость — тот
            же TODO, что в AuthorCta: нужен рендер шире ~800px. */}
        <div className={`${CARD} pixel-texture relative min-h-[28rem] overflow-hidden md:row-span-2`}>
          <Image
            src="/aboutme/soucampusModel.png"
            alt="SouCampus — my Minecraft skin"
            width={276}
            height={368}
            quality={100}
            className="absolute bottom-0 left-1/2 h-[75%] w-auto max-w-none -translate-x-1/2 drop-shadow-xl"
          />
        </div>

        <div className={`${CARD} flex flex-col justify-between gap-6 p-6 sm:p-8 md:col-span-3`}>
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
            <strong className="font-semibold text-zinc-950 dark:text-zinc-50">
              SouCampus is a professional Minecraft builder
            </strong>{" "}
            crafting custom maps, structures and worlds on order. I started
            building with my father at six, became an official builder on a
            20,000-player server at twelve, and have worked with studios whose
            builds reach the official Minecraft Marketplace — from rugged
            medieval fortresses to light fantasy cities.
          </p>
          <div>
            <Button href="/about" variant="tertiary">
              Read my story
            </Button>
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-3xl bg-orange-400 p-6 text-zinc-950">
          <span className="text-5xl font-extrabold">15</span>
          <span className="font-semibold">years in Minecraft</span>
        </div>
        <div className="flex flex-col justify-between rounded-3xl bg-lime-300 p-6 text-zinc-950 dark:bg-lime-400">
          <span className="text-5xl font-extrabold">~10</span>
          <span className="font-semibold">regular clients</span>
        </div>

        <div className={`${CARD} flex flex-col p-6`}>
          <div className="flex items-baseline justify-between gap-3">
            <p className="text-sm text-zinc-500">Follow the builds</p>
            <p className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">@soucampus</p>
          </div>
          {/* Белые плитки на серой карточке: прежние серые кружки на сером
              сливались с фоном (замечание владельца). */}
          <ul className="mt-4 grid flex-1 grid-cols-3 gap-2">
            {SOCIALS.map(({ label, href, icon: Icon }) => (
              <li key={label}>
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="grid h-full min-h-14 place-items-center rounded-2xl bg-white text-zinc-950 transition-colors hover:bg-orange-400 dark:bg-zinc-950 dark:text-zinc-50 dark:hover:bg-orange-400 dark:hover:text-zinc-950"
                >
                  <Icon size={24} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
