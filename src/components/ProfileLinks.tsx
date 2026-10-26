"use client";

import { useRef, useState } from "react";
import {
  DiscordLogo,
  XLogo,
  YoutubeLogo,
  TiktokLogo,
  InstagramLogo,
  TwitchLogo,
  RedditLogo,
  Cube,
  Storefront,
  Package,
  Globe,
  type Icon,
} from "@phosphor-icons/react";
import { useDismiss } from "@/lib/useDismiss";
import {
  profileLinkLabel,
  type ProfileLink,
  type ProfileLinkKind,
} from "@/lib/profile-links";

// Ссылки человека на /@<username> и в превью на /settings.
//
// ОДИН компонент на оба места: превью обязано показывать ровно то, что
// увидят посетители.
//
// Вид — ряд круглых иконок, а не чипов с подписями (просьба владельца
// 26.10: восемь чипов в шапке «некрасиво»). Иконка соцсети узнаётся без
// слов, а название есть в title и aria-label. Больше ICONS_SHOWN — первые
// три остаются, остальные уходят в попап «+N»: шапка не растёт, и ни
// одна ссылка не спрятана так, что её не найти. Полный список с
// подписями — ProfileLinkList, во вкладке About.
//
// Своих иконок у Planet Minecraft, BuiltByBit и Modrinth в Phosphor нет —
// нейтральные по смыслу: блок, витрина, пакет.

export const PROFILE_LINK_ICONS: Record<ProfileLinkKind, Icon> = {
  discord: DiscordLogo,
  x: XLogo,
  youtube: YoutubeLogo,
  tiktok: TiktokLogo,
  instagram: InstagramLogo,
  twitch: TwitchLogo,
  reddit: RedditLogo,
  planetminecraft: Cube,
  builtbybit: Storefront,
  modrinth: Package,
  website: Globe,
};

/** Сколько иконок видно сразу; дальше — попап. */
const ICONS_SHOWN = 4;

// nofollow ugc — ссылку вписал пользователь, делиться с ней весом
// страницы мы не обещали; noopener noreferrer — открытая вкладка не
// получает доступа к нашей и не узнаёт, откуда пришли.
const EXTERNAL = { target: "_blank", rel: "nofollow ugc noopener noreferrer" } as const;

const ICON_BUTTON =
  "inline-flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-[#fbfbff] text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-50";

export function ProfileLinks({
  links,
  className = "",
}: {
  links: ProfileLink[];
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, () => setOpen(false), { enabled: open });

  if (links.length === 0) return null;

  // Ровно ICONS_SHOWN — все иконками: попап ради одной спрятанной
  // ссылки занял бы то же место, что сама ссылка.
  const overflow = links.length > ICONS_SHOWN;
  const inline = overflow ? links.slice(0, ICONS_SHOWN - 1) : links;
  const hidden = overflow ? links.slice(ICONS_SHOWN - 1) : [];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {inline.map((link, index) => {
        const IconFor = PROFILE_LINK_ICONS[link.kind];
        const label = profileLinkLabel(link);
        return (
          <a
            // Индекс в ключе: вид может стоять дважды (два канала).
            key={`${link.kind}-${index}`}
            href={link.url}
            {...EXTERNAL}
            title={label}
            aria-label={label}
            className={ICON_BUTTON}
          >
            <IconFor size={18} weight="fill" aria-hidden />
          </a>
        );
      })}

      {hidden.length > 0 && (
        <div ref={ref} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={`${hidden.length} more links`}
            className={`${ICON_BUTTON} text-xs font-semibold`}
          >
            +{hidden.length}
          </button>
          {open && (
            // Тот же рецепт стекла, что у остальных выпадашек
            // (DESIGN.md → «Стекло»). По клику, не по hover: на
            // тач-экране hover не наступает никогда (26.08).
            <div className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-2xl border border-white/60 bg-[#fbfbff]/95 p-1 shadow-xl shadow-zinc-950/10 backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-zinc-900/95">
              <ProfileLinkList links={hidden} compact />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Все ссылки строками «иконка + название» — для About и попапа. */
export function ProfileLinkList({
  links,
  compact = false,
}: {
  links: ProfileLink[];
  compact?: boolean;
}) {
  return (
    <ul className={compact ? "" : "space-y-1"}>
      {links.map((link, index) => {
        const IconFor = PROFILE_LINK_ICONS[link.kind];
        return (
          <li key={`${link.kind}-${index}`}>
            <a
              href={link.url}
              {...EXTERNAL}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50"
            >
              <IconFor size={18} weight="fill" className="shrink-0" aria-hidden />
              <span className="truncate">{profileLinkLabel(link)}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
