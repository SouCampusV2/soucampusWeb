"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useRefresh } from "@/lib/useRefresh";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Unbounded } from "next/font/google";
import {
  ShoppingCart,
  ChatCircleDots,
  UserCircle,
} from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/Skeleton";
import { DISCORD_INVITE, NAV_LINKS } from "@/lib/site";
import { isMarketplaceRoute } from "@/lib/marketplace-routes";
import { useCart } from "@/lib/cart-context";
import { useUser } from "@/lib/useUser";
import { SHOP_NAV_LINKS } from "@/lib/products";
import { creatorHref } from "@/lib/creators";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { NotificationsBell } from "@/components/NotificationsBell";

// Same display font as the hero headings — the navbar rhymes with them.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const refresh = useRefresh();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const { count } = useCart();
  const { user, loading: userLoading } = useUser();

  async function handleLogout() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    refresh();
    router.push("/marketplace");
    setOpen(false);
  }

  // Ник и аватар — из user_metadata (их синхронизирует ProfileEditForm),
  // чтобы навбар не ходил в БД на каждой странице.
  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ?? user?.email;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  // Ссылка на СВОЙ публичный профиль — /creator/<ник в нижнем регистре>
  // (см. creatorHref). Раньше здесь стоял захардкоженный
  // /creator/soucampus, из-за чего любой залогиненный уходил на витрину
  // бренда вместо своей страницы (баг, найденный владельцем 2026-07-27).
  // Если ника в метаданных нет (старый аккаунт, где их ещё не
  // синхронизировали), вести некуда — падаем на /profile, это в любом
  // случае своя страница.
  const nickname = user?.user_metadata?.display_name as string | undefined;
  const ownProfileHref = nickname ? creatorHref(nickname) : "/profile";

  // Внутри магазина (каталог, страница товара, корзина, поддержка, а также
  // вход/регистрация — покупка требует аккаунта, это часть флоу магазина)
  // содержимое навбара ЗАМЕНЯЕТСЯ целиком: обычные ссылки и "Order now"
  // уступают место магазинным кнопкам. /cart и /support считаются частью
  // магазина — тот же навбар, что на /marketplace, а не первоначальный:
  // посетитель не должен видеть портфолио-навигацию посреди оформления
  // заказа или обращения в поддержку по купленному товару.
  // Поиска в пилюле НЕТ (убран 2026-07-30): он переехал на саму витрину
  // (CategoryFilter), где поле показывает текущий запрос. В навбаре это
  // было невозможно без того, чтобы утянуть все статические страницы
  // сайта в клиентский рендер — навбар живёт в layout.
  // Форма/стекло самой пилюли не меняются — высоту держит фиксированная
  // h-[…] на <nav> (см. ниже), не кнопка Order now, именно поэтому
  // переход между режимами не дёргает высоту.
  // Вернуться на сайт — через лого SouCampus (оно всегда ведёт на "/"),
  // отдельной ссылки "назад" в магазине нет.
  // Список адресов жил здесь, пока ответ на «это страница магазина?» нужен
  // был одному навбару. Теперь тот же вопрос задаёт PricingSection, поэтому
  // список один и лежит в lib/marketplace-routes.ts (там же и почему
  // вход с кабинетом считаются магазином).
  const isMarketplaceActive = isMarketplaceRoute(pathname);

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

          {isMarketplaceActive ? (
            <div className="ml-6 hidden min-w-0 flex-1 items-center justify-between gap-4 min-[760px]:flex">
              {/* Категории + Support — навигация магазина. Без
                  data-page-transition: внутри магазина без анимации-волны
                  (только на выходе через лого SouCampus). Support — после
                  Free, тем же стилем, что Maps (по просьбе владельца). */}
              <div className="flex shrink-0 items-center gap-1 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                {SHOP_NAV_LINKS.map((link) =>
                  link.soon ? (
                    <span
                      key={link.href}
                      title={link.title}
                      aria-disabled="true"
                      className="cursor-not-allowed px-2 py-1.5 text-zinc-400 dark:text-zinc-500"
                    >
                      {link.label}
                    </span>
                  ) : (
                    <Link
                      key={link.href}
                      href={link.href}
                      className="px-2 py-1.5 transition-colors hover:text-zinc-950 dark:hover:text-zinc-50"
                    >
                      {link.label}
                    </Link>
                  )
                )}
              </div>

              {/* Поиск + иконки — вместе справа. */}
              <div className="flex min-w-0 items-center gap-3 text-zinc-600 dark:text-zinc-300">
                {/* Иконки: gap-1 + p-2 на каждой — крупная зона нажатия. */}
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    disabled
                    title="Messages are coming soon"
                    className="flex cursor-not-allowed items-center justify-center rounded-full p-2 text-zinc-700 dark:text-zinc-200"
                  >
                    <ChatCircleDots size={22} />
                  </button>
                  {/* Колокол стоит всегда — и у гостя, и при нуле
                      уведомлений: иконка, которая то появляется, то нет,
                      дёргала бы соседние и выглядела бы поломкой. Бейдж
                      появляется только когда есть что читать. */}
                  <NotificationsBell userId={user?.id ?? null} />
                  <CartLink
                    count={count}
                    size={22}
                    className="transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50"
                  />
                  {/* Пока не знаем, кто залогинен (сессия читается на
                      клиенте — статический HTML её не содержит), показываем
                      нейтральную заглушку-кружок вместо заведомо неверной
                      иконки «войти». Так нет мелькания «войти → аватар».
                      Размер совпадает с иконкой (p-2 + h-6/w-6), поэтому
                      подмена не дёргает вёрстку. */}
                  {userLoading ? (
                    <div className="flex items-center justify-center p-2" aria-hidden>
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </div>
                  ) : user ? (
                    // Наведение раскрывает меню (Settings / Your resources /
                    // Log out); клик по самому профилю ведёт на публичную
                    // страницу продавца. group + group-hover — без JS-стейта;
                    // focus-within — чтобы открывалось и с клавиатуры. pt-2 на
                    // обёртке меню — прозрачный «мостик», чтобы курсор не терял
                    // hover в зазоре между профилем и карточкой.
                    <div className="group relative flex h-full items-center self-stretch">
                      <Link
                        href={ownProfileHref}
                        title={displayName}
                        className="flex max-w-[11rem] items-center gap-2 rounded-full px-2.5 py-2 text-zinc-700 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50"
                      >
                        <AccountAvatar avatarUrl={avatarUrl ?? null} size={22} />
                        <span className="truncate text-sm font-medium">
                          {displayName}
                        </span>
                      </Link>

                      <div className="invisible absolute left-0 top-full z-50 w-max opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                        {/* Без вертикального паддинга: py-1 оставлял 4px
                            фона над первым и под последним пунктом, из-за
                            чего их подсветка при наведении не доходила до
                            скруглённых краёв — сверху/снизу оставалась
                            белая полоска. overflow-hidden и так вписывает
                            прямоугольную подсветку в радиус карточки. */}
                        {/* Стекло по тому же рецепту, что карточка
                            калькулятора (BuildEstimator): сильный блюр по
                            фону + очень слабая заливка + светлая грань.
                            Прежние bg/95 давали почти непрозрачную
                            подложку — «матовый пластик», а не стекло:
                            сквозь неё ничего не просвечивало, и блюру
                            нечего было размывать. Блик в левом верхнем
                            углу — потому что ровная заливка читается как
                            пластик, настоящее стекло ловит свет
                            неравномерно. */}
                        {/* Заливка плотнее (было /20 и /30): при почти
                            прозрачном фоне сквозь пункты меню просвечивал
                            контент страницы, и текст становился нечитаемым —
                            блюр размывает, но не гасит контраст. Плюс
                            backdrop-brightness приглушает то, что осталось
                            позади, отдельно в светлой и тёмной теме. */}
                        <div className="relative min-w-[11rem] overflow-hidden rounded-2xl border border-white/60 bg-[#fbfbff]/80 shadow-xl shadow-zinc-950/10 backdrop-blur-2xl backdrop-saturate-150 backdrop-brightness-110 dark:border-white/10 dark:bg-zinc-900/85 dark:backdrop-brightness-75">
                          <div
                            aria-hidden
                            // -z-10: блик позиционирован, пункты меню — нет,
                            // поэтому без этого он бы рисовался ПОВЕРХ текста.
                            className="pointer-events-none absolute -left-1/4 -top-1/3 -z-10 h-2/3 w-2/3 rounded-full bg-[#fbfbff]/40 blur-3xl dark:bg-white/10"
                          />
                          <Link
                            href="/settings"
                            className="block px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50"
                          >
                            Settings
                          </Link>
                          {/* Свои карты — управление, а не публичная
                              витрина: раньше пункт вёл на /creator/<ник>,
                              где ничего нельзя было отредактировать. */}
                          <Link
                            href="/resources"
                            className="block px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50"
                          >
                            Your resources
                          </Link>
                          {/* Покупки — отдельным пунктом (просьба владельца
                              2026-07-27): раньше они прятались за
                              «Settings», хотя это разные вещи. */}
                          <Link
                            href="/purchases"
                            className="block px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50"
                          >
                            My purchases
                          </Link>
                          <button
                            type="button"
                            onClick={handleLogout}
                            className="block w-full cursor-pointer px-4 py-2.5 text-left text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50"
                          >
                            Log out
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      aria-label="Sign in"
                      title="Sign in"
                      className="flex items-center justify-center rounded-full p-2 text-zinc-700 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50"
                    >
                      <UserCircle size={22} />
                    </Link>
                  )}
                </div>
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
          {!isMarketplaceActive && (
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

          {/* Мобильный гамбургер. В обоих режимах: вне магазина открывает
              обычную навигацию, в магазине — магазинные вкладки (Maps,
              категории, Support, поиск). Сами дропдауны — ниже, каждый под
              свой режим. */}
          {!isMarketplaceActive && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-1.5 min-[760px]:hidden"
              aria-label="Toggle menu"
            >
              <HamburgerIcon open={open} />
            </button>
          )}

          {/* Мобильно, в режиме магазина: корзина + аккаунт (профиль или
              вход) + гамбургер с магазинной навигацией. Иконки крупнее с
              зоной нажатия p-2, как на десктопе. */}
          {isMarketplaceActive && (
            <div className="flex items-center gap-1 text-zinc-700 dark:text-zinc-200 min-[760px]:hidden">
              <NotificationsBell userId={user?.id ?? null} size={24} />
              <CartLink count={count} size={24} />

              {userLoading ? (
                <div className="flex items-center justify-center p-2" aria-hidden>
                  <Skeleton className="h-6 w-6 rounded-full" />
                </div>
              ) : user ? (
                <Link
                  href="/settings"
                  aria-label="Profile"
                  title={displayName}
                  className="flex items-center justify-center rounded-full p-2"
                >
                  <AccountAvatar avatarUrl={avatarUrl ?? null} size={24} />
                </Link>
              ) : (
                <Link
                  href="/login"
                  aria-label="Sign in"
                  title="Sign in"
                  className="flex items-center justify-center rounded-full p-2"
                >
                  <UserCircle size={24} />
                </Link>
              )}

              <button
                onClick={() => setOpen((v) => !v)}
                className="ml-0.5 flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-1.5"
                aria-label="Toggle menu"
              >
                <HamburgerIcon open={open} />
              </button>
            </div>
          )}
        </nav>

        <AnimatePresence>
          {open && !isMarketplaceActive && (
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

          {/* Магазинная выпадашка: те же вкладки, что в пилюле на десктопе
              (Maps + категории + Support) плюс рабочий поиск. Карта и
              аккаунт уже в верхней строке — здесь только навигация. */}
          {open && isMarketplaceActive && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="absolute inset-x-0 top-[calc(100%+8px)] overflow-hidden rounded-3xl border border-zinc-950/[0.06] bg-[#fbfbff]/95 backdrop-blur-xl dark:border-zinc-50/[0.08] dark:bg-zinc-950/95 min-[760px]:hidden"
            >
              <ul className="pb-2">
                {SHOP_NAV_LINKS.map((link) => (
                  <li key={link.href}>
                    {link.soon ? (
                      <span
                        title={link.title}
                        aria-disabled="true"
                        className="block cursor-not-allowed px-6 py-3 text-sm font-medium text-zinc-400 dark:text-zinc-500"
                      >
                        {link.label}
                        <span className="ml-2 text-xs font-normal">soon</span>
                      </span>
                    ) : (
                      <Link
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className="block px-6 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>
      </header>
    </div>
  );
}

// ── Мелкие детали навбара, которые нужны И на десктопе, И на мобильном ──
// Раньше каждая существовала в двух дословных копиях, отличаясь только
// размером иконки: любую правку приходилось делать дважды, и однажды это
// уже разошлось. Компоненты локальные (не в отдельных файлах) — за
// пределами навбара они не нужны.

// Три полоски гамбургера, складывающиеся в крестик при open.
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <>
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
    </>
  );
}

// Корзина с бейджем-счётчиком. Бейдж прячется при count === 0.
function CartLink({
  count,
  size,
  className = "",
}: {
  count: number;
  size: number;
  className?: string;
}) {
  return (
    <Link
      href="/cart"
      aria-label="Cart"
      className={`relative flex items-center justify-center rounded-full p-2 ${className}`}
    >
      <ShoppingCart size={size} />
      {count > 0 && (
        <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-zinc-950">
          {count}
        </span>
      )}
    </Link>
  );
}

// Аватар пользователя: настоящая картинка, если она загружена, иначе
// иконка-заглушка того же размера.
function AccountAvatar({
  avatarUrl,
  size,
}: {
  avatarUrl: string | null;
  size: number;
}) {
  if (!avatarUrl) return <UserCircle size={size} className="shrink-0" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt=""
      style={{ height: size - 2, width: size - 2 }}
      className="shrink-0 rounded-full object-cover"
    />
  );
}
