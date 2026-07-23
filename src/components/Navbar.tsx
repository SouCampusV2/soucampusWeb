"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Unbounded } from "next/font/google";
import {
  ShoppingCart,
  ChatCircleDots,
  Bell,
  UserCircle,
  MagnifyingGlass,
} from "@phosphor-icons/react";
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

  // Внутри магазина (каталог, страница товара, корзина) содержимое
  // навбара ЗАМЕНЯЕТСЯ целиком: обычные ссылки и "Order now" уступают
  // место магазинным кнопкам. /cart считается частью магазина — тот же
  // навбар, что на /shop, а не первоначальный: посетитель не должен
  // видеть портфолио-навигацию посреди оформления заказа.
  // Форма/стекло самой пилюли не меняются — высоту держит фиксированная
  // h-[…] на <nav> (см. ниже), не кнопка Order now, именно поэтому
  // переход между режимами не дёргает высоту.
  // Вернуться на сайт — через лого SouCampus (оно всегда ведёт на "/"),
  // отдельной ссылки "назад" в магазине нет.
  const isShopActive =
    pathname === "/shop" || pathname.startsWith("/shop/") || pathname === "/cart";

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
        {/* Фиксированная высота, не "по содержимому": раньше высоту пилюли
            задавала кнопка Order now (h-12/h-14) + вертикальный паддинг
            (py-3, ещё 24px) — без кнопки, в режиме магазина, содержимое
            занимало меньше места, и min-h (без учёта паддинга) этого не
            перекрывал: сама кнопка "72px = py-3 24px + h-12 48px" всегда
            была выше, чем формальный минимум. Точное число — то, что
            раньше получалось само: 4.5rem (72px) мобильный, 5rem (80px)
            от sm — навбар всегда одной высоты, чем бы ни было заполнено. */}
        <nav className="flex h-[4.5rem] items-center justify-between gap-4 px-6 sm:h-20">
          <Link
            href="/"
            className={`${displayFont.className} shrink-0 text-lg tracking-tight text-orange-500`}
            data-page-transition="true"
          >
            SouCampus
          </Link>

          {isShopActive ? (
            <div className="ml-6 hidden min-w-0 flex-1 items-center justify-between gap-4 min-[760px]:flex">
              <div className="flex items-center gap-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                {/* Активная вкладка — та же капсула, что раньше была у
                    пункта Shop в обычном навбаре: сплошной мягкий фон +
                    жирный текст, а не просто hover-подсветка. */}
                {/* Без data-page-transition: навигация ВНУТРИ магазина не
                    анимируется — волна квадратиков только на переходах
                    обратно на сайт (клик по лого SouCampus). */}
                <Link
                  href="/shop"
                  className="rounded-full bg-zinc-950/10 px-3 py-1.5 font-semibold text-zinc-950 dark:bg-zinc-50/10 dark:text-zinc-50"
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
              </div>

              {/* Заглушка: поиск по товарам — отдельная фича, не готова.
                  disabled + title честно сообщают об этом, а не прячут
                  элемент вовсе — форма будущей панели видна уже сейчас. */}
              <div className="relative min-w-0 max-w-[200px] flex-1">
                <MagnifyingGlass
                  size={16}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-600"
                />
                <input
                  disabled
                  title="Search is coming soon"
                  placeholder="Search"
                  className="w-full cursor-not-allowed rounded-full border border-zinc-950/[0.08] bg-transparent py-1.5 pl-9 pr-3 text-sm text-zinc-600 placeholder:text-zinc-400 dark:border-zinc-50/[0.08] dark:text-zinc-300 dark:placeholder:text-zinc-600"
                />
              </div>

              {/* Support в одной группе с иконками, тот же gap-5, что и
                  между самими иконками — не пришит к категориям слева. */}
              <div className="flex shrink-0 items-center gap-5 text-zinc-600 dark:text-zinc-300">
                <Link
                  href="/support"
                  className="text-sm font-medium transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
                >
                  Support
                </Link>
                <button
                  type="button"
                  disabled
                  title="Messages are coming soon"
                  className="cursor-not-allowed text-zinc-700 dark:text-zinc-200"
                >
                  <ChatCircleDots size={20} />
                </button>
                <button
                  type="button"
                  disabled
                  title="Notifications are coming soon"
                  className="cursor-not-allowed text-zinc-700 dark:text-zinc-200"
                >
                  <Bell size={20} />
                </button>
                <Link
                  href="/cart"
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
                  className="flex cursor-not-allowed items-center gap-1.5 text-zinc-700 dark:text-zinc-200"
                >
                  <UserCircle size={20} />
                  <span className="text-sm font-medium">Login</span>
                </button>
              </div>
            </div>
          ) : (
            <ul className="ml-6 hidden items-center gap-2 text-sm font-medium text-zinc-600 dark:text-zinc-300 min-[760px]:flex">
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

          {/* Корзина — ТОЛЬКО в режиме магазина (см. правую группу выше).
              Обычный навбар её не показывает: магазин и портфолио-сайт
              рекламируются раздельно, корзина не должна маячить, пока
              посетитель просто листает портфолио. */}
          {!isShopActive && (
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
