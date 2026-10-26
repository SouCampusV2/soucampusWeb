import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Unbounded } from "next/font/google";
import { SealCheck, Star, UserCircle } from "@phosphor-icons/react/dist/ssr";
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
import { BANNER_HEIGHT } from "@/lib/profile-media";

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
      {/* Шапка профиля — по образцу BuiltByBit (2026-10-25): баннер,
          под ним большой квадратный аватар и рядом «кто это». */}
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
            значит выше. Кадр режется в рамке 5:1 (profile-media.ts), и на
            узком экране у него срезаются бока, на широком — чуть верх и
            низ.

            Вплотную к верху страницы (просьба владельца 25.10). Навбар —
            sticky В ПОТОКЕ и занимает 4.5rem (от sm — 5rem, h-[4.5rem]
            sm:h-20 в Navbar.tsx), поэтому баннер поднимается ровно на
            столько же и встаёт под стеклянную пилюлю. Поменяется высота
            навбара — поменять и здесь, иначе вернётся щель или баннер
            уедет под край. */}
        {creator.bannerUrl && (
          <div
            className={`-mx-6 -mt-[4.5rem] mb-8 overflow-hidden bg-zinc-100 dark:bg-zinc-900 sm:-mx-10 sm:-mt-20 lg:-mx-16 xl:-mx-24 2xl:-mx-[120px] min-[120rem]:rounded-b-3xl ${BANNER_HEIGHT}`}
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

        {/* sm:items-start, а НЕ items-center (просьба владельца
            2026-08-22): по центру аватар равнялся бы на весь блок и
            уезжал вниз вместе с длиной био. По верху он встаёт рядом с
            именем — «кто это» — и там и остаётся. */}
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:gap-8 sm:text-left">
          {/* Квадрат со скруглением, а не круг (2026-10-25): крупный
              аватар в круге теряет углы картинки, а лого и скины —
              квадратные по природе. */}
          <div className="relative flex h-32 w-32 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-zinc-200 bg-[#fbfbff] dark:border-zinc-800 dark:bg-zinc-900 sm:h-40 sm:w-40">
            {creator.avatarUrl ? (
              // Обычный <img>, а не next/image: аватары лежат в Supabase
              // Storage, а его домен не прописан в images.remotePatterns
              // (next.config.ts) — next/image на таком URL падает в
              // рантайме. Тот же приём уже используется на /profile и в
              // навбаре; менять решение — значит настраивать домены,
              // отдельная задача.
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
                    : "h-full w-full object-cover object-top"
                }
              />
            ) : (
              // Аватар не обязателен — у большинства его нет. Нейтральная
              // иконка вместо чужого лого: подставлять сюда бренд было бы
              // прямой ложью о том, чей это профиль.
              <UserCircle
                size={88}
                weight="thin"
                className="text-zinc-300 dark:text-zinc-700"
                aria-hidden
              />
            )}
          </div>

          {/* Текст слева, цифры справа — обе колонки по верху. */}
          <div className="flex min-w-0 flex-1 flex-col gap-6 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="min-w-0">
            {/* Карандаш — СОСЕД заголовка, а не его часть: внутри <h1> он
                стал бы куском имени для скринридера и поисковика. */}
            <div className="flex items-center justify-center gap-2 sm:justify-start">
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

            {/* Кто это. Галочка (is_verified) отвечает на другой вопрос —
                «это точно он», — и роль ею не заменяется. */}
            <p className="mt-3 flex justify-center sm:justify-start">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${role.className}`}>
                {role.label}
              </span>
            </p>

            {/* Момент, а не день-ключ, — поэтому LocalTime (пояс
                читателя), а не formatDate. Разбор в шапке lib/dates.ts. */}
            {creator.joinedAt && (
              <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
                Joined:{" "}
                <LocalTime
                  value={creator.joinedAt}
                  className="font-medium text-zinc-700 dark:text-zinc-300"
                />
              </p>
            )}

            {creator.bio && (
              <p className="mx-auto mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400 sm:mx-0">
                {creator.bio}
              </p>
            )}

            {/* Ссылки — сразу под «о себе»: это продолжение рассказа о
                человеке. Тот же компонент рисует превью на /settings. */}
            <ProfileLinks
              links={creator.links}
              className="mt-4 justify-center sm:justify-start"
            />

            {/* Приём заказов — только у подтверждённого профиля (решение
                владельца: пока кастомные карты берёт только бренд).
                Управляется тем же флагом is_verified, что и галочка. */}
            {creator.isVerified && (
              <div className="mt-6 flex justify-center sm:justify-start">
                <Button href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" size="md">
                  Order a custom build
                </Button>
              </div>
            )}

            {/* «Add a map» — только самому автору. У постороннего не
                рендерится вовсе (см. компонент). */}
            <CreatorOwnerActions creatorId={creator.id} />
            </div>

            {/* Цифры — справа от имени, верхом вровень с ним (просьба
                владельца 25.10; у BuiltByBit они полосой ниже, здесь —
                рядом). У КАЖДОГО, а не только у креатора: покупки,
                комментарии и реакции есть у любого участника. Наружу —
                только числа, без единой строки заказа (profile-stats.ts).
                Уже lg цифры уходят под текст строкой: рядом с именем им
                не хватает места. */}
            <dl className="flex flex-wrap justify-center gap-x-8 gap-y-4 sm:justify-start lg:shrink-0 lg:justify-end lg:pt-2">
              {showResources && <Stat label="Resources" value={String(mapsCount)} />}
              {showResources && <Stat label="Sales" value={String(totalSales)} />}
              <Stat label="Purchases" value={statValue(stats.purchases)} />
              <Stat label="Comments" value={statValue(stats.comments)} />
              <Stat label="Reactions" value={statValue(stats.reactions)} />
              {ratingVotes > 0 && (
                <Stat
                  label="Rating"
                  value={
                    <span className="inline-flex items-center gap-1.5">
                      <Star size={18} weight="fill" className="text-orange-400" aria-hidden />
                      {avgRating.toFixed(1)}
                      <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400">
                        ({ratingVotes})
                      </span>
                    </span>
                  }
                />
              )}
            </dl>
          </div>
        </div>

      </section>

      {/* Под шапкой — ОДИН раздел: ресурсы у креатора, активность у
          остальных. */}
      {showResources ? (
        <section className="mt-14">
          <SectionTitle>Resources</SectionTitle>
          {products.length > 0 ? (
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              No maps published yet.
            </p>
          )}
        </section>
      ) : (
        <section className="mt-14">
          <SectionTitle>Activity</SectionTitle>
          {activity.length > 0 ? (
            <ul className="mt-6 grid gap-3 lg:grid-cols-2">
              {activity.map(({ comment, product }) => (
                <li key={comment.id}>
                  <Link
                    href={`/marketplace/${product.slug}`}
                    className="flex gap-4 rounded-3xl border border-zinc-200 bg-[#fbfbff] p-4 transition-colors hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:border-zinc-700"
                  >
                    <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900">
                      <Image
                        src={product.image}
                        alt=""
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
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
            <p className="mt-3 text-zinc-600 dark:text-zinc-400">
              No activity yet.
            </p>
          )}
        </section>
      )}

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

/** Подпись над числом — «Resources / 11», как у BuiltByBit. */
function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm text-zinc-500 dark:text-zinc-400">{label}</dt>
      <dd className="mt-1 text-xl font-semibold text-zinc-950 dark:text-zinc-50">
        {value}
      </dd>
    </div>
  );
}
