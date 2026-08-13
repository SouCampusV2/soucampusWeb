import Link from "next/link";
import { Unbounded } from "next/font/google";
import { SealCheck } from "@phosphor-icons/react/dist/ssr";
import type { Product } from "@/lib/products";
import { ProductCardImage } from "@/components/ProductCardImage";
import { INLINE_LINK } from "@/components/Button";
import { StarRating } from "@/components/StarRating";

// Тот же дисплейный шрифт, что у hero-заголовков и карточек портфолио
// (см. DESIGN.md, "Hero-секции страниц").
const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

// Карточка товара витрины магазина. Расположение — как у маркетплейсов
// (BuiltByBit/PMC): фото с чипом цены → заголовок → креатор → короткое
// описание → низ: рейтинг слева, число покупок справа. Стиль наш
// (DESIGN.md): `rounded-2xl`, обводка zinc, hover — оранжевая рамка +
// лёгкий зум фото, без scale самой карточки.
//
// Устройство ссылок. Раньше вся карточка была одним <Link>, но внутри
// понадобились ещё две интерактивные вещи: ссылка на автора и стрелки
// листания скринов. Вкладывать ссылку в ссылку нельзя (невалидный HTML,
// и браузер сам решает, куда вести клик). Поэтому карточка — обычный
// <div>, а переход на товар обеспечивает ссылка-ОВЕРЛЕЙ, растянутая на
// всю карточку (absolute inset-0). Всё остальное содержимое клики не
// ловит (pointer-events-none) и пропускает их на оверлей; обратно их
// включают только те элементы, у которых своё действие — ссылка автора и
// стрелки галереи (pointer-events-auto + z-10/z-20).
//
// Оценки/покупки берутся из самого product (подмешиваются в
// getAllProductsWithStats через get_product_stats). Без данных — честные
// нейтральные состояния: пустые звёзды + «Not yet rated», покупки скрыты,
// пока их нет. Никаких выдуманных цифр.
export function ProductCard({
  product,
  creator,
  className = "",
}: {
  product: Product;
  /**
   * Автор карточки. По умолчанию берётся из самого товара
   * (product.creator, подмешивается в getAllProductsWithStats). Проп
   * нужен там, где автор и так известен странице — например на
   * /creator/[handle], чтобы не тянуть профиль повторно.
   */
  creator?: { name: string; href?: string; isVerified?: boolean };
  className?: string;
}) {
  const { rating, ratingCount, salesCount } = product;
  // Товар без автора (creator_id обнулился вместе с удалённым аккаунтом)
  // — показываем нейтральное «Unknown» без ссылки, а не чужое имя.
  const author =
    creator ??
    (product.creator
      ? {
          name: product.creator.displayName,
          href: `/creator/${encodeURIComponent(product.creator.handle)}`,
          isVerified: product.creator.isVerified,
        }
      : { name: "Unknown creator", href: undefined, isVerified: false });
  // images появился вместе с галереей; у старых данных его может не быть —
  // тогда листать нечего, показываем одну обложку.
  const images = product.images?.length ? product.images : [product.image];

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-[#fbfbff] transition-colors hover:border-orange-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-orange-400 ${className}`}
    >
      {/* Ссылка-оверлей: делает кликабельной всю карточку, оставляя место
          для собственных ссылок/кнопок поверх неё. Текст внутри нужен
          скринридеру — у пустой ссылки нет доступного имени. */}
      <Link href={`/marketplace/${product.slug}`} className="absolute inset-0 z-0">
        <span className="sr-only">{product.title}</span>
      </Link>

      <ProductCardImage
        images={images}
        alt={product.title}
        priceLabel={product.price}
      />

      <div className="pointer-events-none flex flex-1 flex-col p-4">
        <h3
          className={`${displayFont.className} text-base leading-tight text-zinc-950 transition-colors group-hover:text-orange-600 dark:text-zinc-50 dark:group-hover:text-orange-400`}
        >
          {product.title}
        </h3>

        {/* Автор — отдельная ссылка на его профиль: с витрины можно уйти
            прямо к креатору, не заходя сначала в карту (просьба владельца
            2026-07-27). */}
        <p className="mt-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          by{" "}
          {author.href ? (
            <Link
              href={author.href}
              className={`pointer-events-auto relative z-10 inline-flex items-center gap-1 ${INLINE_LINK}`}
            >
              {author.name}
              {author.isVerified && <SealCheck size={12} weight="fill" aria-hidden />}
            </Link>
          ) : (
            <span className="inline-flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
              {author.name}
            </span>
          )}
        </p>

        <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
          {product.summary}
        </p>

        {/* Низ карточки: рейтинг слева, покупки справа. mt-auto прижимает
            к низу, чтобы у карточек разной высоты описания эта строка
            выравнивалась по одной линии. */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <StarRating rating={rating ?? 0} />
            <span className="text-zinc-500 dark:text-zinc-400">
              {ratingCount
                ? `${ratingCount} rating${ratingCount === 1 ? "" : "s"}`
                : "Not yet rated"}
            </span>
          </div>

          <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
            {salesCount ?? 0} {(salesCount ?? 0) === 1 ? "purchase" : "purchases"}
          </span>
        </div>
      </div>
    </div>
  );
}
