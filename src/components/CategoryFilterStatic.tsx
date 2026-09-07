import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { SHOP_CATEGORIES } from "@/lib/products";
import { TOGGLE_PILL_COLORS } from "@/components/Button";
import {
  CATALOG_BAR_OUTER,
  CATALOG_BAR_ROW,
  CATALOG_FILTER_BUTTON,
  CATALOG_PILL,
  CATALOG_PILL_ROW,
  CATALOG_SEARCH_FORM,
  CATALOG_SEARCH_GROUP,
  CATALOG_SEARCH_INPUT,
} from "@/lib/catalog-chrome";

// Панель каталога, нарисованная СЕРВЕРОМ.
//
// ⚠️ ЭТО НЕ КОПИЯ CategoryFilter, А ЕГО НЕПОДВИЖНЫЙ БЛИЗНЕЦ, и разница
// между ними ровно одна: здесь нет поведения. Классы у обоих общие и
// лежат в одном месте (`lib/catalog-chrome.ts`) — иначе они разъедутся,
// и вернётся сдвиг макета, ради устранения которого файл и появился.
//
// ЗАЧЕМ. `/marketplace` собирается статически, а `CategoryFilter`
// клиентский и читает адрес — значит при сборке на сервере он не
// рисуется вовсе. Этот компонент стоит в `fallback` у `<Suspense>` и
// занимает ровно его место и высоту, пока браузер не оживит настоящий.
//
// ⚠️ ПИЛЮЛИ ЗДЕСЬ — НАСТОЯЩИЕ ССЫЛКИ, и это не мелочь. До 2026-09-07
// категорий не было в серверном HTML вообще: краулер видел магазин без
// единого названия и без единого пути внутрь каталога. Теперь `<a href>`
// на каждую категорию есть в разметке, и по ним можно пройти даже без
// JavaScript. Кнопками их делать здесь нельзя: кнопка без обработчика —
// это тупик и для поисковика, и для человека с отключённым JS.
//
// ⚠️ ПОДСВЕЧЕНА «Collections» — ровно как у клиентской версии на пустом
// адресе. Другое состояние здесь невозможно: сервер при статической
// сборке параметров не знает, а пустой адрес — это и есть главная
// витрина. Для адреса с фильтром браузер перерисует панель сам.
//
// Поиск — рамка без поля ввода: `<input>` без состояния принял бы текст,
// который негде обработать и который пропадёт при гидратации. Пустая
// рамка честнее — она обещает ровно то, что даёт: место, которое вот-вот
// оживёт.

export function CategoryFilterStatic() {
  const { off: inactive, on: selected } = TOGGLE_PILL_COLORS;

  return (
    <div className={CATALOG_BAR_OUTER}>
      <div className={CATALOG_BAR_ROW}>
        <div className={CATALOG_SEARCH_GROUP}>
          <div className={CATALOG_SEARCH_FORM}>
            <MagnifyingGlass
              size={16}
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500"
            />
            {/* aria-hidden: для чтения с экрана этой заглушки не
                существует — настоящее поле приедет через мгновение, и
                объявлять два поля подряд было бы хуже, чем ни одного. */}
            <div className={CATALOG_SEARCH_INPUT} aria-hidden>
              {/* Неразрывный пробел держит высоту строки: пустой div
                  схлопнулся бы, и панель поехала бы вверх — то есть мы
                  получили бы тот самый сдвиг в миниатюре. */}
              &nbsp;
            </div>
          </div>
          <div
            className={`${CATALOG_FILTER_BUTTON} ${inactive} shrink-0`}
            aria-hidden
          >
            Filters
          </div>
        </div>

        <div className={CATALOG_PILL_ROW}>
          <Link href="/marketplace?collection=all" className={`${CATALOG_PILL} ${inactive}`}>
            All maps
          </Link>

          {SHOP_CATEGORIES.map((category) => (
            <Link
              key={category.slug}
              href={`/marketplace?category=${category.slug}`}
              className={`${CATALOG_PILL} ${inactive}`}
            >
              {category.label}
            </Link>
          ))}

          <Link href="/marketplace" className={`${CATALOG_PILL} ${selected}`}>
            Collections
          </Link>
        </div>
      </div>
    </div>
  );
}
