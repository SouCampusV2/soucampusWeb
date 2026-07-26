import Link from "next/link";
import Image from "next/image";
import { Unbounded } from "next/font/google";
import { Star, SealCheck } from "@phosphor-icons/react/dist/ssr";
import type { Product } from "@/lib/products";

// Тот же дисплейный шрифт, что у hero-заголовков и карточек портфолио
// (см. DESIGN.md, "Hero-секции страниц").
const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

// Карточка товара витрины магазина. Расположение — как у маркетплейсов
// (BuiltByBit/PMC): фото с чипом цены → заголовок → креатор → короткое
// описание → низ: рейтинг слева, число покупок справа. Стиль наш
// (DESIGN.md): `rounded-2xl`, обводка zinc, hover — оранжевая рамка +
// лёгкий зум фото, без scale самой карточки.
//
// rating/ratingCount/salesCount — задел под подэтапы маркетплейса (оценки
// и покупки, см. docs/SHOP.md). В БД их пока нет, поэтому они опциональны:
// без данных показываем честные нейтральные состояния (пустые звёзды +
// «Not yet rated», покупки скрыты) — расположение то же, выдуманных цифр
// нет. Когда колонки появятся, значения просто начнут прокидываться сюда.
export function ProductCard({
  product,
  creator = { name: "SouCampus" },
  rating,
  ratingCount,
  salesCount,
  className = "",
}: {
  product: Product;
  creator?: { name: string; href?: string };
  rating?: number;
  ratingCount?: number;
  salesCount?: number;
  className?: string;
}) {
  const filledStars = Math.round(rating ?? 0);

  return (
    <Link
      href={`/shop/${product.slug}`}
      className={`group flex flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-[#fbfbff] transition-colors hover:border-orange-400 dark:border-zinc-800 dark:bg-zinc-900/40 dark:hover:border-orange-400 ${className}`}
    >
      <div className="relative aspect-video w-full overflow-hidden">
        <Image
          src={product.image}
          alt={product.title}
          fill
          sizes="(min-width: 640px) 20rem, 85vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {/* Цена — чип поверх фото, как теги портфолио: без dark:-вариантов,
            по DESIGN.md чипы на фото читаются одинаково в обеих темах. */}
        <span className="absolute right-3 top-3 rounded-full bg-[#fbfbff]/90 px-3 py-1 text-xs font-semibold text-zinc-950 backdrop-blur-sm">
          {product.price}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3
          className={`${displayFont.className} text-base leading-tight text-zinc-950 transition-colors group-hover:text-orange-600 dark:text-zinc-50 dark:group-hover:text-orange-400`}
        >
          {product.title}
        </h3>

        <p className="mt-1 flex items-center gap-1 text-xs font-medium text-zinc-500 dark:text-zinc-400">
          by{" "}
          <span className="inline-flex items-center gap-1 text-orange-600 dark:text-orange-400">
            {creator.name}
            <SealCheck size={12} weight="fill" aria-hidden />
          </span>
        </p>

        <p className="mt-2 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
          {product.summary}
        </p>

        {/* Низ карточки: рейтинг слева, покупки справа. mt-auto прижимает
            к низу, чтобы у карточек разной высоты описания эта строка
            выравнивалась по одной линии. */}
        <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Star
                  key={i}
                  size={13}
                  weight={i < filledStars ? "fill" : "regular"}
                  aria-hidden
                  className={
                    i < filledStars
                      ? "text-orange-400"
                      : "text-zinc-300 dark:text-zinc-600"
                  }
                />
              ))}
            </div>
            <span className="text-zinc-500 dark:text-zinc-400">
              {ratingCount
                ? `${ratingCount} rating${ratingCount === 1 ? "" : "s"}`
                : "Not yet rated"}
            </span>
          </div>

          {typeof salesCount === "number" && (
            <span className="shrink-0 text-zinc-500 dark:text-zinc-400">
              {salesCount} {salesCount === 1 ? "purchase" : "purchases"}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
