"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Unbounded } from "next/font/google";
import { Button } from "@/components/Button";

// Same display font as the hero headings — the navbar rhymes with them.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

const DISCORD_INVITE = "https://discord.com/invite/EHudSpvEVV";

const links = [
  { href: "/", label: "Home" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/shop", label: "Shop" },
  { href: "/about", label: "About me" },
  { href: "/contact", label: "Contact" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);

  // PageTransition intercepts nav-link clicks in the capture phase and
  // calls stopPropagation (see PageTransition.tsx) so its own delayed
  // router.push wins the race against Next's Link — but that also stops
  // the click from ever reaching this menu's own onClick={() =>
  // setOpen(false)} on the mobile link, since stopPropagation there halts
  // propagation before it can reach any bubble-phase handler on the
  // target. Closing on route change instead sidesteps the click entirely:
  // whenever the pathname actually changes, the menu closes, regardless of
  // how the navigation got triggered. Done during render (the "adjusting
  // state when a prop changes" pattern React recommends), not in a useEffect
  // — setState synchronously inside an effect body triggers an extra
  // cascading render for no benefit here.
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <div className="sticky top-4 z-50 px-4">
      <header className="relative mx-auto max-w-6xl rounded-full border border-zinc-950/[0.06] bg-[#fbfbff]/60 backdrop-blur-xl dark:border-zinc-50/[0.08] dark:bg-zinc-950/60">
        <nav className="flex items-center justify-between px-6 py-3">
          <Link
            href="/"
            className={`${displayFont.className} text-lg tracking-tight text-orange-500`}
            data-page-transition="true"
          >
            SouCampus
          </Link>

          <ul className="hidden items-center gap-8 text-sm font-medium text-zinc-600 dark:text-zinc-300 min-[760px]:flex">
            {links.map((link) => (
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

          <div className="hidden min-[760px]:block">
            <Button
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              variant="primary"
              size="sm"
            >
              Order now
            </Button>
          </div>

          <button
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-1.5 min-[760px]:hidden"
            aria-label="Toggle menu"
          >
            <motion.span
              animate={{ rotate: open ? 45 : 0, y: open ? 6 : 0 }}
              className="h-0.5 w-6 bg-zinc-900 dark:bg-zinc-100"
            />
            <motion.span
              animate={{ opacity: open ? 0 : 1 }}
              className="h-0.5 w-6 bg-zinc-900 dark:bg-zinc-100"
            />
            <motion.span
              animate={{ rotate: open ? -45 : 0, y: open ? -6 : 0 }}
              className="h-0.5 w-6 bg-zinc-900 dark:bg-zinc-100"
            />
          </button>
        </nav>

        <AnimatePresence>
          {open && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              // absolute + top-[calc(100%+8px)]: a floating card below the
              // pill, not a normal-flow sibling — growing/shrinking this no
              // longer changes the header's own flow height, which is what
              // was shoving every section on the page down (and briefly
              // exposing the plain white body background) every time the
              // menu opened. Its own rounded-3xl card (not flush against
              // the pill) means the always-`rounded-full` header above
              // never has to flatten its corners to fit a flush dropdown.
              className="absolute inset-x-0 top-[calc(100%+8px)] overflow-hidden rounded-3xl border border-zinc-950/[0.06] bg-[#fbfbff]/95 backdrop-blur-xl dark:border-zinc-50/[0.08] dark:bg-zinc-950/95 min-[760px]:hidden"
            >
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block px-6 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                    data-page-transition="true"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="px-6 py-3">
                <Button
                  href={DISCORD_INVITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="primary"
                  size="sm"
                  className="w-full"
                >
                  Order now
                </Button>
              </li>
            </motion.ul>
          )}
        </AnimatePresence>
      </header>
    </div>
  );
}
