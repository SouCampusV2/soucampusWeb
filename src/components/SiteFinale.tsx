import Image from "next/image";
import { DiscordLogo } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/Button";
import { getAllProjects } from "@/lib/projects";
import { getDiscordStats } from "@/lib/discord-stats";
import { DISCORD_INVITE } from "@/lib/site";

// Финал страниц студии (24.11) — на месте бывших тарифов «Choose your plan».
// Лаборатория /lab/finale, круг 4, выбор владельца: рендер работы во всю
// ширину с текстом снизу (А1, без подписи «что на фото») и справа синяя
// карточка Discord (Б1+) — цвет Discord, логотип на фоне, живые цифры
// «N online now · M members».
//
// Рендер — первая избранная работа портфолио (is_featured), иначе самая
// новая: тот же выбор, что в лаборатории.

export async function SiteFinale() {
  const [projects, stats] = await Promise.all([getAllProjects(), getDiscordStats()]);
  const shot = [...projects].sort(
    (a, b) => Number(b.isFeatured) - Number(a.isFeatured) || (a.createdAt < b.createdAt ? 1 : -1)
  )[0];

  return (
    <section className="mx-auto w-full max-w-6xl px-6 pb-16 pt-16 sm:pb-24 sm:pt-28">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        {shot && (
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] sm:aspect-[16/9] lg:aspect-auto lg:min-h-[26rem]">
            <Image
              src={shot.image}
              alt={shot.title}
              fill
              quality={90}
              sizes="(min-width: 1152px) 820px, 100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-8 sm:p-12">
              <h2 className="max-w-xl text-4xl font-extrabold tracking-tight text-white sm:text-6xl">
                Let&apos;s build your world
              </h2>
              <p className="mt-3 max-w-md text-lg text-white/85">
                Custom Minecraft maps, built to your size, style and deadline.
              </p>
              <div className="mt-7">
                <Button href="/contact" size="lg">
                  Order a map
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Нижний отступ как у рендера слева (sm:pb-12), а кнопка прижата
            к низу (mt-auto): «Order a map» и «Join the server» стоят на одной
            линии (24.11, просьба владельца). */}
        <div className="relative flex flex-col overflow-hidden rounded-[2.5rem] bg-[#5865f2] p-8 text-white sm:pb-12">
          <DiscordLogo size={180} weight="fill" className="absolute -right-10 top-[58%] -translate-y-1/2 text-white/10" aria-hidden />
          <h2 className="relative text-3xl font-extrabold tracking-tight">Join the Discord</h2>
          <p className="relative mt-2 text-white/85">
            New builds show up there first. Orders go through tickets, with a real person on the other side.
          </p>
          {stats && (
            <p className="relative mt-4 flex items-center gap-2 text-sm font-semibold">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-lime-400 opacity-75 motion-reduce:hidden" />
                <span className="relative inline-flex size-2.5 rounded-full bg-lime-400" />
              </span>
              {stats.online} online now · {stats.members} members
            </p>
          )}
          <div className="relative mt-auto pt-6">
            <Button
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              size="lg"
              colorClassName="bg-white text-[#3c45c5] hover:bg-zinc-100"
              className="w-full gap-3"
            >
              Join the server
              <DiscordLogo size={20} weight="fill" aria-hidden />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
