import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { Unbounded } from "next/font/google";
import { getAllProducts, getAllProductsWithStats } from "@/lib/products";
import { MarketplaceCatalog } from "@/components/MarketplaceCatalog";
import { CategoryFilter } from "@/components/CategoryFilter";
import { MarketplaceCta } from "@/components/MarketplaceCta";
import { MarketplaceShowcase } from "@/components/MarketplaceShowcase";
import { CategoryFilterStatic } from "@/components/CategoryFilterStatic";
import { PageGlow } from "@/components/PageGlow";
import { INLINE_LINK } from "@/components/Button";

// Тот же дисплейный шрифт, что у hero-заголовков остальных страниц
// (см. DESIGN.md, "Hero-секции страниц").
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

// robots зависит от содержимого: пока опубликованных товаров нет,
// страница остаётся noindex (пустой каталог в выдаче не нужен), а с
// первым товаром сама открывается поисковику — без правки кода.
// Поэтому generateMetadata, а не статический export const metadata.
export async function generateMetadata(): Promise<Metadata> {
  const products = await getAllProducts();
  return {
    title: "Marketplace",
    description:
      "Ready-made Minecraft maps and builds by SouCampus — download instantly after purchase.",
    alternates: { canonical: "/marketplace" },
    robots: products.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function MarketplacePage() {
  // Со статистикой: карточки показывают оценки/покупки, «Most popular»
  // сортируется по продажам (см. MarketplaceCatalog).
  const products = await getAllProductsWithStats();

  // Магазин шире портфолио (тест, по просьбе владельца): контейнер растёт
  // до 1920px, по бокам паддинг доходит до 120px на широких экранах; дальше
  // 1920px не расширяется. Портфолио остаётся max-w-6xl.
  return (
    // Клип живёт на полноширинном <main>, а ограничение ширины — на
    // обёртке контента внутри: на одном элементе они конфликтуют, и
    // max-w отрезал бы свечение по бокам (разбор — в PageGlow).
    <main className="relative w-full flex-1 overflow-x-clip">
      {/* Подсветка акцентом страницы (orange — это витрина, то есть CTA). */}
      <PageGlow color="rgba(251,146,60,0.35)" />

      <div className="mx-auto max-w-[120rem] px-6 pb-16 sm:px-10 sm:pb-28 lg:px-16 xl:px-24 2xl:px-[120px]">
      {/* Hero по общему паттерну: pt-20 от навбара, Unbounded. */}
      <section className="relative pt-20">
        <h1
          className={`${displayFont.className} text-4xl tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
        >
          SouCampus Marketplace
        </h1>
        <p className="mt-4 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Ready-made maps and builds. Pick one, and it&apos;s yours to download
          — no waiting for a custom order.
        </p>
      </section>

      {products.length === 0 ? (
        // Пустое состояние: таблица есть, товаров ещё нет. Страница при
        // этом остаётся noindex (см. generateMetadata) — как раньше.
        <p className="mt-16 max-w-2xl text-zinc-600 dark:text-zinc-400">
          First products are on the way. Meanwhile, check the{" "}
          <Link href="/portfolio" className={`font-medium ${INLINE_LINK}`}>
            portfolio
          </Link>{" "}
          or order a custom build.
        </p>
      ) : (
        // Оба компонента клиентские и оба читают адрес: CategoryFilter
        // ставит ?category, MarketplaceCatalog по нему (и по ?q) отбирает. Общее
        // состояние — сам адрес, а не проп между ними. Suspense обязателен
        // вокруг useSearchParams, иначе статическая /marketplace свалилась бы
        // целиком в client-render.
        //
        // ⚠️ FALLBACK ЗДЕСЬ — НЕ ЗАГЛУШКА, А ТА ЖЕ ВИТРИНА, НАРИСОВАННАЯ
        // СЕРВЕРОМ, и в этом весь смысл правки 2026-09-07.
        //
        // Что было: fallback отсутствовал, поддерево на сервере не
        // рисовалось вовсе, и в HTML на месте каталога была пустота
        // высотой ноль. Браузер получал шапку, сразу под ней баннер
        // заказа — и вставлял каталог между ними уже сам, сдвигая баннер
        // на пол-экрана. Замерено на живом сайте: CLS 0.452 при пороге
        // 0.1. Заодно краулер видел магазин без единой карты.
        //
        // Что теперь: fallback рендерится НА СЕРВЕРЕ, поэтому в HTML
        // лежат настоящие ряды подборок и настоящие ссылки на категории.
        // Клиент на пустом адресе рисует ровно то же самое (тот же
        // MarketplaceShowcase, те же классы панели) — сдвигаться нечему.
        //
        // ⚠️ Серые прямоугольники-скелет здесь ПРОБОВАЛИ И ОТКАТИЛИ 06.09:
        // CLS стал 0.817, вдвое хуже. У витрины два экрана разной высоты,
        // и заглушка, не совпавшая с содержимым, превращает один сдвиг в
        // два. Совпасть может только само содержимое.
        //
        // ⚠️ На адресе С ПАРАМЕТРОМ сдвиг остаётся: сервер при статической
        // сборке параметров не знает и рисует главный экран. Это принято
        // сознательно — такие адреса не индексируются и входной точкой не
        // являются. Убрать и его можно, только сделав страницу
        // динамической (пункт 12 плана, ждёт сотни карт).
        <Suspense
          fallback={
            <>
              <CategoryFilterStatic />
              <MarketplaceShowcase products={products} />
            </>
          }
        >
          <CategoryFilter />
          <MarketplaceCatalog products={products} />
        </Suspense>
      )}

      {/* Замыкающий баннер — ВНЕ условия выше, поэтому он стоит внизу и
          главной витрины, и категории, и результатов поиска, и даже
          пустого каталога (решение владельца 2026-08-26). Человек, не
          нашедший готовую карту, — как раз тот, кому нужна заказная,
          поэтому убирать баннер там, где ничего не нашлось, было бы
          ровно наоборот. */}
      <MarketplaceCta />
      </div>
    </main>
  );
}
