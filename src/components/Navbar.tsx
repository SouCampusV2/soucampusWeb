"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import type { User } from "@supabase/supabase-js";
import { Unbounded } from "next/font/google";
import {
  ShoppingCart,
  ChatCircleDots,
  UserCircle,
  Bell,
  CaretDown,
  House,
  Briefcase,
  User as UserIcon,
  EnvelopeSimple,
  Storefront,
  Sparkle,
  BookOpen,
  Lifebuoy,
  Question,
  type Icon,
} from "@phosphor-icons/react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/Skeleton";
import { SiteMark } from "@/components/brand/SiteMark";
import { isMarketplaceRoute } from "@/lib/marketplace-routes";
import { useCart } from "@/lib/cart-context";
import { useDismiss } from "@/lib/useDismiss";
import { useLogout } from "@/lib/useLogout";
import { useUser } from "@/lib/useUser";
import { CREATOR_SIGNUPS_OPEN } from "@/lib/flags";
import { creatorHref } from "@/lib/creators";
import { isPaletteColor, nameColorStyle } from "@/lib/name-colors";

// ── Навбар с 16.11: группы, как в админке ──────────────────────────────
// Выбран в лаборатории бренда (вариант Н1·1, docs/BRAND-IDEAS.md):
//   · слева знак SouCampus — кремовый пиксельный цветок с жёлтой
//     серединкой на оранжевом квадрате, как фавиконка — и ник оранжевым;
//     всегда ведут на главную. Знак слева от ника, как во вкладке браузера;
//   · группы Studio и Marketplace раскрываются панелью — как AdminNav:
//     заголовок капсом с точкой, у пункта название и пояснение, иконка
//     справа, без анимаций (владельцу не нравится движение стрелок).
//     Открытая группа подсвечена своим цветом — лайм или оранжевый, не серым;
//   · справа ВСЕГДА сообщения, уведомления, корзина, аккаунт и последней
//     кнопка «Order a map».
//
// ⚠️ Это сознательно ОТМЕНЯЕТ прежние решения, записанные здесь раньше:
//   · «два навбара — студийный и магазинный, содержимое меняется
//     целиком» (с 27.07) — теперь навбар один на весь сайт, обе стороны —
//     группы в нём;
//   · «в студийном навбаре нет корзины и аккаунта» (28.08, 05.09) —
//     владелец 16.11: корзина, уведомления, сообщения и аккаунт всегда;
//   · «лого в магазине ведёт на витрину» (20.08) — теперь всегда на "/":
//     дверь в магазин есть всегда, это группа Marketplace.
// Остаётся в силе: надпись «Order a map» и адрес /contact (26.08,
// подтверждено 16.11), стрелки у кнопки нет (она никуда не уводит).
//
// Скорость главной (вариант «а», решение владельца 16.11). Аккаунт на
// студийной стороне требует клиента Supabase (~64 КиБ), а главная его
// намеренно не грузила (замер 25.09, docs/PERF.md). Поэтому вне магазина
// он подтягивается, когда браузер освободился после показа страницы
// (useIdle ниже); до этого — заглушка-кружок вместо аватара и простая
// иконка вместо колокола. В магазине — сразу, как раньше.

// Колокол — отдельным чанком: тянет клиент Supabase и Realtime (25.09).
const NotificationsBell = dynamic(() =>
  import("@/components/NotificationsBell").then((m) => m.NotificationsBell),
);

// Same display font as the hero headings — the navbar rhymes with them.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

type NavItem = { href: string; label: string; hint: string; icon: Icon };
type NavGroup = {
  key: string;
  /** Что это за сторона сайта — подпись в раскрытой панели вместо повтора названия группы. */
  about: string;
  label: string;
  dot: string;
  icon: string;
  bar: string;
  /** Подсветка кнопки группы, когда вы в ней или она раскрыта — цветом группы, а не серым (16.11). */
  on: string;
  /** Волна PageTransition на ссылках группы: на студийной стороне есть, внутри магазина нет. */
  wave: boolean;
  items: NavItem[];
};

// Состав групп — со слов владельца 16.11. Contact — только в Studio (из
// Marketplace убран тем же днём); FAQ — в обеих: на /faq есть разделы и
// про заказы, и про карты магазина, подписи у пунктов поэтому разные.
const GROUPS: NavGroup[] = [
  {
    key: "studio",
    label: "Studio",
    about: "Custom builds made to order",
    dot: "bg-lime-500",
    icon: "text-lime-700 dark:text-lime-400",
    bar: "border-lime-500",
    on: "bg-lime-400/25 text-lime-900 dark:bg-lime-400/15 dark:text-lime-200",
    wave: true,
    items: [
      { href: "/", label: "Home", hint: "The studio at a glance", icon: House },
      { href: "/portfolio", label: "Portfolio", hint: "Builds made to order", icon: Briefcase },
      { href: "/about", label: "About me", hint: "Who builds them", icon: UserIcon },
      { href: "/contact", label: "Contact", hint: "Order a custom build", icon: EnvelopeSimple },
      { href: "/faq", label: "FAQ", hint: "Commissions, prices, timelines", icon: Question },
    ],
  },
  {
    key: "market",
    label: "Marketplace",
    about: "Ready maps to buy and download",
    dot: "bg-orange-500",
    icon: "text-orange-600 dark:text-orange-400",
    bar: "border-orange-500",
    on: "bg-orange-400/25 text-orange-900 dark:bg-orange-400/15 dark:text-orange-200",
    wave: false,
    items: [
      { href: "/marketplace", label: "Maps", hint: "Ready maps to download", icon: Storefront },
      { href: "/updates", label: "What's new", hint: "Latest changes on the site", icon: Sparkle },
      { href: "/wiki", label: "Wiki", hint: "How to install a map", icon: BookOpen },
      { href: "/support", label: "Support", hint: "Help with a purchase", icon: Lifebuoy },
      { href: "/faq", label: "FAQ", hint: "Buying and using maps", icon: Question },
    ],
  },
];


const GLASS =
  "rounded-3xl border border-white/60 bg-[#fbfbff]/95 shadow-xl shadow-zinc-950/10 backdrop-blur-2xl backdrop-saturate-150 dark:border-white/10 dark:bg-zinc-900/95";

// Справочные страницы под вкладками HelpTabs. На них ни одна группа не
// подсвечена (решение 17.11): они общие для студии и магазина — FAQ стоит
// в обеих группах, Terms и Privacy ни в одной, — и раньше /faq подсвечивал
// Studio, /wiki — Marketplace, а /terms ничего. Где ты — видно по вкладкам.
const HELP_PAGES = ["/faq", "/wiki", "/terms", "/privacy"];

function isHelpPage(pathname: string) {
  return HELP_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Пункт активен на своей странице и на вложенных (/wiki/…, /portfolio/…). "/" — только сама главная. */
function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * true, когда браузер освободился после первой отрисовки. Нужен, чтобы
 * клиент Supabase не грузился на студийной стороне вместе со страницей
 * (см. шапку файла). Safari без requestIdleCallback — запасной таймер.
 */
function useIdle() {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setIdle(true), { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = globalThis.setTimeout(() => setIdle(true), 1500);
    return () => globalThis.clearTimeout(id);
  }, []);
  return idle;
}

export function Navbar() {
  const [open, setOpen] = useState(false);
  // Какая группа раскрыта на десктопе.
  const [group, setGroup] = useState<string | null>(null);
  const groupsRef = useRef<HTMLDivElement>(null);
  useDismiss(groupsRef, () => setGroup(null), { enabled: group !== null });
  const pathname = usePathname();
  const [prevPathname, setPrevPathname] = useState(pathname);
  const { count } = useCart();
  const isMarketplaceActive = isMarketplaceRoute(pathname);
  const idle = useIdle();
  // В магазине аккаунт нужен сразу, на студийной стороне — после простоя.
  const accountReady = isMarketplaceActive || idle;
  const { user, loading: userLoading } = useUser(accountReady);

  const logout = useLogout();

  async function handleLogout() {
    await logout();
    setOpen(false);
  }

  // Ник и аватар — из user_metadata (их синхронизирует ProfileEditForm),
  // чтобы навбар не ходил в БД на каждой странице. Одно имя на всё
  // (миграция 20260821150000); display_name — запасной вариант для
  // вкладок, открытых до деплоя.
  const displayName =
    (user?.user_metadata?.username as string | undefined) ??
    (user?.user_metadata?.display_name as string | undefined) ??
    user?.email;
  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  // Цвет ника — копия в user_metadata. Ник видит только сам человек,
  // поэтому проверка — лишь «цвет из палитры»; право на цвет стережёт
  // база (protect_name_color).
  const metaColor = user?.user_metadata?.name_color as string | undefined;
  const nameColor = isPaletteColor(metaColor ?? null) ? metaColor : undefined;

  // Ссылка на СВОЙ публичный профиль — /@<username> (до 27.07 тут был
  // захардкоженный /creator/soucampus). Без копии имени в метаданных —
  // /profile. toLowerCase: имя хранится как введено, адрес строчный.
  const handle =
    (user?.user_metadata?.username as string | undefined) ??
    (user?.user_metadata?.display_name as string | undefined);
  const ownProfileHref = handle ? creatorHref(handle.toLowerCase()) : "/profile";

  // Меню и панели закрываются при смене адреса, а не по клику:
  // PageTransition перехватывает клик по ссылке с волной и останавливает
  // его, и onClick ссылки не срабатывает. Сделано во время рендера
  // (паттерн «подстроить состояние под смену пропа»), а не в эффекте.
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
    setGroup(null);
  }

  return (
    <div className="sticky top-4 z-50 px-4">
      {/* Пилюля белая полупрозрачная с размытием того, что под ней (17.11,
          владелец: серая zinc-100/75 от 16.11 не понравилась). Отличать её
          от белой страницы — дело тонкой рамки и размытия, а не серого фона;
          текст и иконки зато темнее (zinc-800), чтобы читались. */}
      <header className="relative mx-auto max-w-6xl rounded-full border border-zinc-950/[0.08] bg-[#fbfbff]/70 backdrop-blur-xl dark:border-zinc-50/[0.08] dark:bg-zinc-900/70">
        {/* Фиксированная высота, не «по содержимому»: навбар всегда одной
            высоты, чем бы ни был заполнен — 4.5rem на телефоне, 5rem от sm. */}
        <nav className="flex h-[4.5rem] items-center justify-between gap-3 px-4 sm:h-20 sm:px-5">
          <div ref={groupsRef} className="flex min-w-0 items-center gap-3 lg:gap-5">
            {/* Знак и ник — всегда на главную, с волной. */}
            <Link
              href="/"
              data-page-transition="true"
              className="flex shrink-0 items-center gap-2.5"
            >
              {/* Знак — общий с футером (brand/SiteMark.tsx). */}
              <SiteMark />
              <span className={`${displayFont.className} hidden text-lg tracking-tight text-[#ff6900] sm:inline`}>
                SouCampus
              </span>
            </Link>

            <div className="hidden items-center gap-1 min-[760px]:flex">
              {GROUPS.map((g) => {
                const inGroup = isHelpPage(pathname)
                  ? false
                  : g.key === "market"
                    ? isMarketplaceActive
                    : !isMarketplaceActive && g.items.some((i) => isActive(i.href, pathname));
                return (
                  <div key={g.key} className="relative">
                    <button
                      type="button"
                      onClick={() => setGroup(group === g.key ? null : g.key)}
                      aria-expanded={group === g.key}
                      className={`flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors ${
                        inGroup || group === g.key
                          ? g.on
                          : "text-zinc-800 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-zinc-50"
                      }`}
                    >
                      <span className={`size-2 rounded-full ${g.dot}`} aria-hidden />
                      {g.label}
                      <CaretDown size={12} weight="bold" className={group === g.key ? "rotate-180" : ""} aria-hidden />
                    </button>
                    {group === g.key && (
                      <div className={`absolute left-0 top-[calc(100%+14px)] z-50 w-80 p-3 ${GLASS}`}>
                        <GroupItems group={g} pathname={pathname} onPick={() => setGroup(null)} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Правая часть, десктоп: сообщения, колокол, корзина, аккаунт, кнопка. */}
          {/* self-stretch: колонка на всю высоту навбара, чтобы «top-full»
              у меню аккаунта значил низ пилюли, а не низ ряда иконок —
              иначе меню вылезало поверх нижнего края навбара (17.11). */}
          <div className="hidden shrink-0 items-center gap-1 self-stretch text-zinc-800 dark:text-zinc-200 min-[760px]:flex">
            <button
              type="button"
              disabled
              title="Messages are coming soon"
              className="flex cursor-not-allowed items-center justify-center rounded-full p-2"
            >
              <ChatCircleDots size={22} />
            </button>
            {/* Колокол стоит всегда — иконка, которая то появляется, то
                нет, дёргала бы соседей. Пока аккаунт не подгружен — просто
                иконка того же размера. */}
            {accountReady ? (
              <NotificationsBell userId={user?.id ?? null} />
            ) : (
              <span className="flex items-center justify-center rounded-full p-2" aria-hidden>
                <Bell size={22} />
              </span>
            )}
            <CartLink
              count={count}
              size={22}
              className="transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50"
            />
            <AccountMenu
              user={user}
              loading={userLoading}
              displayName={displayName}
              nameColor={nameColor}
              avatarUrl={avatarUrl}
              profileHref={ownProfileHref}
              onLogout={handleLogout}
              // Ник рядом с аватаром, как было до 16.11 (владелец 17.11: «ник
              // не в навбаре — странное решение, верни»).
              showName
            />
            {/* «Order a map» и /contact (26.08, подтверждено 16.11): надпись
                говорит, что человек получит, и совпадает с кнопкой в hero.
                Стрелки нет — кнопка никуда с сайта не уводит. */}
            <Button href="/contact" variant="primary" size="sm" pageTransition className="ml-1">
              Order a map
            </Button>
          </div>

          {/* Телефон: колокол, корзина, аккаунт и гамбургер с группами. */}
          <div className="flex items-center gap-1 text-zinc-800 dark:text-zinc-200 min-[760px]:hidden">
            {accountReady ? (
              <NotificationsBell userId={user?.id ?? null} size={24} />
            ) : (
              <span className="flex items-center justify-center rounded-full p-2" aria-hidden>
                <Bell size={24} />
              </span>
            )}
            <CartLink count={count} size={24} />
            {userLoading ? (
              <div className="flex items-center justify-center p-2" aria-hidden>
                <Skeleton className="h-6 w-6 rounded-full" />
              </div>
            ) : user ? (
              // Тап по аватару — на СВОЙ публичный профиль; пункты
              // аккаунта лежат в гамбургере.
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
              aria-expanded={open}
            >
              <HamburgerIcon open={open} />
            </button>
          </div>
        </nav>

        {/* Гамбургер: обе группы подряд, кнопка заказа, аккаунт.
            absolute + top-[calc(100%+8px)] — карточка под пилюлей, а не
            сосед в потоке: иначе раскрытие сдвигало бы всю страницу. */}
        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="absolute inset-x-0 top-[calc(100%+8px)] max-h-[calc(100svh-7rem)] overflow-y-auto rounded-3xl border border-zinc-950/[0.06] bg-[#fbfbff]/95 backdrop-blur-xl dark:border-zinc-50/[0.08] dark:bg-zinc-950/95 min-[760px]:hidden"
            >
              <div className="space-y-3 p-3">
                {GROUPS.map((g) => (
                  <GroupItems key={g.key} group={g} pathname={pathname} onPick={() => setOpen(false)} withLabel />
                ))}
                <Button href="/contact" variant="primary" size="sm" pageTransition className="w-full">
                  Order a map
                </Button>
              </div>
              <AccountLinks
                user={user}
                loading={userLoading}
                displayName={displayName}
                nameColor={nameColor}
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

/**
 * Пункты группы — как в AdminNav: заголовок капсом с точкой, у пункта
 * название и пояснение, иконка справа (просьба владельца 16.11, в админке
 * она слева). Активный пункт — цветная черта слева. Без анимаций.
 * Одна разметка и для панели на десктопе, и для гамбургера.
 */
// Шапка панели (17.11, владелец): на десктопе — не название группы (оно
// уже написано на кнопке, которую нажали), а что эта сторона значит. В
// мобильном меню кнопок нет и обе группы идут подряд, поэтому там
// название остаётся, а подпись — рядом с ним.
function GroupItems({
  group,
  pathname,
  onPick,
  withLabel = false,
}: {
  group: NavGroup;
  pathname: string;
  onPick: () => void;
  withLabel?: boolean;
}) {
  return (
    <div>
      <p className="flex items-center gap-2 px-3 pb-2 pt-1 text-sm text-zinc-600 dark:text-zinc-400">
        <span className={`size-1.5 shrink-0 rounded-full ${group.dot}`} aria-hidden />
        {withLabel && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500 dark:text-zinc-400">
            {group.label} ·
          </span>
        )}
        {group.about}
      </p>
      <ul className="space-y-1">
        {group.items.map((item) => {
          const on = isActive(item.href, pathname);
          return (
            <li key={item.label}>
              <Link
                href={item.href}
                onClick={onPick}
                aria-current={on ? "page" : undefined}
                // ⚠️ undefined, а не false: PageTransition проверяет
                // hasAttribute, а false React напечатал бы строкой.
                data-page-transition={group.wave ? "true" : undefined}
                className={`flex items-center gap-3 rounded-2xl border-l-2 px-3 py-2.5 transition-colors ${
                  on
                    ? `${group.bar} bg-zinc-950/[0.05] dark:bg-zinc-50/[0.06]`
                    : "border-transparent hover:bg-zinc-950/[0.04] dark:hover:bg-zinc-50/[0.05]"
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-zinc-950 dark:text-zinc-50">{item.label}</span>
                  <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">{item.hint}</span>
                </span>
                <item.icon size={20} className={`shrink-0 ${group.icon}`} aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
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
  nameColor?: string;
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
  nameColor,
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
        className="flex items-center justify-center rounded-full p-2 text-zinc-800 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50"
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
        className={`flex max-w-[11rem] items-center rounded-full py-2 text-zinc-800 transition-colors hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50 ${
          // pr больше pl: у аватара свои прозрачные поля, и при равных
          // отступах справа казалось тесно (владелец 17.11).
          showName ? "gap-1.5 pl-2 pr-4" : "px-2"
        }`}
      >
        <Avatar avatarUrl={avatarUrl ?? null} size={28} />
        {showName && (
          <span className="truncate text-sm font-medium" style={nameColorStyle(nameColor)}>
            {displayName}
          </span>
        )}
      </Link>

      {/* Меню — вплотную к нижнему краю навбара, без зазора (владелец 17.11,
          третий заход: 14px и 6px — «гап всё ещё есть»). top-full считается
          от колонки во всю высоту навбара (self-stretch выше), поэтому это
          и есть низ пилюли. left-0: меню начинается от левого края кнопки
          профиля и, будучи шире, выступает вправо (владелец 17.11). */}
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
            <Link
              href={profileHref}
              className={`${MENU_ITEM} max-w-[14rem] truncate`}
              style={nameColorStyle(nameColor)}
            >
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
  nameColor,
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
            <span className="truncate" style={nameColorStyle(nameColor)}>
              {displayName}
            </span>
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
