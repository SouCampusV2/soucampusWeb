import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Unbounded } from "next/font/google";
import {
  UserCircle,
  EnvelopeSimple,
  ShoppingBag,
  DownloadSimple,
  PencilSimple,
} from "@phosphor-icons/react/dist/ssr";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getPurchasesForUser, signedDownloadUrl } from "@/lib/orders";
import { readProfile } from "@/lib/profiles";
import { LogoutButton } from "@/components/LogoutButton";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "My profile",
  robots: { index: false },
};

export default async function ProfilePage() {
  // Серверный клиент читает сессию из cookie. Если пользователя нет —
  // это защищённая страница, уводим на вход.
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Профиль из таблицы profiles (источник правды); фоллбэк на метаданные.
  const profile = await readProfile(supabase, user.id);
  const displayName =
    profile?.displayName ??
    (user.user_metadata?.display_name as string | undefined) ??
    "—";
  const fullName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ");

  // Купленные карты + подписанные ссылки на скачивание (для товаров с
  // загруженным файлом). Ссылка живёт час; обновил страницу — новая.
  const purchases = await getPurchasesForUser(user.id, user.email ?? "");
  const downloads = await Promise.all(
    purchases.map(async (p) => ({
      ...p,
      url: p.filePath ? await signedDownloadUrl(p.filePath) : null,
    }))
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-6">
      <section className="relative pb-28 pt-20">
        <div className="absolute -top-32 left-1/2 -z-10 h-[36rem] w-full max-w-[90rem] -translate-x-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(249,115,22,0.28),transparent_70%)]" />

        <div className="mx-auto max-w-md">
          <h1
            className={`${displayFont.className} text-center text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
          >
            My profile
          </h1>

          <div className="mt-10 rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 dark:border-zinc-800 dark:bg-zinc-950">
            {/* Аватар + Edit */}
            <div className="flex items-center justify-between">
              <div className="h-20 w-20 overflow-hidden rounded-full border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900">
                {profile?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.avatarUrl}
                    alt="Avatar"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <UserCircle
                    size={80}
                    weight="thin"
                    className="text-zinc-300 dark:text-zinc-600"
                  />
                )}
              </div>
              <Link
                href="/profile/edit"
                className="inline-flex items-center gap-1.5 rounded-full border-2 border-orange-500 px-4 py-2 text-sm font-semibold text-orange-500 transition-colors hover:border-orange-600 hover:text-orange-600 dark:border-orange-400 dark:text-orange-400 dark:hover:border-orange-500 dark:hover:text-orange-500"
              >
                <PencilSimple size={16} weight="bold" />
                Edit
              </Link>
            </div>

            <div className="mt-6">
              <Row
                icon={<UserCircle size={20} />}
                label="Display name"
                value={displayName}
              />
              {fullName && (
                <Row
                  icon={<UserCircle size={20} />}
                  label="Name"
                  value={fullName}
                />
              )}
              <Row
                icon={<EnvelopeSimple size={20} />}
                label="Email"
                value={user.email ?? "—"}
              />
            </div>

            <div className="mt-8">
              <LogoutButton />
            </div>
          </div>

          {/* My purchases — купленные карты со ссылками на скачивание. */}
          <div className="mt-8">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              <ShoppingBag size={20} />
              My purchases
            </h2>

            {downloads.length === 0 ? (
              <div className="mt-4 rounded-3xl border border-zinc-200 bg-[#fbfbff] p-8 text-center dark:border-zinc-800 dark:bg-zinc-950">
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  You haven&apos;t bought any maps yet.
                </p>
                <Link
                  href="/shop"
                  className="mt-3 inline-block text-sm font-semibold text-orange-500 underline decoration-2 underline-offset-4 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-500"
                >
                  Browse the shop
                </Link>
              </div>
            ) : (
              <ul className="mt-4 space-y-3">
                {downloads.map((item) => (
                  <li
                    key={item.productId}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-[#fbfbff] px-5 py-4 dark:border-zinc-800 dark:bg-zinc-950"
                  >
                    <div className="min-w-0">
                      {item.slug ? (
                        <Link
                          href={`/shop/${item.slug}`}
                          className="truncate font-semibold text-zinc-950 hover:underline dark:text-zinc-50"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        <span className="truncate font-semibold text-zinc-950 dark:text-zinc-50">
                          {item.title}
                        </span>
                      )}
                    </div>

                    {item.url ? (
                      <a
                        href={item.url}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition-colors hover:bg-orange-600 dark:bg-orange-400 dark:hover:bg-orange-500"
                      >
                        <DownloadSimple size={16} weight="bold" />
                        Download
                      </a>
                    ) : (
                      <span className="shrink-0 text-xs text-zinc-400 dark:text-zinc-500">
                        File coming soon
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b border-zinc-200 py-3 last:border-0 dark:border-zinc-800">
      <span className="text-zinc-400 dark:text-zinc-500">{icon}</span>
      <div className="min-w-0">
        <div className="text-xs text-zinc-500 dark:text-zinc-400">{label}</div>
        <div className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">
          {value}
        </div>
      </div>
    </div>
  );
}
