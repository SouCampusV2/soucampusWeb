import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Unbounded } from "next/font/google";
import { SealCheck, Star } from "@phosphor-icons/react/dist/ssr";
import { getAllProductsWithStats } from "@/lib/products";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/Button";
import { DISCORD_INVITE } from "@/lib/site";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

// Публичный профиль продавца. Пока продавец один — SouCampus (бренд), его
// «ресурсы» = все товары магазина. Маршрут уже параметризован под будущих
// креаторов (docs/SHOP.md): когда появятся creator_id у товаров и
// публичное чтение профилей, здесь будет любой @username со своими картами.
const CREATORS: Record<
  string,
  { name: string; avatar: string; bio: string }
> = {
  soucampus: {
    name: "SouCampus",
    avatar: "/logoSouCampus.png",
    bio: "Custom Minecraft maps, structures and worlds — built on commission and sold ready-made. Spawns, RPG maps, cities, cathedrals and more.",
  },
};

export function generateStaticParams() {
  return Object.keys(CREATORS).map((username) => ({ username }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const creator = CREATORS[username];
  if (!creator) return { title: "Creator not found" };
  return {
    title: `${creator.name} — creator`,
    description: creator.bio,
    alternates: { canonical: `/creator/${username}` },
  };
}

export default async function CreatorPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const creator = CREATORS[username];
  if (!creator) notFound();

  // «Ресурсы» продавца. Пока один продавец — берём весь каталог; когда
  // появится creator_id, отфильтруем по нему.
  const products = await getAllProductsWithStats();

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

  return (
    <main className="w-full mx-auto max-w-[120rem] flex-1 overflow-x-clip px-6 py-16 sm:px-10 sm:py-24 lg:px-16 xl:px-24 2xl:px-[120px]">
      {/* Шапка профиля продавца */}
      <section className="relative">
        <div
          aria-hidden
          className="absolute inset-x-0 -top-24 -z-10 mx-auto h-[24rem] w-full max-w-[90rem] bg-[radial-gradient(circle_at_50%_0%,rgba(251,146,60,0.28),transparent_70%)]"
        />
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-center sm:gap-8 sm:text-left">
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full border border-zinc-200 bg-[#fbfbff] dark:border-zinc-800 dark:bg-zinc-900">
            <Image
              src={creator.avatar}
              alt={creator.name}
              fill
              sizes="112px"
              className="object-contain p-2"
            />
          </div>

          <div className="min-w-0">
            <h1
              className={`${displayFont.className} flex items-center justify-center gap-2 text-4xl tracking-tight text-zinc-950 dark:text-zinc-50 sm:justify-start sm:text-5xl`}
            >
              {creator.name}
              <SealCheck
                size={28}
                weight="fill"
                className="text-orange-500 dark:text-orange-400"
                aria-label="Verified creator"
              />
            </h1>
            <p className="mt-3 max-w-2xl text-zinc-600 dark:text-zinc-400">
              {creator.bio}
            </p>

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

            <div className="mt-6 flex justify-center sm:justify-start">
              <Button href={DISCORD_INVITE} target="_blank" rel="noopener noreferrer" size="md">
                Order a custom build
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Карты продавца */}
      <section className="mt-14">
        <h2
          className={`${displayFont.className} text-2xl tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-3xl`}
        >
          Maps by {creator.name}
        </h2>
        {products.length === 0 ? (
          <p className="mt-6 text-zinc-600 dark:text-zinc-400">
            No maps published yet.
          </p>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <ProductCard
                key={product.slug}
                product={product}
                creator={{ name: creator.name, href: `/creator/${username}` }}
                className="h-full"
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="text-zinc-500 dark:text-zinc-400">
      <span className="font-semibold text-zinc-950 dark:text-zinc-50">{value}</span>{" "}
      {label}
    </span>
  );
}
