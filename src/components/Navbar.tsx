"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Unbounded } from "next/font/google";
import { ShoppingCart, ChatCircleDots, Bell, UserCircle } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { DISCORD_INVITE, NAV_LINKS } from "@/lib/site";
import { useCart } from "@/lib/cart-context";

// Same display font as the hero headings — the navbar rhymes with them.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

// Категории-заглушки в режиме магазина. Реально работает только "All
// Map" (ссылка на /shop) — остальное требует колонки категории в
// products, которой пока нет. Не спрятаны, а честно показаны
// неактивными (cursor-not-allowed + title), до готовности функционала.
const SHOP_CATEGORIES = ["Assets", "Landscape", "Free"];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const { count } = useCart();

  // Внутри /shop (каталог или страница товара) содержимое навбара
  // ЗАМЕНЯЕТСЯ целиком: обычные ссылки и "Order now" уступают место
  // магазинным кнопкам. Форма/высота/стекло самой пилюли не меняются —
  // только то, что внутри неё. Вернуться на сайт — через лого SouCampus
  // (оно всегда ведёт на "/"), отдельной ссылки назад в магазине нет.
  const isShopActive = pathname === "/shop" || pathname.startsWith("/shop/");

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

          {isShopActive ? (
            <div className="hidden min-w-0 flex-1 items-center justify-between gap-4 min-[760px]:flex">
              <div className="flex items-center gap-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                <Link
                  href="/shop"
                  className="px-2 py-1.5 transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
                  data-page-transition="true"
                >
                  All Map
                </Link>
                {SHOP_CATEGORIES.map((category) => (
                  <span
                    key={category}
                    title="Categories are coming soon"
                    className="cursor-not-allowed select-none px-2 py-1.5 text-zinc-400 dark:text-zinc-600"
                  >
                    {category}
                  </span>
                ))}
                <Link
                  href="/contact"
                  className="ml-3 px-2 py-1.5 transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
                  data-page-transition="true"
                >
                  Support
                </Link>
              </div>

              <div className="flex shrink-0 items-center gap-5 text-zinc-600 dark:text-zinc-300">
                <button
                  type="button"
                  disabled
                  title="Messages are coming soon"
                  className="cursor-not-allowed opacity-50"
                >
                  <ChatCircleDots size={20} />
                </button>
                <button
                  type="button"
                  disabled
                  title="Notifications are coming soon"
                  className="cursor-not-allowed opacity-50"
                >
                  <Bell size={20} />
                </button>
                <Link
                  href="/cart"
                  data-page-transition="true"
                  aria-label="Cart"
                  className="relative transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
                >
                  <ShoppingCart size={20} />
                  {count > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-zinc-950">
                      {count}
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  disabled
                  title="Sign in is coming soon (Stage 4D)"
                  className="flex cursor-not-allowed items-center gap-1.5 opacity-50"
                >
                  <UserCircle size={20} />
                  <span className="text-sm font-medium">Login</span>
                </button>
              </div>
            </div>
          ) : (
            <ul className="hidden items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 min-[760px]:flex">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="px-2 py-1.5 transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
                    data-page-transition="true"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {!isShopActive && (
            <div className="hidden items-center gap-5 min-[760px]:flex">
              <Link
                href="/cart"
                data-page-transition="true"
                aria-label="Cart"
                className="relative text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
              >
                <ShoppingCart size={20} />
                {count > 0 && (
                  <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-zinc-950">
                    {count}
                  </span>
                )}
              </Link>
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
          )}

          {/* Гамбургер — только вне магазина: показывать в мобильном
              дропдауне в режиме магазина нечего (обычных ссылок нет). */}
          {!isShopActive && (
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
          )}

          {/* Мобильно, в режиме магазина: только рабочая иконка корзины —
              компактный набор без гамбургера (категории/иконки-заглушки
              на узком экране пока не показываем, это первая итерация). */}
          {isShopActive && (
            <Link
              href="/cart"
              data-page-transition="true"
              aria-label="Cart"
              className="relative text-zinc-600 dark:text-zinc-300 min-[760px]:hidden"
            >
              <ShoppingCart size={22} />
              {count > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-zinc-950">
                  {count}
                </span>
              )}
            </Link>
          )}
        </nav>

        <AnimatePresence>
          {open && !isShopActive && (
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
              {NAV_LINKS.map((link) => (
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
              <li className="flex items-center justify-between gap-4 px-6 py-3">
                <Link
                  href="/cart"
                  onClick={() => setOpen(false)}
                  data-page-transition="true"
                  className="relative text-zinc-700 dark:text-zinc-300"
                  aria-label="Cart"
                >
                  <ShoppingCart size={20} />
                  {count > 0 && (
                    <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-zinc-950">
                      {count}
                    </span>
                  )}
                </Link>
                <Button
                  href={DISCORD_INVITE}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="primary"
                  size="sm"
                  className="flex-1"
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
