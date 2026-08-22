import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
import { CreatorOwnerActions } from "@/components/CreatorOwnerActions";
import { DISCORD_INVITE } from "@/lib/site";

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

  // Что посмотреть, если карт у человека нет. Раньше на этом месте
  // печаталось «No maps published yet» — страница честно сообщала, что
  // показать нечего, и на том заканчивалась. С заморозкой креаторства
  // это профиль КАЖДОГО, кроме владельца, то есть тупик по умолчанию.
  //
  // Берём из уже загруженного каталога: второго запроса не нужно, all
  // прочитан выше ради карт самого профиля.
  const recommended =
    products.length === 0
      ? all
          .filter((p) => p.creatorId !== creator.id)
          .sort((a, b) => (b.salesCount ?? 0) - (a.salesCount ?? 0))
          .slice(0, 4)
      : [];

  return (
    // Клип — на полноширинном <main>, max-w — на обёртке внутри (см. PageGlow).
    <main className="relative w-full flex-1 overflow-x-clip">
      <PageGlow color="rgba(251,146,60,0.28)" />

      <div className="mx-auto max-w-[120rem] px-6 py-16 sm:px-10 sm:py-24 lg:px-16 xl:px-24 2xl:px-[120px]">
      {/* Шапка профиля продавца */}
      <section className="relative">
        {/* sm:items-start, а НЕ items-center (просьба владельца
            2026-08-22). По центру аватар равнялся на ВЕСЬ блок сразу —
            имя, бейдж, био, цифры и три кнопки, — и потому оказывался
            где-то на уровне описания. Чем длиннее био, тем ниже уезжал
            — то есть положение лица зависело от того, сколько человек
            написал о себе.

            По верху он встаёт рядом с именем и там и остаётся: аватар и
            имя — одно утверждение «кто это», остальное под ним —
            подробности. */}
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-start sm:gap-8 sm:text-left">
          <div className="relative flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-[#fbfbff] dark:border-zinc-800 dark:bg-zinc-900">
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
                // границы, и обрезать его под кружок нельзя. Отличаем по
                // виду ссылки — локальный путь начинается со слэша,
                // загруженные пользователем аватары приходят полным
                // адресом Supabase Storage.
                className={
                  creator.avatarUrl.startsWith("/")
                    ? "h-full w-full object-contain p-2"
                    : "h-full w-full object-cover object-top"
                }
              />
            ) : (
              // Аватар не обязателен — у большинства его нет. Нейтральная
              // иконка вместо чужого лого: подставлять сюда бренд было бы
              // прямой ложью о том, чей это профиль.
              <UserCircle
                size={72}
                weight="thin"
                className="text-zinc-300 dark:text-zinc-700"
                aria-hidden
              />
            )}
          </div>

          <div className="min-w-0">
            <h1
              className={`${displayFont.className} flex items-center justify-center gap-2 text-4xl tracking-tight text-zinc-950 dark:text-zinc-50 sm:justify-start sm:text-5xl`}
            >
              {/* Цвет ника — привилегия купивших (миграция 20260820130000).
                  style, а не класс: цвет свободный, и в Tailwind его не
                  выразить. Форма значения проверена дважды — ограничением
                  в базе и isHexColor на выходе, — потому что отсюда оно
                  попадает прямо в разметку. */}
              <span style={creator.nameColor ? { color: creator.nameColor } : undefined}>
                {creator.username}
              </span>
              {/* Галочка — только у подтверждённых (is_verified в БД). */}
              {creator.isVerified && (
                <SealCheck
                  size={28}
                  weight="fill"
                  className="text-orange-500 dark:text-orange-400"
                  aria-label="Verified creator"
                />
              )}
            </h1>

            {/* Кто это. Раньше профиль креатора и профиль обычного
                участника выглядели одинаково, и различить их можно было
                только по тому, есть ли карты ниже, — а у креатора без
                карт список тоже пуст. Галочка (is_verified) отвечает на
                другой вопрос — «это точно он», — и роль ею не заменяется. */}
            <p className="mt-2 flex justify-center sm:justify-start">
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${role.className}`}>
                {role.label}
              </span>
            </p>

            {creator.bio && (
              <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
                {creator.bio}
              </p>
            )}

            {/* Статы продавца */}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm sm:justify-start">
              <Stat value={String(mapsCount)} label={mapsCount === 1 ? "map" : "maps"} />
              <Stat
                value={String(totalSales)}
                label={totalSales === 1 ? "purchase" : "purchases"}
              />
              {ratingVotes > 0 && (
                <span className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
                  <Star size={16} weight="fill" className="text-orange-400" aria-hidden />
                  <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                    {avgRating.toFixed(1)}
                  </span>
                  ({ratingVotes})
                </span>
              )}
            </div>

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

            {/* Кнопки управления — только для самого владельца страницы.
                У постороннего не рендерятся вовсе (см. компонент). */}
            <CreatorOwnerActions creatorId={creator.id} />
          </div>
        </div>
      </section>

      {/* Карты продавца — секции нет вовсе, пока карт нет.
          Раньше пустой профиль печатал заголовок «Maps by <ник>» и под
          ним «No maps published yet»: три строки, чтобы сообщить, что
          сообщать нечего. У обычного участника — а с заморозкой
          креаторства это все, кроме владельца, — карт не будет никогда,
          и постоянный пустой раздел про них выглядит поломкой профиля.
          Владельцу кнопка добавления и так лежит выше, в шапке
          (CreatorOwnerActions, вариант header). */}
      {products.length > 0 && (
      <section className="mt-14">
        <h2
          className={`${displayFont.className} text-2xl tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl`}
        >
          Maps by {creator.username}
        </h2>
        {(
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
        )}
      </section>
      )}

      {/* Рекомендации — вместо пустоты у того, кто ничего не выкладывает.
          Показываются ТОЛЬКО когда своих карт нет: у автора с картами
          рекламировать чужие посреди его витрины — недружественно к
          нему. Порядок — по числу покупок: «что берут» честнее любой
          выдуманной персонализации, пока о человеке ничего не известно. */}
      {recommended.length > 0 && (
        <section className="mt-14">
          <h2
            className={`${displayFont.className} text-2xl tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl`}
          >
            Popular right now
          </h2>
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

/** Число + подпись в строке под био: «2 maps», «5 purchases». */
function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="text-zinc-500 dark:text-zinc-400">
      <span className="font-semibold text-zinc-950 dark:text-zinc-50">{value}</span>{" "}
      {label}
    </span>
  );
}
