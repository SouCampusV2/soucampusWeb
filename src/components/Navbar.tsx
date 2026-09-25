"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { User } from "@supabase/supabase-js";
import { Unbounded } from "next/font/google";
import {
  ShoppingCart,
  ChatCircleDots,
  UserCircle,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/Skeleton";
import { NAV_LINKS } from "@/lib/site";
import { isMarketplaceRoute } from "@/lib/marketplace-routes";
import { useCart } from "@/lib/cart-context";
import { useLogout } from "@/lib/useLogout";
import { useUser } from "@/lib/useUser";
import { CREATOR_SIGNUPS_OPEN } from "@/lib/flags";
import { SHOP_NAV_LINKS } from "@/lib/products";
import { creatorHref } from "@/lib/creators";

// Колокол — отдельным чанком: он есть только в режиме магазина, а тянет
// за собой клиент Supabase и Realtime. Статический импорт клал их в
// бандл каждой страницы, включая лендинг (25.09).
const NotificationsBell = dynamic(() =>
  import("@/components/NotificationsBell").then((m) => m.NotificationsBell),
);

// Same display font as the hero headings — the navbar rhymes with them.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

export function Navbar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const { count } = useCart();
  // Аккаунт навбар показывает только в режиме магазина — там и спрашиваем
  // Supabase. На студийной стороне хук молчит, и клиент Supabase на
  // лендинг не грузится вовсе (замер 25.09, docs/PERF.md).
  const { user, loading: userLoading } = useUser(isMarketplaceRoute(pathname));

  const logout = useLogout();

  async function handleLogout() {
    await logout();
    setOpen(false);
  }

  // Ник и аватар — из user_metadata (их синхронизирует ProfileEditForm),
  // чтобы навбар не ходил в БД на каждой странице.
  // Одно имя на всё (миграция 20260821150000): им подписан профиль, из
  // него же строится ссылка. display_name читаем запасным вариантом —
  // у вкладок, открытых до деплоя, в метаданных лежит только он.
  const displayName =
    (user?.user_metadata?.username as string | undefined) ??
    (user?.user_metadata?.display_name as string | undefined) ??
    user?.email;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;

  // Ссылка на СВОЙ публичный профиль — /@<username>.
  //
  // Раньше здесь стоял захардкоженный /creator/soucampus, из-за чего
  // любой залогиненный уходил на витрину бренда (баг владельца
  // 2026-07-27).
  //
  // Метаданные, а не запрос в БД: навбар рисуется на каждой странице, и
  // поход в базу ради одной ссылки стоил бы дороже всего остального
  // навбара. Копию имени кладут туда форма настроек и регистрация.
  // У аккаунта, который с 21.08 ещё не сохранялся, копии нет — тогда
  // ведём на /profile: это в любом случае своя страница, просто личная
  // вместо публичной.
  //
  // toLowerCase: имя хранится как введено («SouCampus»), адрес строчный.
  const handle =
    (user?.user_metadata?.username as string | undefined) ??
    (user?.user_metadata?.display_name as string | undefined);
  const ownProfileHref = handle ? creatorHref(handle.toLowerCase()) : "/profile";

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
  // Куда ведёт лого — зависит от режима (изменено 2026-08-20, решение
  // владельца). Раньше правило было «всегда на "/"», и лого работало
  // единственной дверью из магазина наружу. Правило родилось 27.07, когда
  // сайт был портфолио с пристроенным магазином; по docs/BUSINESS.md всё
  // наоборот — продажа карт основной путь. Выбрасывать покупателя из
  // корзины на лендинг про заказные постройки значит терять его на
  // полпути, поэтому в режиме магазина лого ведёт на витрину: "домой" для
  // него — /marketplace.
  //
  // Дверь наружу при этом никуда не делась, иначе получилась бы ловушка:
  // из магазина не выйти. Её роль перешла к пункту "Studio" в
  // SHOP_NAV_LINKS (последним в списке) — он же попадает и в мобильное
  // меню, потому что оба рисуются из одного массива.
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
          {/* ⚠️ ОБЁРТКА ЕСТЬ ТОЛЬКО В МАГАЗИНЕ, и она несущая, а не
              декоративная. Чтобы средний блок стоял по центру ПИЛЮЛИ, а
              не по центру промежутка между соседями, боковые колонки
              обязаны быть одной ширины — это и делает flex-1 basis-0 с
              обеих сторон. Без обёртки левая колонка равна ширине слова
              «SouCampus», правая — пяти иконкам, и центр уезжает влево
              ровно на половину разницы.

              В портфолио-режиме — display:contents: обёртка исчезает из
              раскладки целиком, и <nav> видит ссылку своим прямым
              ребёнком, как было. Там центрировать нечего: у nav трое
              детей и justify-between уже ставит средний посередине. */}
          <div
            className={
              isMarketplaceActive
                ? "flex min-w-0 flex-1 basis-0 items-center"
                : "contents"
            }
          >
            {/* Волна — только на портфолио-стороне. До 2026-08-20 лого в
                магазине вело на "/", то есть было ВЫХОДОМ наружу, и
                анимация там была уместна; тогда же адрес сменили на
                витрину, а атрибут остался безусловным — и лого стало
                единственной ссылкой магазина, запускающей волну.

                ⚠️ undefined, а не false: PageTransition спрашивает
                hasAttribute, а false React отрисовал бы строкой "false" —
                атрибут остался бы на месте и проверка бы его нашла. Тот же
                приём, что в Button.tsx. */}
            <Link
              href={isMarketplaceActive ? "/marketplace" : "/"}
              className={`${displayFont.className} shrink-0 text-lg tracking-tight text-orange-500`}
              data-page-transition={isMarketplaceActive ? undefined : "true"}
            >
              SouCampus
            </Link>
          </div>

          {isMarketplaceActive ? (
            <>
              {/* Категории + Support — навигация магазина. Без
                  data-page-transition: внутри магазина анимации-волны нет.
                  Раньше здесь стояло «только на выходе через лого
                  SouCampus» — с 2026-08-20 неверно: лого в магазине никуда
                  не выходит, оно ведёт на витрину. Выход — пункт
                  "Studio", последний в SHOP_NAV_LINKS. */}
              {/* flex-1 + justify-center — чтобы ссылки стояли ПО ЦЕНТРУ,
                  как в портфолио-режиме (просьба владельца 2026-08-22).
                  Раньше стоял shrink-0, и группа прижималась к лого.

                  Почему в портфолио это вышло само: там у <nav> трое детей
                  (лого, список, кнопка) и justify-between — средний оказывается
                  ровно посередине между крайними. В магазине ссылки и иконки
                  лежат внутри ОДНОГО ребёнка, то есть среднего детя нет вовсе —
                  распорка его и заменяет.

                  whitespace-nowrap обязателен: flex-1 разрешает не только расти,
                  но и сжиматься, а «What’s new» на узком экране порвалось бы
                  на две строки и раздуло пилюлю по высоте. */}
              <div className="hidden shrink-0 items-center justify-center gap-1 whitespace-nowrap text-sm font-medium text-zinc-600 dark:text-zinc-300 min-[760px]:flex">
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

              {/* Правая колонка. flex-1 basis-0 — тот же вес, что у
                  колонки с лого: две одинаковые боковые колонки и есть
                  весь механизм центрирования средней. justify-end
                  прижимает иконки к краю пилюли. */}
              <div className="hidden min-w-0 flex-1 basis-0 items-center justify-end gap-3 text-zinc-600 dark:text-zinc-300 min-[760px]:flex">
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
                  <AccountMenu
                    user={user}
                    loading={userLoading}
                    displayName={displayName}
                    avatarUrl={avatarUrl}
                    profileHref={ownProfileHref}
                    onLogout={handleLogout}
                    showName
                  />
                </div>
              </div>
            </>
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
            /* ⚠️ АККАУНТА ЗДЕСЬ НЕТ — и это решение, а не пропуск
               (владелец, 2026-09-05). 01.09 вход в аккаунт сюда добавили
               по просьбе из TEMP.md 1.8, владелец посмотрел на живом
               сайте и убрал: аватар в студийном навбаре — не то решение.
               Вопрос не в кнопке, а в том, как студия и магазин вообще
               соединяются; владелец продумает это отдельно.

               ⚠️ Не возвращать «заодно» с чем-нибудь другим. Корзины
               здесь нет по тому же счёту (решение 28.08): студия и
               магазин рекламируются раздельно, и всё магазинное на этой
               стороне маячить не должно, пока связь не придумана.

               Компоненты AccountMenu/AccountLinks живы и работают — их
               рисует режим магазина. Убран вызов, а не механизм. */
            <div className="hidden items-center gap-1 min-[760px]:flex">
              {/* «Order a map», а не «Order now», и ведёт на /contact, а не
                  сразу в Discord (решение владельца 2026-08-26). Надпись
                  здесь и в hero главной была разной, а обещание одно —
                  два имени у одного действия читаются как два разных.
                  Выбрана та, что говорит, ЧТО человек получит.

                  Адрес поменялся вместе с надписью, иначе две одинаковые
                  кнопки на одном экране (навбар виден и на главной) вели
                  бы в разные места. /contact держит калькулятор и FAQ —
                  ответы на «сколько» и «когда» ДО того, как человек
                  напишет; своя кнопка в Discord там и так стоит
                  последней. */}
              {/* ⚠️ Стрелки здесь НЕТ намеренно (решение владельца
                  2026-08-26, в тот же день, что и её появление). Поворот
                  на -45 у нас означает «уходишь с сайта» — так он стоит у
                  «Join Discord» и «Open Discord». Кнопка ведёт на
                  /contact, то есть никуда не уводит, и стрелка обещала бы
                  переход, которого не будет. Появится внешний адрес —
                  вернуть вместе с ним. */}
              <Button href="/contact" variant="primary" size="sm" pageTransition>
                Order a map
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
                // Тап по аватару ведёт на СВОЙ публичный профиль — как
                // клик по аватару на десктопе. До 26.08 он вёл на
                // /settings, потому что был единственной дверью в аккаунт
                // с телефона и приходилось выбирать один пункт из
                // четырёх. Теперь все четыре лежат в гамбургере (ниже), и
                // выбирать больше не нужно — два аватара ведут в одно
                // место.
                <Link
                  href={ownProfileHref}
                  aria-label="My profile"
                  title={displayName}
                  className="flex items-center justify-center rounded-full p-2"
                >
                  <Avatar avatarUrl={avatarUrl ?? null} size={24} />
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
            /* Снова motion.ul, как было до 01.09. На один день здесь
               появлялся раздел аккаунта, а он не пункт списка — <div>
               внутри <ul> невалиден, из-за него список и уезжал на
               уровень внутрь motion.div. Аккаунт убран (см. десктопную
               группу выше), лишний уровень вместе с ним. */
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
                  href="/contact"
                  variant="primary"
                  size="sm"
                  pageTransition
                  className="w-full"
                >
                  Order a map
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

              <AccountLinks
                user={user}
                loading={userLoading}
                displayName={displayName}
                avatarUrl={avatarUrl}
                profileHref={ownProfileHref}
                onLogout={handleLogout}
                onNavigate={() => setOpen(false)}
              />
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

// ── Аккаунт: одно меню на оба режима навбара ──────────────────────────
// До 01.09 эти пункты жили только в магазинной ветке, и на
// портфолио-стороне войти в аккаунт было нельзя ниоткуда. Второй,
// скопированный набор пунктов был бы вторым ответом на один вопрос — тем
// самым, про который в этом файле уже написано «рано или поздно
// разъедутся». Поэтому меню вынесено сюда, а обе ветки его зовут.
//
// Пункты и их условия (включая CREATOR_SIGNUPS_OPEN) описаны теперь ОДИН
// раз на весь навбар — десктоп и мобильный берут их отсюда.

type AccountProps = {
  user: User | null;
  loading: boolean;
  displayName?: string;
  avatarUrl?: string;
  profileHref: string;
  onLogout: () => void;
};

// Пункт выпадающего меню на десктопе. Строкой-константой, а не classNames
// в каждом Link: пунктов пять, и одинаковыми они должны быть по
// определению, а не по внимательности.
const MENU_ITEM =
  "block px-4 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50";

// Пункт мобильной выпадашки: без hover (на тач-экране его нет) и с
// паддингом самой выпадашки.
const MOBILE_ITEM =
  "block px-6 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300";

// Десктоп: аватар (в магазине — с ником) + меню под ним.
//
// Наведение раскрывает меню, клик по самому аватару ведёт на публичный
// профиль. group + group-hover — без JS-состояния; focus-within — чтобы
// открывалось и с клавиатуры.
//
// ⚠️ На тач-экране hover не наступает НИКОГДА, поэтому на телефоне этого
// меню не существует и существовать не может — там работает AccountLinks
// внутри гамбургера (правило записано 26.08, когда с телефона нельзя было
// выйти из аккаунта).
function AccountMenu({
  user,
  loading,
  displayName,
  avatarUrl,
  profileHref,
  onLogout,
  showName,
}: AccountProps & { showName: boolean }) {
  // Пока не знаем, кто залогинен (сессия читается на клиенте — статический
  // HTML её не содержит), показываем нейтральную заглушку-кружок вместо
  // заведомо неверной иконки «войти». Так нет мелькания «войти → аватар».
  // Размер совпадает с иконкой (p-2 + h-6/w-6), поэтому подмена не дёргает
  // вёрстку.
  if (loading) {
    return (
      <div className="flex items-center justify-center p-2" aria-hidden>
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <Link
        href="/login"
        aria-label="Sign in"
        title="Sign in"
        className="flex items-center justify-center rounded-full p-2 text-zinc-700 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50"
      >
        <UserCircle size={22} />
      </Link>
    );
  }

  return (
    <div className="group relative flex h-full items-center self-stretch">
      <Link
        href={profileHref}
        title={displayName}
        aria-label={showName ? undefined : "My profile"}
        className={`flex max-w-[11rem] items-center rounded-full py-2 text-zinc-700 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50 ${
          showName ? "gap-2 px-2.5" : "px-2"
        }`}
      >
        <Avatar avatarUrl={avatarUrl ?? null} size={22} />
        {showName && (
          <span className="truncate text-sm font-medium">{displayName}</span>
        )}
      </Link>

      <div className="invisible absolute left-0 top-full z-50 w-max opacity-0 transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
        {/* Без вертикального паддинга: py-1 оставлял 4px фона над первым и
            под последним пунктом, из-за чего их подсветка при наведении не
            доходила до скруглённых краёв. overflow-hidden и так вписывает
            прямоугольную подсветку в радиус карточки. */}
        {/* Стекло по тому же рецепту, что карточка калькулятора
            (BuildEstimator): сильный блюр по фону, слабая заливка, светлая
            грань. Блик в левом верхнем углу — потому что ровная заливка
            читается как пластик, настоящее стекло ловит свет неравномерно.
            Заливка при этом плотная: сквозь почти прозрачную просвечивал
            контент страницы, а блюр размывает, но не гасит контраст. */}
        <div className="relative min-w-[11rem] overflow-hidden rounded-2xl border border-white/60 bg-[#fbfbff]/80 shadow-xl shadow-zinc-950/10 backdrop-blur-2xl backdrop-saturate-150 backdrop-brightness-110 dark:border-white/10 dark:bg-zinc-900/85 dark:backdrop-brightness-75">
          <div
            aria-hidden
            // -z-10: блик позиционирован, пункты меню — нет, поэтому без
            // этого он бы рисовался ПОВЕРХ текста.
            className="pointer-events-none absolute -left-1/4 -top-1/3 -z-10 h-2/3 w-2/3 rounded-full bg-[#fbfbff]/40 blur-3xl dark:bg-white/10"
          />
          {/* Имя первой строкой — только там, где его нет у самого аватара
              (портфолио-сторона). В магазине ник написан рядом с аватаром,
              и повторять его в меню значило бы сказать одно дважды. */}
          {!showName && (
            <Link href={profileHref} className={`${MENU_ITEM} max-w-[14rem] truncate`}>
              {displayName}
            </Link>
          )}
          <Link href="/settings" className={MENU_ITEM}>
            Settings
          </Link>
          {/* Свои карты — управление, а не публичная витрина.

              Пока приём авторов заморожен, пункта нет ни у кого — включая
              владельца. Причина не в правах (у владельца они есть), а в
              том, что меню одно на всех и знать, кто его открыл, оно не
              может: useUser отдаёт пользователя, а не is_creator.
              Дотягивать флаг запросом — лишний поход в базу на каждой
              странице ради одного человека, который дойдёт по адресу
              /resources напрямую. При разморозке пункт возвращается. */}
          {CREATOR_SIGNUPS_OPEN && (
            <Link href="/resources" className={MENU_ITEM}>
              Your resources
            </Link>
          )}
          {/* Покупки — отдельным пунктом (просьба владельца 2026-07-27):
              раньше они прятались за Settings, хотя это разные вещи. */}
          <Link href="/purchases" className={MENU_ITEM}>
            My purchases
          </Link>
          <button
            type="button"
            onClick={onLogout}
            className={`${MENU_ITEM} w-full cursor-pointer text-left`}
          >
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}

// Мобильный: тот же аккаунт разделом внизу гамбургера, под чертой.
//
// Раздел стоит ПОД навигацией, а не над ней: вкладки здесь главные, и
// сдвигать их вниз ради второстепенного значило бы переставить то, к чему
// уже привыкли. Черта разделяет два разных вопроса — «куда пойти» и «что
// сделать со своим аккаунтом».
function AccountLinks({
  user,
  loading,
  displayName,
  avatarUrl,
  profileHref,
  onLogout,
  onNavigate,
}: AccountProps & { onNavigate: () => void }) {
  return (
    <div className="border-t border-zinc-950/[0.06] pb-2 dark:border-zinc-50/[0.08]">
      {loading ? (
        // Та же нейтральная заглушка, что в строке навбара: показать
        // «Sign in» тому, кто на самом деле вошёл, — хуже, чем не показать
        // пока ничего.
        <div className="flex items-center gap-3 px-6 py-3" aria-hidden>
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-4 w-24 rounded-full" />
        </div>
      ) : user ? (
        <>
          {/* Первой строкой — сам человек: аватар и имя ведут на публичный
              профиль. Это заодно подпись раздела, поэтому отдельного
              заголовка «Account» нет. */}
          <Link
            href={profileHref}
            onClick={onNavigate}
            className="flex items-center gap-3 px-6 py-3 text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            <Avatar avatarUrl={avatarUrl ?? null} size={24} />
            <span className="truncate">{displayName}</span>
          </Link>
          <Link href="/settings" onClick={onNavigate} className={MOBILE_ITEM}>
            Settings
          </Link>
          {CREATOR_SIGNUPS_OPEN && (
            <Link href="/resources" onClick={onNavigate} className={MOBILE_ITEM}>
              Your resources
            </Link>
          )}
          <Link href="/purchases" onClick={onNavigate} className={MOBILE_ITEM}>
            My purchases
          </Link>
          {/* handleLogout сам закрывает меню — своего onNavigate здесь не
              нужно. */}
          <button
            type="button"
            onClick={onLogout}
            className={`${MOBILE_ITEM} w-full cursor-pointer text-left`}
          >
            Log out
          </button>
        </>
      ) : (
        // Гостю — одна строка. Иконка входа есть и в верхней строке, но
        // она без подписи; словами понятнее.
        <Link href="/login" onClick={onNavigate} className={MOBILE_ITEM}>
          Sign in
        </Link>
      )}
    </div>
  );
}

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
