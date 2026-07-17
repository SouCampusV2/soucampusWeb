"use client";

import Link from "next/link";
import { Unbounded } from "next/font/google";
import {
  DiscordLogo,
  InstagramLogo,
  TiktokLogo,
  GithubLogo,
  Sun,
  Moon,
} from "@phosphor-icons/react";
import { useTheme } from "@/components/ThemeProvider";

// Same display font as the navbar brand name — the footer logo rhymes with it.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

const DISCORD_INVITE = "https://discord.gg/ft8HVk8Cg";

const SOCIALS = [
  { label: "Discord", href: DISCORD_INVITE, icon: DiscordLogo },
  {
    label: "Instagram",
    href: "https://www.instagram.com/soucampus_builds/",
    icon: InstagramLogo,
  },
  {
    label: "TikTok",
    href: "https://www.tiktok.com/@soucampusmc",
    icon: TiktokLogo,
  },
  { label: "GitHub", href: "https://github.com/SouCampusV2", icon: GithubLogo },
];

const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About me" },
  { href: "/contact", label: "Contact" },
];

export function ContactFooter() {
  const { theme, toggleTheme } = useTheme();

  return (
    <section className="border-t border-zinc-200 dark:border-zinc-800">
      <footer className="px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col gap-10 sm:flex-row sm:justify-between">
          <div className="max-w-xs">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className={`${displayFont.className} text-lg tracking-tight text-orange-500`}
                data-page-transition="true"
              >
                SouCampus
              </Link>
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Toggle dark mode"
                title="Toggle dark mode"
                className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border border-zinc-200 text-zinc-500 transition-colors hover:text-orange-500 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-orange-400"
              >
                {theme === "dark" ? <Moon size={16} /> : <Sun size={16} />}
              </button>
            </div>
            <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
              Custom Minecraft builds on order — castles, spawns, cities, and
              everything in between.
            </p>
          </div>

          <div className="flex flex-wrap gap-10 sm:gap-16">
            <div>
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Navigate
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                {NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
                      data-page-transition="true"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-zinc-950 dark:text-zinc-50">
                Legal
              </h3>
              <ul className="mt-3 space-y-2 text-sm text-zinc-500 dark:text-zinc-400">
                <li>
                  <Link
                    href="/terms"
                    className="transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
                    data-page-transition="true"
                  >
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:items-start">
            {SOCIALS.map(({ label, href, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="cursor-pointer text-zinc-500 transition-colors hover:text-orange-500 dark:text-zinc-400 dark:hover:text-orange-400"
              >
                <Icon size={22} weight="fill" />
              </a>
            ))}
          </div>
        </div>

        <p className="mx-auto mt-10 max-w-6xl border-t border-zinc-200 pt-6 text-center text-sm text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
          © {new Date().getFullYear()} SouCampus builds. All rights reserved.
        </p>
      </footer>
    </section>
  );
}

