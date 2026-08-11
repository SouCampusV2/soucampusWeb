import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Unbounded } from "next/font/google";
import { PencilSimple, Plus, Eye } from "@phosphor-icons/react/dist/ssr";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getCurrentUser } from "@/lib/current-user";
import { getOwnProducts, type OwnProduct } from "@/lib/moderation";
import { PageGlow } from "@/components/PageGlow";
import { Button, BUTTON_COLORS, BUTTON_PILL } from "@/components/Button";
import { ResourceActions } from "@/components/ResourceActions";
import { RefreshButton } from "@/components/RefreshButton";
import { CreatorStatusCard } from "@/components/CreatorStatusCard";
import { getOwnApplication, isCreator } from "@/lib/creator-applications";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Your resources",
  robots: { index: false },
};

// Личный раздел креатора: его карты в одном списке — опубликованные,
// ждущие разбора и отклонённые. Раньше «Your resources» в меню вело на
// ПУБЛИЧНУЮ страницу /creator/<ник>, где видно только опубликованное и
// нечего редактировать; заявки при этом лежали на /profile. То есть свои
// же карты были размазаны по двум страницам, ни одна из которых не
// управляла ими. Здесь всё вместе и отсюда же правится.
export default async function ResourcesPage() {
  const supabase = await createSupabaseServer();
  const user = await getCurrentUser(supabase);

  if (!user) {
    redirect("/login?next=/resources");
  }

  // Право загружать и состояние заявки — параллельно, они независимы.
  const [products, creator, application] = await Promise.all([
    getOwnProducts(supabase, user.id),
    isCreator(supabase, user.id),
    getOwnApplication(supabase, user.id),
  ]);

  return (
    <main className="relative w-full overflow-x-clip px-6">
      <PageGlow color="rgba(249,115,22,0.28)" />
      <section className="relative pb-28 pt-20">
        <div className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1
              className={`${displayFont.className} text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
            >
              Your resources
            </h1>
            {/* Кнопка «добавить» в шапке — только когда карты уже есть.
                В пустом списке она была бы вторым таким же призывом
                рядом с большим блоком ниже. */}
            <div className="flex items-center gap-2">
              {/* Статус карт меняет модерация, а не владелец страницы:
                  одобрили, сняли, отклонили — узнать об этом можно было
                  только перезагрузкой. */}
              <RefreshButton label="Check the status of your maps" />
              {creator && products.length > 0 && (
                <Button href="/creator/upload" size="sm">
                  Add a map
                </Button>
              )}
            </div>
          </div>

          {/* Три состояния, и порядок проверок важен. Ещё не креатор —
              показываем заявку, а не «добавь первую карту»: кнопка вела
              бы на форму, с которой его развернёт гейт. Дальше обычное
              пустое состояние и, наконец, список. */}
          {!creator ? (
            <CreatorStatusCard userId={user.id} application={application} />
          ) : products.length === 0 ? (
            // Пустое состояние — это не «пусто», а «начни»: крупный
            // призыв с объяснением, что будет дальше.
            <div className="mt-10 rounded-3xl border border-dashed border-zinc-300 bg-[#fbfbff] p-12 text-center dark:border-zinc-700 dark:bg-zinc-950">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-950">
                <Plus size={24} weight="bold" className="text-orange-600 dark:text-orange-400" />
              </div>
              <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                No maps yet
              </h2>
              <p className="mx-auto mt-2 max-w-sm text-sm text-zinc-600 dark:text-zinc-400">
                Upload your first map — screenshots, description and the file
                itself. It goes live on the shop once it&apos;s reviewed.
              </p>
              <div className="mt-6 flex justify-center">
                <Button href="/creator/upload" size="md">
                  Add your first map
                </Button>
              </div>
            </div>
          ) : (
            <ul className="mt-10 space-y-3">
              {products.map((product) => (
                <ResourceRow key={product.id} product={product} />
              ))}
            </ul>
          )}
        </div>
      </section>
    </main>
  );
}

function ResourceRow({ product }: { product: OwnProduct }) {
  return (
    <li className="rounded-2xl border border-zinc-200 bg-[#fbfbff] p-4 dark:border-zinc-800 dark:bg-zinc-950">
      <div className="flex flex-wrap items-center gap-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.image}
          alt=""
          className="h-16 w-28 shrink-0 rounded-xl object-cover"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-semibold text-zinc-950 dark:text-zinc-50">
              {product.title}
            </span>
            <StatusBadge product={product} />
          </div>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {product.price}
          </p>
        </div>

        <div className="flex shrink-0 gap-2">
          {/* Смотреть на витрине — только у опубликованной: у остальных
              публичной страницы просто не существует (RLS отдаёт лишь
              is_published), ссылка вела бы в 404. */}
          {product.isPublished && (
            <Link
              href={`/shop/${product.slug}`}
              className={`${BUTTON_PILL} text-zinc-600 hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50`}
            >
              <Eye size={16} />
              View
            </Link>
          )}
          {/* Правку удалённой карты не предлагаем: форма всё равно её не
              сохранит, а кнопка обещает обратное. */}
          {!product.deletedAt && (
            <Link
              href={`/resources/${product.slug}/edit`}
              className={`${BUTTON_PILL} ${BUTTON_COLORS.secondary}`}
            >
              <PencilSimple size={16} weight="bold" />
              Edit
            </Link>
          )}
          <ResourceActions
            productId={product.id}
            title={product.title}
            status={product.status}
            isPublished={product.isPublished}
            deleted={Boolean(product.deletedAt)}
          />
        </div>
      </div>

      {/* Причина — под строкой, во всю ширину: это текст, который автор
          обязан прочитать целиком, а не обрезанный хвост.
          Причин теперь три, и раньше показывалась только первая: карту
          снимали или удаляли, а в списке она молча становилась «Hidden»
          без единого слова, за что. Переносы строк сохраняем
          (whitespace-pre-line) — текст собран списком пунктов. */}
      <ReasonNote product={product} />
    </li>
  );
}

/**
 * Что именно случилось с картой и почему — одним блоком под строкой.
 *
 * Порядок веток тот же, что у бейджа, и по той же причине: удаление
 * важнее отказа, отказ важнее снятия. Показываем ОДНУ причину — ту, в
 * которой карта находится сейчас.
 */
function ReasonNote({ product }: { product: OwnProduct }) {
  const note = (() => {
    if (product.deletedAt) {
      return {
        label: "Removed by the site team:",
        text:
          product.suspensionReason ??
          "No reason was recorded. Get in touch with support.",
      };
    }
    if (product.status === "rejected" && product.rejectionReason) {
      return { label: "Why it was rejected:", text: product.rejectionReason };
    }
    // Своё собственное «спрятать» объяснять не надо — автор сам это сделал.
    if (product.hiddenBy === "moderator" && product.suspensionReason) {
      return { label: "Why it was taken down:", text: product.suspensionReason };
    }
    return null;
  })();

  if (!note) return null;

  return (
    <p className="mt-3 whitespace-pre-line rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
      <span className="font-semibold">{note.label} </span>
      {note.text}
    </p>
  );
}

function StatusBadge({ product }: { product: OwnProduct }) {
  // Опубликованность и статус — разные вещи (см. миграцию модерации):
  // карта может быть одобрена, но снята с витрины. Показываем то, что
  // важнее автору прямо сейчас.
  if (product.status === "pending") {
    return (
      <Badge className="bg-zinc-950/[0.05] text-zinc-600 dark:bg-zinc-50/[0.06] dark:text-zinc-400">
        In review
      </Badge>
    );
  }
  if (product.status === "rejected") {
    return (
      <Badge className="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
        Rejected
      </Badge>
    );
  }
  // «Hidden» на всё подряд было неинформативно: автор видел одно и то же
  // слово и когда прятал карту сам, и когда её снял модератор, и когда её
  // удалили из каталога. Три разных положения — три разных подписи.
  if (product.deletedAt) {
    return (
      <Badge className="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
        Removed
      </Badge>
    );
  }
  if (!product.isPublished) {
    return product.hiddenBy === "moderator" ? (
      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
        Taken down
      </Badge>
    ) : (
      <Badge className="bg-zinc-950/[0.05] text-zinc-600 dark:bg-zinc-50/[0.06] dark:text-zinc-400">
        Hidden by you
      </Badge>
    );
  }
  return (
    <Badge className="bg-lime-100 text-lime-700 dark:bg-lime-950 dark:text-lime-300">
      Live
    </Badge>
  );
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className: string;
}) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}
