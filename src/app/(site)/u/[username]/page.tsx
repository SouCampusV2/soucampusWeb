import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Unbounded } from "next/font/google";
import {
  CalendarBlank,
  ChatCircle,
  Heart,
  Package,
  SealCheck,
  ShoppingBag,
  Star,
  UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import { getAllProductsWithStats } from "@/lib/products";
import {
  getAllCreators,
  getCreatorByHandle,
  creatorHref,
  creatorRole,
} from "@/lib/creators";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/Button";
import { PageGlow } from "@/components/PageGlow";
import { CreatorOwnerActions, OwnerEditLink } from "@/components/CreatorOwnerActions";
import { LocalTime } from "@/components/LocalTime";
import { getRecentCommentsByUser } from "@/lib/comments";
import { getProfileStats } from "@/lib/profile-stats";
import { DISCORD_INVITE } from "@/lib/site";
import { ProfileLinks } from "@/components/ProfileLinks";
import { ProfileTabs, type ProfileTab } from "@/components/ProfileTabs";
import { BANNER_HEIGHT } from "@/lib/profile-media";
import { getReviewsForProducts } from "@/lib/map-reviews";
import { MapReviewList } from "@/components/MapReviewList";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

// Публичный профиль пользователя. Профиль есть у КАЖДОГО зарегистрованного
// (решение владельца 2026-07-27) — просто у кого-то с картами, у кого-то
// без. Данные приезжают из представления public_profiles (безопасный
// поднабор колонок, см. lib/creators.ts), карты фильтруются по
// products.creator_id.
//
// Хэндл в адресе — имя в нижнем регистре (/@soucampus). Имена
// уникальны регистронезависимо, так что отображение однозначно.

// Заранее собираем страницы тех, у кого есть карты: их открывают чаще
// всего, и они же попадают в поиск. Профили без карт не пререндерим —
// dynamicParams (умолчание) отрендерит такую страницу по первому заходу и
// закэширует. Пока миграция не прогнана, список пуст — это не ошибка
// сборки, страницы просто отрендерятся по запросу.
export async function generateStaticParams() {
  const [creators, products] = await Promise.all([
    getAllCreators(),
    getAllProductsWithStats(),
  ]);
  const withProducts = new Set(products.map((p) => p.creatorId));
  return creators
    .filter((c) => withProducts.has(c.id))
    .map((c) => ({ username: c.handle }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const creator = await getCreatorByHandle(decodeURIComponent(username));
  if (!creator) return { title: "Creator not found" };

  const description =
    creator.bio ?? `${creator.username} on SouCampus builds.`;
  return {
    title: `${creator.username} — creator`,
    description,
    alternates: { canonical: creatorHref(creator.handle) },
  };
}

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const creator = await getCreatorByHandle(decodeURIComponent(username));
  if (!creator) notFound();

  // «Ресурсы» пользователя — только его карты.
  const all = await getAllProductsWithStats();
  const products = all.filter((p) => p.creatorId === creator.id);

  const mapsCount = products.length;
  const totalSales = products.reduce((sum, p) => sum + (p.salesCount ?? 0), 0);
  // Средний балл — по товарам, у которых есть оценки (взвешенно по числу).
  const rated = products.filter((p) => (p.ratingCount ?? 0) > 0);
  const ratingTotal = rated.reduce(
    (sum, p) => sum + (p.rating ?? 0) * (p.ratingCount ?? 0),
    0,
  );
  const ratingVotes = rated.reduce((sum, p) => sum + (p.ratingCount ?? 0), 0);
  const avgRating = ratingVotes > 0 ? ratingTotal / ratingVotes : 0;

  const role = creatorRole(creator);

  // Что под шапкой (просьба владельца 25.10, по образцу BuiltByBit):
  // у креатора — его ресурсы, у остальных — активность. Решает роль, а не
  // наличие карт: креатор без карт всё равно креатор, и его раздел
  // «Resources» — место, где карты появятся.
  const showResources = creator.isCreator;
  const stats = await getProfileStats(creator.id);

  // Отзывы на карты автора — вкладка Reviews (26.10). Читаются публичным
  // представлением, без служебного ключа: страница собирается заранее.
  const reviews = showResources
    ? await getReviewsForProducts(products.map((p) => p.id))
    : [];
  const productTitles = new Map(
    products.map((p) => [p.id, { title: p.title, slug: p.slug }])
  );

  // Активность — последние комментарии, только под картами, которые ещё
  // на витрине: ссылка на снятую карту увела бы в 404.
  const productsById = new Map(all.map((p) => [p.id, p]));
  const activity = showResources
    ? []
    : (await getRecentCommentsByUser(creator.id)).flatMap((comment) => {
        const product = productsById.get(comment.productId);
        return product ? [{ comment, product }] : [];
      });

  // Что посмотреть, если показать у человека нечего. Раньше на этом месте
  // печаталось «No maps published yet» — страница честно сообщала, что
  // показать нечего, и на том заканчивалась. С заморозкой креаторства
  // это профиль КАЖДОГО, кроме владельца, то есть тупик по умолчанию.
  //
  // Берём из уже загруженного каталога: второго запроса не нужно, all
  // прочитан выше ради карт самого профиля.
  const isEmpty = showResources ? products.length === 0 : activity.length === 0;
  const recommended = isEmpty
    ? all
        .filter((p) => p.creatorId !== creator.id)
        .sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0))
        .slice(0, 4)
    : [];

  // Цифры — чипами под именем, сразу на виду (вариант 9 лаборатории,
  // смешан с 8-м по просьбе владельца 26.10: вкладка About прятала
  // статистику за кликом). Чипы — только тех чисел, что говорят о роли:
  // у креатора карты, продажи, рейтинг; у остальных покупки, комментарии,
  // реакции. Шесть одинаковых цифр подряд владелец забраковал 25.10.
  const chips: { icon: Icon; value: string; label: string }[] = showResources
    ? [
        { icon: Package, value: String(mapsCount), label: plural(mapsCount, "map", "maps") },
        { icon: ShoppingBag, value: String(totalSales), label: plural(totalSales, "sale", "sales") },
        ...(ratingVotes > 0
          ? [
              {
                icon: Star,
                value: avgRating.toFixed(1),
                label: `rating · ${ratingVotes} ${plural(ratingVotes, "vote", "votes")}`,
              },
            ]
          : []),
      ]
    : [
        { icon: ShoppingBag, value: statValue(stats.purchases), label: plural(stats.purchases, "purchase", "purchases") },
        { icon: ChatCircle, value: statValue(stats.comments), label: plural(stats.comments, "comment", "comments") },
        { icon: Heart, value: statValue(stats.reactions), label: plural(stats.reactions, "reaction", "reactions") },
      ];

  // Вкладки под шапкой — вариант 8: раздел со счётчиком («Maps 2»).
  const tabs: ProfileTab[] = showResources
    ? [
        {
          id: "maps",
          label: "Maps",
          count: mapsCount,
          content:
            products.length > 0 ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <ProductCard
                    key={product.slug}
                    product={product}
                    creator={{
                      name: creator.username,
                      href: creatorHref(creator.handle),
                      isVerified: creator.isVerified,
                    }}
                    className="h-full"
                  />
                ))}
              </div>
            ) : (
              <p className="text-zinc-600 dark:text-zinc-400">No maps published yet.</p>
            ),
        },
        {
          // С 26.10 у оценки обязателен текст — вкладка снова «Reviews»:
          // кто, сколько звёзд и за какую карту. Счётчик — отзывы с
          // текстом; старые оценки без слов входят в средний балл (чип
          // рейтинга в шапке), но карточки у них нет.
          id: "reviews",
          label: "Reviews",
          count: reviews.length,
          content:
            reviews.length > 0 ? (
              <div className="max-w-3xl">
                <MapReviewList reviews={reviews} productTitles={productTitles} />
              </div>
            ) : (
              <p className="text-zinc-600 dark:text-zinc-400">No reviews yet.</p>
            ),
        },
      ]
    : [
        {
          id: "activity",
          label: "Activity",
          count: activity.length,
          content:
            activity.length > 0 ? (
              <ul className="grid gap-3 lg:grid-cols-2">
                {activity.map(({ comment, product }) => (
                  <li key={comment.id}>
                    <Link
                      href={`/marketplace/${product.slug}`}
                      className="flex gap-4 rounded-3xl border border-zinc-200 bg-[#fbfbff] p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                    >
                      <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900">
                        <Image src={product.image} alt="" fill sizes="96px" className="object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-500 dark:text-zinc-400">
                          Commented on{" "}
                          <span className="font-medium text-zinc-950 dark:text-zinc-50">
                            {product.title}
                          </span>{" "}
                          · <LocalTime value={comment.createdAt} />
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-zinc-700 dark:text-zinc-300">
                          {comment.body}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-zinc-600 dark:text-zinc-400">No activity yet.</p>
            ),
        },
      ];

  return (
    // Клип — на полноширинном <main>, max-w — на обёртке внутри (см. PageGlow).
    <main className="relative w-full flex-1 overflow-x-clip">
      <PageGlow color="rgba(251,146,60,0.28)" />

      {/* С баннером — без верхнего отступа: баннер начинается от самого
          верха страницы (см. ниже). */}
      <div
        className={`mx-auto max-w-[120rem] px-6 sm:px-10 lg:px-16 xl:px-24 2xl:px-[120px] ${
          creator.bannerUrl ? "pb-16 sm:pb-24" : "py-16 sm:py-24"
        }`}
      >
      {/* Шапка — вариант 8 лаборатории (выбор владельца 26.10): тихая
          строка «аватар · имя · роль, дата, рейтинг · ссылки и кнопка»,
          цифры — во вкладках ниже. */}
      <section className="relative">
        {/* Баннер необязателен: нет — шапка просто начинается с аватара,
            без пустой серой полосы.

            На всю ширину контейнера, а не текста (просьба владельца
            26.10): отрицательные поля ровно гасят боковые отступы обёртки
            выше — меняешь px там, меняй -mx здесь. Ниже 120rem контейнер
            и есть экран, поэтому баннер идёт от края до края без
            скругления; шире — контейнер кончается раньше экрана, и нижние
            углы скругляются.

            Высота ФИКСИРОВАННАЯ (BANNER_HEIGHT), а не пропорция: шире не
            значит выше. Кадр режется в рамке BANNER_ASPECT
            (profile-media.ts), и на узком экране у него срезаются бока,
            на широком — чуть верх и низ.

            Вплотную к верху страницы (просьба владельца 25.10). Навбар —
            sticky В ПОТОКЕ и занимает 4.5rem (от sm — 5rem, h-[4.5rem]
            sm:h-20 в Navbar.tsx), поэтому баннер поднимается ровно на
            столько же и встаёт под стеклянную пилюлю. Поменяется высота
            навбара — поменять и здесь, иначе вернётся щель или баннер
            уедет под край. */}
        {creator.bannerUrl && (
          <div
            className={`-mx-6 -mt-[4.5rem] overflow-hidden bg-zinc-100 dark:bg-zinc-900 sm:-mx-10 sm:-mt-20 lg:-mx-16 xl:-mx-24 2xl:-mx-[120px] min-[120rem]:rounded-b-3xl ${BANNER_HEIGHT}`}
          >
            {/* Обычный <img> — по той же причине, что у аватара ниже. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={creator.bannerUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        )}

        {/* sm:items-end: имя и кнопки встают по нижнему краю аватара,
            а его верх заходит на баннер. */}
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-end sm:gap-6">
          {/* Квадрат со скруглением, а не круг (2026-10-25): крупный
              аватар в круге теряет углы картинки, а лого и скины —
              квадратные по природе.

              С баннером аватар врезается в него на половину своей высоты
              (просьба владельца 26.10, как в превью). Обводка цветом
              страницы (--background) отделяет его от картинки под ним и
              сама меняется с темой. */}
          <div
            className={`relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-3xl border-4 border-[var(--background)] bg-zinc-100 dark:bg-zinc-900 sm:h-36 sm:w-36 ${
              creator.bannerUrl ? "-mt-14 sm:-mt-[4.5rem]" : ""
            }`}
          >
            {creator.avatarUrl ? (
              // Обычный <img>, а не next/image: аватары лежат в Supabase
              // Storage, а его домен не прописан в images.remotePatterns
              // (next.config.ts) — next/image на таком URL падает в
              // рантайме. Тот же приём уже используется в навбаре; менять
              // решение — значит настраивать домены, отдельная задача.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={creator.avatarUrl}
                alt={creator.username}
                // Аватар-фото кадрируем (object-cover), а лого из public/
                // показываем целиком с полями: у знака есть собственные
                // границы, и обрезать его нельзя. Отличаем по виду ссылки
                // — локальный путь начинается со слэша, загруженные
                // пользователем аватары приходят полным адресом Storage.
                className={
                  creator.avatarUrl.startsWith("/")
                    ? "h-full w-full object-contain p-3"
                    : "h-full w-full object-cover"
                }
              />
            ) : (
              // Аватар не обязателен — у большинства его нет. Нейтральная
              // иконка вместо чужого лого: подставлять сюда бренд было бы
              // прямой ложью о том, чей это профиль.
              <UserCircle
                size={80}
                weight="thin"
                className="text-zinc-300 dark:text-zinc-700"
                aria-hidden
              />
            )}
          </div>

          <div className="min-w-0 flex-1 sm:pb-1">
            {/* Карандаш — СОСЕД заголовка, а не его часть: внутри <h1> он
                стал бы куском имени для скринридера и поисковика. */}
            <div className="flex items-center gap-2">
              <h1
                className={`${displayFont.className} flex min-w-0 items-center gap-2 text-4xl tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
              >
                {/* Цвет ника — привилегия купивших (миграция 20260820130000).
                    style, а не класс: цвет свободный, и в Tailwind его не
                    выразить. Форма значения проверена дважды — ограничением
                    в базе и isHexColor на выходе, — потому что отсюда оно
                    попадает прямо в разметку. */}
                <span
                  className="truncate"
                  style={creator.nameColor ? { color: creator.nameColor } : undefined}
                >
                  {creator.username}
                </span>
                {/* Галочка — только у подтверждённых (is_verified в БД). */}
                {creator.isVerified && (
                  <SealCheck
                    size={28}
                    weight="fill"
                    className="shrink-0 text-orange-500 dark:text-orange-400"
                    aria-label="Verified creator"
                  />
                )}
              </h1>
              <OwnerEditLink creatorId={creator.id} />
            </div>

            {/* Кто это и чем отметился — одним рядом фактов (вариант 9):
                роль, чипы с цифрами той же формы, что бейдж роли, и дата.
                Галочка (is_verified) отвечает на другой вопрос — «это точно
                он», — и роль ею не заменяется. Дата — момент, а не
                день-ключ, поэтому LocalTime (разбор в lib/dates.ts). */}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${role.className}`}>
                {role.label}
              </span>
              {chips.map((chip) => (
                <span
                  key={chip.label}
                  className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 px-3 py-1 text-sm text-zinc-600 dark:border-zinc-800 dark:text-zinc-400"
                >
                  <chip.icon
                    size={15}
                    weight={chip.icon === Star ? "fill" : "bold"}
                    className={chip.icon === Star ? "text-orange-400" : "text-zinc-400"}
                    aria-hidden
                  />
                  <b className="font-semibold text-zinc-950 dark:text-zinc-50">{chip.value}</b>
                  {chip.label}
                </span>
              ))}
              {creator.joinedAt && (
                <span className="inline-flex items-center gap-1.5 px-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <CalendarBlank size={15} aria-hidden />
                  Joined <LocalTime value={creator.joinedAt} />
                </span>
              )}
            </div>
          </div>

          {/* Справа — ссылки иконками и главное действие. Приём заказов —
              только у подтверждённого профиля (решение владельца: пока
              кастомные карты берёт только бренд), тот же флаг, что у
              галочки. */}
          <div className="flex flex-wrap items-center gap-3 sm:pb-1">
            <ProfileLinks links={creator.links} />
            {creator.isVerified && (
              <Button href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" size="md">
                Order a custom build
              </Button>
            )}
          </div>
        </div>

        {creator.bio && (
          <p className="mt-6 max-w-2xl whitespace-pre-line text-zinc-600 dark:text-zinc-400">
            {creator.bio}
          </p>
        )}

        {/* «Add a map» — только самому автору. У постороннего не
            рендерится вовсе (см. компонент). */}
        <CreatorOwnerActions creatorId={creator.id} />
      </section>

      <ProfileTabs tabs={tabs} />

      {/* Рекомендации — вместо пустоты у того, у кого нечего показать.
          Только когда своего раздела нет: у автора с картами рекламировать
          чужие посреди его витрины — недружественно к нему. Порядок — по
          числу покупок: «что берут» честнее любой выдуманной
          персонализации. */}
      {recommended.length > 0 && (
        <section className="mt-14">
          <SectionTitle>Popular right now</SectionTitle>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Maps other players are picking up.
          </p>
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {recommended.map((product) => (
              <ProductCard key={product.slug} product={product} className="h-full" />
            ))}
          </div>
        </section>
      )}
      </div>
    </main>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className={`${displayFont.className} text-2xl tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl`}
    >
      {children}
    </h2>
  );
}

/** null — «не узнали»: прочерк честнее нуля. */
function statValue(value: number | null): string {
  return value === null ? "—" : String(value);
}

/** «1 map» / «2 maps»; у неизвестного числа (null) — множественное. */
function plural(value: number | null, one: string, many: string): string {
  return value === 1 ? one : many;
}
