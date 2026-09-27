import { cache } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { sanitizeDescription } from "@/lib/sanitize";
import {
  getAllProducts,
  getAllProductsWithStats,
  getProduct,
  getProductStats,
} from "@/lib/products";
import { pickSimilar } from "@/lib/similar";
import { getCreatorsById } from "@/lib/creators";
import { getViewCount, VIEW_PATHS } from "@/lib/views";
import { getReactionCounts, getReactionOptions } from "@/lib/reactions";
import { getComments } from "@/lib/comments";
import { CommentSection } from "@/components/CommentSection";
import { ReactionButton } from "@/components/ReactionButton";
import { AddToCartButton } from "@/components/AddToCartButton";
import { ProductGallery } from "@/components/ProductGallery";
import { RICH_TEXT_CLASS } from "@/lib/rich-text";
import { ArrowCircle } from "@/components/ArrowCircle";
import { INLINE_LINK } from "@/components/Button";
import { StarRating } from "@/components/StarRating";
import { ProductSpecs } from "@/components/ProductSpecs";
import { CreatorCard } from "@/components/CreatorCard";
import { SimilarMaps } from "@/components/SimilarMaps";

// Одна карта — один поход в базу за рендер.
//
// Next вызывает generateMetadata и сам компонент страницы отдельно, и оба
// просят одну и ту же карту по одному и тому же slug. Без обёртки это два
// последовательных запроса к Supabase ради одинакового ответа: на сборке
// они умножаются на число карт в каталоге, а при рендере по требованию
// человек ждёт оба.
//
// cache() дедуплицирует в пределах ОДНОГО рендера: второй вызов с тем же
// аргументом получает результат первого, между разными запросами ничего
// не хранится. Ровно тот же приём и по той же причине уже применён к
// getUser() в lib/current-user.ts.
//
// Обёртка стоит здесь, а не на самом getProduct в lib/products.ts,
// намеренно: тот модуль импортируют семь клиентских компонентов (им нужны
// типы и категории), а cache() — серверный API React, и тащить его в
// клиентский бандл незачем.
//
// Разбор и что делать с каталогом дальше — docs/ARCHITECTURE.md § 7.1.
const getProductOnce = cache(getProduct);

// Страницы товаров собираются заранее, как и работы портфолио.
//
// ⚠️ Отдаём ВЕСЬ каталог: на десяти картах это незаметно, на тысяче станет
// заметно, на десяти тысячах — дорого. Варианты (отдавать только ходовые,
// перевести на revalidatePath) с замерами — docs/ARCHITECTURE.md § 7.1.
// Сознательно не трогаем, пока карт десяток.
export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductOnce(slug);
  if (!product) return { title: "Not found" };

  const description = `${product.summary} ${product.price} — instant download.`;

  // og:image — фото самого товара, как у страниц работ: ссылка в Discord
  // показывает реальный билд, а не брендовую заглушку.
  return {
    title: product.title,
    description,
    alternates: { canonical: `/marketplace/${product.slug}` },
    openGraph: {
      type: "article",
      title: product.title,
      description,
      url: `/marketplace/${product.slug}`,
      images: [{ url: product.image, alt: product.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description,
      images: [product.image],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductOnce(slug);
  if (!product) notFound();

  // Агрегаты для этого товара (оценки/покупки). Устойчиво: если статистика
  // недоступна — нули, страница не падает.
  const stats = (await getProductStats()).get(product.id);

  // Автор. getProduct отдаёт только creatorId — связать products с
  // profiles вложенной выборкой PostgREST нельзя (внешний ключ ведёт на
  // закрытую RLS таблицу, см. lib/creators.ts), поэтому профиль
  // приезжает отдельным запросом. На витрине это же делает
  // getAllProductsWithStats; здесь карта одна, и тянуть ради неё
  // весь каталог незачем.
  const creator = product.creatorId
    ? (await getCreatorsById()).get(product.creatorId)
    : undefined;

  // Просмотры. Считаются с самого появления витрины — трекер в layout
  // группы (site) шлёт сюда сигнал, а /marketplace/<slug> и так стоит в
  // белом списке (view-paths.ts). Не хватало только показа, поэтому
  // число сразу непустое, а не начинается с нуля.
  //
  // Один посетитель — единица, сколько бы раз ни открыл: строка в
  // page_views уникальна по тройке (страница, посетитель, день).
  const views = await getViewCount(VIEW_PATHS.product(slug));

  // Реакция карты. Автор выбирает ОДНУ при публикации, посетители жмут
  // по ней как по лайку. Число здесь — то, что было верным на момент
  // сборки страницы; свежее подтянет сама кнопка после загрузки (см.
  // ReactionButton). Отдавать в статике заведомо устаревающее число
  // всё равно правильнее, чем пустое место, которое потом дёрнется.
  const reaction = product.reactionOptionId
    ? (await getReactionOptions()).find((o) => o.id === product.reactionOptionId)
    : undefined;
  const reactionCount = reaction
    ? ((await getReactionCounts([product.id])).get(product.id) ?? 0)
    : 0;

  // Похожие карты. Считаем поверх всего каталога витрины — на СБОРКЕ, а
  // не на каждого посетителя: страница статическая, и цена платится один
  // раз. Формула и её тесты — в lib/similar.ts.
  //
  // getAllProductsWithStats, а не getAllProducts: карточка показывает
  // оценку, число покупок и автора, и без них она выглядит беднее любой
  // такой же карточки на витрине.
  //
  // ⚠️ Когда карт станет заметно больше сотни, «прочитать весь каталог
  // ради четырёх карточек» перестанет быть бесплатным даже на сборке —
  // тогда подбор переезжает в SQL. Порог тот же, что у остального
  // каталога: docs/ARCHITECTURE.md § 7.1.
  const similar = pickSimilar(product, await getAllProductsWithStats());

  // Первый экран ленты — с сервера: он верен на момент сборки страницы.
  // Дальше её перечитывает сам компонент (см. CommentSection).
  const comments = await getComments(product.id);
  const rating = stats?.rating ?? 0;
  const ratingCount = stats?.ratingCount ?? 0;
  const salesCount = stats?.salesCount ?? 0;

  return (
    // Сверху отступ меньше, чем снизу (27.09, замечание владельца):
    // py-28 давал 112px пустоты между навбаром и названием — страница
    // начиналась «где-то ниже». Низ оставлен прежним, там футер.
    <main className="w-full mx-auto max-w-[120rem] flex-1 px-6 pb-16 pt-8 sm:px-10 sm:pb-28 sm:pt-12 lg:px-16 xl:px-24 2xl:px-[120px]">
      {/* Стрелка «назад» — слева от названия, а не отдельной строкой
          «All products» над ним (27.09, просьба владельца): строка съедала
          ещё полсотни пикселей сверху. Название, короткое описание и
          оценка стоят столбиком справа от стрелки.
          Подпись словами ушла, поэтому aria-label обязателен — иначе
          экранный читатель скажет просто «ссылка».
          ⚠️ Кружок — ArrowCircle в том же виде, что ArrowButton у рядов
          витрины (h-11, orange primary, active:scale-90). 27.09 здесь сперва
          стоял самодельный кружок с рамкой и сдвигом иконки — отвергнут
          владельцем: круглая стрелка на сайте одна, hover у неё — цвет. */}
      <div className="flex items-start gap-3 sm:gap-4">
        <Link
          href="/marketplace"
          aria-label="All products"
          title="All products"
          className="shrink-0 transition-transform active:scale-90 sm:mt-0.5"
        >
          <ArrowCircle
            direction="left"
            className="h-11 w-11"
            colorClassName="bg-orange-500 hover:bg-orange-600 dark:bg-orange-400 dark:hover:bg-orange-500 text-white"
          />
        </Link>

        <div className="min-w-0">
          <h1 className="text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
            {product.title}
          </h1>
          {/* Строчки «by <автор>» здесь больше нет (решение владельца
              2026-08-22) — автор переехал в правую колонку, в CreatorCard.
              Довод: чьё это — довод в пользу покупки, а доводы стоят рядом с
              ценой и кнопкой, а не теряются между названием и описанием. */}
          <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">{product.summary}</p>

          {/* Только оценка. Число покупок отсюда убрано (решение владельца
              2026-08-22): оно никуда не делось — плитка Purchases стоит в
              панели характеристик справа, — а под заголовком две цифры через
              точку читались как одна мысль, разорванная надвое. */}
          <div className="mt-4 flex items-center gap-1.5 text-sm">
            <StarRating rating={rating} size={16} />
            <span className="text-zinc-500 dark:text-zinc-400">
              {ratingCount
                ? `${rating.toFixed(1)} (${ratingCount} rating${ratingCount === 1 ? "" : "s"})`
                : "Not yet rated"}
            </span>
          </div>
        </div>
      </div>

      {/* Двухколоночная разметка в духе торговых площадок (BuiltByBit и
          подобные): фото + описание — основной контент слева, цена и
          покупка — небольшая липкая карточка справа, всегда на виду,
          пока листаешь длинное описание. На мобильном — просто друг под
          другом (карточка покупки выше, description ниже), сайдбар не
          нужен на узком экране, где и так всё в одну колонку. */}
      {/* ⚠️ ПРАВАЯ КОЛОНКА ФИКСИРОВАННОЙ ШИРИНЫ, а не доля от экрана
          (изменено 2026-08-22 по просьбе владельца: «левую шире, правую
          короче»).

          Было `lg:grid-cols-3` + `col-span-2`, то есть две трети против
          трети. Доля растёт вместе с экраном: на 1920 треть — это 560px
          под карточку с ценой и пятью плитками, ей столько не нужно, а
          галерея слева при этом теряет ровно столько же.

          21rem держит сайдбар постоянным на любой ширине, и всё, что
          добавляет монитор, уходит картинкам. Тот же приём уже
          используется в корзине (`lg:grid-cols-[1fr_20rem]`).

          minmax(0,1fr) вместо 1fr — иначе длинное слово в описании или
          широкая таблица распирают колонку шире ячейки: у грид-элемента
          min-width по умолчанию auto, и он не даёт ей сжаться. */}
      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0">
          {/* Обложка + скриншоты работы одной галереей: большой кадр и
              лента миниатюр под ним (см. ProductGallery). */}
          <ProductGallery
            images={product.images?.length ? product.images : [product.image]}
            title={product.title}
          />

          {/* Подзаголовок секции, а не заголовок страницы — стандартный H3
              из DESIGN.md (был придуманный на глаз text-xl). */}
          <h2 className="mt-10 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
            Description
          </h2>
          {/* Описание — HTML из редактора креатора (Tiptap, см.
              UploadMapForm): заголовки, списки, картинки между блоками,
              таблицы версий. Санитизация обязательна и без исключений —
              это контент постороннего пользователя, который увидит
              каждый посетитель. Белый список тегов и разбор правил — в
              sanitize.ts, общий с админкой модерации: модератор обязан
              видеть ровно то, что получит покупатель.
              Стили — общая константа с редактором, чтобы креатор вёрстку
              видел так же, как покупатель. */}
          <div
            className={`mt-4 leading-7 text-zinc-700 dark:text-zinc-300 ${RICH_TEXT_CLASS}`}
            dangerouslySetInnerHTML={{ __html: sanitizeDescription(product.description) }}
          />

          {/* Комментарии — в левой колонке, под описанием: это часть
              разговора о карте, а не действие над ней. Правая колонка
              отдана покупке и характеристикам. */}
          <CommentSection
            productId={product.id}
            initial={comments}
            creatorId={product.creatorId}
          />
        </div>

        {/* top-24: чуть ниже навбара (sticky top-4 + его высота), не
            вплотную к нему при скролле. */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800">
            <p className="text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
              {product.price}
            </p>

            <div className="mt-6">
              <AddToCartButton
                productId={product.id}
                product={{
                  slug: product.slug,
                  title: product.title,
                  price: product.price,
                  priceCents: product.priceCents,
                  image: product.image,
                }}
              />
            </div>

            {/* Реакция — сразу под кнопкой покупки, там же, где решают.
                Карта без выбранной реакции не показывает ничего: пустая
                кнопка «0» ни о чём не говорит и только занимает место. */}
            {reaction && (
              <div className="mt-4">
                <ReactionButton
                  productId={product.id}
                  emoji={reaction.emoji}
                  imageUrl={reaction.imageUrl}
                  label={reaction.label}
                  initialCount={reactionCount}
                />
              </div>
            )}

            <dl className="mt-6 space-y-3 border-t border-zinc-200 pt-6 text-sm dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500 dark:text-zinc-400">Delivery</dt>
                <dd className="font-medium text-zinc-950 dark:text-zinc-50">
                  Instant download
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-zinc-500 dark:text-zinc-400">Need help?</dt>
                <dd>
                  <Link
                    href="/support"
                    className={`font-medium ${INLINE_LINK}`}
                  >
                    Support
                  </Link>
                </dd>
              </div>
            </dl>
          </div>

          {/* Характеристики — ПОД карточкой покупки, а не над ней.
              Порядок отвечает на вопросы в том порядке, в каком их
              задают: сначала «сколько и как купить», потом «а подойдёт
              ли мне». Блок сам решает, что показывать: пустые поля не
              рисуются вовсе (см. ProductSpecs). */}
          <ProductSpecs
            specs={product.specs}
            updatedAt={product.updatedAt}
            salesCount={salesCount}
            views={views}
          />

          {/* Автор — ПОСЛЕДНИМ в колонке. Порядок отвечает на вопросы в
              том порядке, в каком их задают: сколько стоит → подойдёт ли
              мне → а кто это сделал. Разбор — в шапке CreatorCard. */}
          {creator && <CreatorCard creator={creator} />}
        </aside>
      </div>

      {/* ПОД обеими колонками, во всю ширину: «похожие» — это переход к
          другой карте, то есть следующий шаг, а не часть разговора об
          этой. Внутри колонки они читались бы как её продолжение.

          Блока может не быть вовсе — когда похожих не нашлось. Это
          ответ, а не сбой (см. SimilarMaps). */}
      <SimilarMaps products={similar} />
    </main>
  );
}
