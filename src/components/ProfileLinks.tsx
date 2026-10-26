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
} from "@phosphor-icons/react/dist/ssr";
// Только тип — в бандл ничего не попадает, а dist/ssr его не экспортирует.
import type { Icon } from "@phosphor-icons/react";
import {
  profileLinkLabel,
  type ProfileLink,
  type ProfileLinkKind,
} from "@/lib/profile-links";

// Чипы ссылок под именем на /@<username> и в превью на /settings.
//
// ОДИН компонент на оба места, без "use client": страница профиля —
// серверная, превью — внутри клиентской формы, и иконки из dist/ssr
// работают в обоих (они не читают контекст). Две копии разошлись бы
// — превью перестало бы показывать то, что увидят посетители.
//
// Своих иконок у Planet Minecraft, BuiltByBit и Modrinth в Phosphor нет —
// нейтральные по смыслу: блок, витрина, пакет. Подпись рядом всё равно
// называет площадку словами.

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

export function ProfileLinks({
  links,
  className = "",
}: {
  links: ProfileLink[];
  className?: string;
}) {
  if (links.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {links.map((link, index) => {
        const IconFor = PROFILE_LINK_ICONS[link.kind];
        return (
          // Индекс в ключе: один вид может стоять дважды (два канала),
          // и адреса тоже могут совпасть, пока человек их правит.
          <li key={`${link.kind}-${index}`}>
            {/* nofollow ugc — ссылку вписал пользователь, и делиться с
                ней весом страницы мы не обещали; noopener noreferrer —
                вкладка не получает доступа к нашей и не узнаёт, откуда
                пришли. */}
            <a
              href={link.url}
              target="_blank"
              rel="nofollow ugc noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-[#fbfbff] px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-700 dark:hover:text-zinc-50"
            >
              <IconFor size={16} weight="fill" aria-hidden />
              {profileLinkLabel(link)}
            </a>
          </li>
        );
      })}
    </ul>
  );
}
