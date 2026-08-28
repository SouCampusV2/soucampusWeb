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
// Раскладка сменилась 2026-08-28: карточка теперь ЦЕЛИКОМ фотография
// 16:9, а подпись лежит прямо на её нижнем крае — название и под ним
// одна строка меты (автор · рейтинг · покупки). Цена остаётся чипом в
// правом верхнем углу. Белого блока под фото больше нет: до этого дня
// карточка читалась как «картинка и текст под ней», то есть витрина
// была сеткой белых прямоугольников с картинками сверху.
//
// ⚠️ Два варианта отвергнуты владельцем в тот же день, не повторять:
// вертикальный кадр 3:4 (широкие скриншоты обрезались и мылились) и
// подпись стеклянной ПАНЕЛЬЮ со своей рамкой (читалась коробкой,
// положенной на фотографию). Осталось: родная пропорция кадра и текст
// без контейнера, читаемость которому даёт блюр с маской.
//
// ⚠️ Короткого описания на карточке БОЛЬШЕ НЕТ. Оно занимало две
// строки — на узкой полосе внизу кадра это половина фотографии ради
// текста, который целиком есть на странице карты.
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
          // Подпись карточки — прямо на кадре, без своей поверхности.
          // Размытие и затемнение под ней рисует ProductCardImage; здесь
          // только текст, поэтому и обёртка голая.
          //
          // ⚠️ Цвета без dark:-вариантов намеренно: текст лежит НА ФОТО,
          // а не на фоне сайта, и в обеих темах выглядит одинаково — то
          // же правило, что у чипов поверх фотографий (DESIGN.md).
          <div>
            <h3
              className={`${displayFont.className} line-clamp-1 text-sm leading-tight text-white transition-colors group-hover:text-orange-300`}
            >
              {product.title}
            </h3>

            {/* Мета — ОДНОЙ строкой, точками-разделителями. На широком
                кадре подпись занимает узкую полосу внизу, и три отдельных
                строки (автор, рейтинг, покупки) сожрали бы половину
                фотографии ради данных, которые читаются мельком.
                flex-wrap — страховка на самых узких карточках: строка
                перенесётся, а не вылезет за край. */}
            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px] font-medium text-white/75">
              <span>
                by{" "}
                {/* Автор — отдельная ссылка на его профиль: с витрины
                    можно уйти прямо к креатору, не заходя сначала в карту
                    (просьба владельца 2026-07-27). z-20, потому что лежит
                    на фото рядом со стрелками листания. */}
                {author.href ? (
                  <Link
                    href={author.href}
                    className="pointer-events-auto relative z-20 inline-flex items-center gap-1 font-semibold text-white hover:text-orange-300"
                  >
                    {author.name}
                    {author.isVerified && <SealCheck size={11} weight="fill" aria-hidden />}
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1">{author.name}</span>
                )}
              </span>

              <span aria-hidden className="text-white/35">
                ·
              </span>

              <span className="inline-flex items-center gap-1">
                <StarRating rating={rating ?? 0} size={11} emptyClassName="text-white/30" />
                {ratingCount ? `(${ratingCount})` : "not rated"}
              </span>

              <span aria-hidden className="text-white/35">
                ·
              </span>

              <span>
                {salesCount ?? 0} {(salesCount ?? 0) === 1 ? "purchase" : "purchases"}
              </span>
            </div>
          </div>
        }
      />
    </div>
  );
}
