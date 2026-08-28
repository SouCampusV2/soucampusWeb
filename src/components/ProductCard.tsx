import Link from "next/link";
import { creatorHref } from "@/lib/creators";
import { Unbounded } from "next/font/google";
import { SealCheck } from "@phosphor-icons/react/dist/ssr";
import type { Product } from "@/lib/products";
import { ProductCardImage } from "@/components/ProductCardImage";
import { StarRating } from "@/components/StarRating";

// Тот же дисплейный шрифт, что у hero-заголовков и карточек портфолио
// (см. DESIGN.md, "Hero-секции страниц").
const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

// Карточка товара витрины магазина.
//
// Раскладка сменилась 2026-08-28 (референс владельца): карточка теперь
// ЦЕЛИКОМ фотография 3:4, а вся подпись — стеклянная панель поверх её
// нижнего края: заголовок → автор → короткое описание → черта → рейтинг
// слева, покупки справа. Цена остаётся чипом в правом верхнем углу.
// Белого блока под фото больше нет — до этого дня карточка читалась как
// «картинка и текст под ней», то есть витрина была сеткой белых
// прямоугольников с картинками сверху.
//
// Стиль наш (DESIGN.md): `rounded-2xl`, обводка zinc, hover — оранжевая
// рамка + лёгкий зум фото, без scale самой карточки.
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
          name: product.creator.username,
          // creatorHref, а не своя строка: адрес профиля переехал на
          // /@<имя> ещё 21.08, и эта копия пережила переезд — каждая
          // карточка витрины вела на СТАРЫЙ адрес, а работало это только
          // за счёт редиректа в next.config.ts. Редирект прикрывал
          // протухшую ссылку, вместо того чтобы ловить внешние.
          href: creatorHref(product.creator.handle),
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
        overlay={
          // ВСЯ подпись карточки — стеклянной панелью поверх фото
          // (2026-08-28, по референсу владельца). Раньше под фотографией
          // стоял белый блок, и карточка читалась как «картинка и текст
          // под ней»; теперь она читается как одна вещь — сама карта, а
          // витрина перестаёт быть сеткой белых прямоугольников.
          //
          // Стекло — законный паттерн проекта (DESIGN.md → «Стекло»), и
          // здесь выполняется его условие: за поверхностью есть что
          // размывать — фотография, которая ещё и едет при hover. Это
          // ровно та разница, из-за которой стекло откатили на /cart,
          // где за ним был плоский фон.
          //
          // ⚠️ Без dark:-вариантов намеренно: панель лежит НА ФОТО, а не
          // на фоне сайта, и в обеих темах выглядит одинаково — как чипы
          // поверх фотографий по DESIGN.md.
          <div className="overflow-hidden rounded-xl border border-white/15 bg-zinc-950/45 p-3 backdrop-blur-xl backdrop-saturate-150">
            <h3
              className={`${displayFont.className} line-clamp-2 text-sm leading-tight text-white transition-colors group-hover:text-orange-300`}
            >
              {product.title}
            </h3>

            {/* Автор — отдельная ссылка на его профиль: с витрины можно
                уйти прямо к креатору, не заходя сначала в карту (просьба
                владельца 2026-07-27). z-20, потому что лежит на фото
                рядом со стрелками листания. */}
            <p className="mt-1 text-[11px] font-medium text-white/70">
              by{" "}
              {author.href ? (
                <Link
                  href={author.href}
                  className="pointer-events-auto relative z-20 inline-flex items-center gap-1 font-semibold text-white underline decoration-white/30 decoration-2 underline-offset-4 hover:text-orange-300 hover:decoration-orange-300"
                >
                  {author.name}
                  {author.isVerified && <SealCheck size={12} weight="fill" aria-hidden />}
                </Link>
              ) : (
                <span className="inline-flex items-center gap-1">{author.name}</span>
              )}
            </p>

            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/75">
              {product.summary}
            </p>

            {/* Низ панели: рейтинг слева, покупки справа — та же пара,
                что стояла в белом блоке. Отделена чертой, а не отступом:
                на стекле пустое место читается как край панели. */}
            <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-white/10 pt-2.5 text-[11px]">
              <div className="flex items-center gap-1.5">
                <StarRating rating={rating ?? 0} emptyClassName="text-white/30" />
                <span className="text-white/70">
                  {ratingCount
                    ? `${ratingCount} rating${ratingCount === 1 ? "" : "s"}`
                    : "Not yet rated"}
                </span>
              </div>

              <span className="shrink-0 text-white/70">
                {salesCount ?? 0} {(salesCount ?? 0) === 1 ? "purchase" : "purchases"}
              </span>
            </div>
          </div>
        }
      />
    </div>
  );
}
