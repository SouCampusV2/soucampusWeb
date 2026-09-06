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
import {
  getOwnApplication,
  isCreator,
  getSubmissionBlock,
} from "@/lib/creator-applications";
import { CREATOR_SIGNUPS_OPEN } from "@/lib/flags";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Your resources",
  robots: { index: false },
};

// Личная страница — не кэшируем, гасим унаследованный от (site)
// revalidate = 60 (подробно — в notifications/page.tsx). Здесь та же
// кнопка «обновить»: статус карты меняет модератор, а не тот, кто на
// список смотрит.
export const dynamic = "force-dynamic";

// Личный раздел креатора: его карты в одном списке — опубликованные,
// ждущие разбора и отклонённые. Раньше «Your resources» в меню вело на
// ПУБЛИЧНУЮ страницу /creator/<ник>, где видно только опубликованное и
// нечего редактировать; заявки при этом лежали на /profile. То есть свои
// же карты были размазаны по двум страницам, ни одна из которых не
// управляла ими. Здесь всё вместе и отсюда же правится.
export default async function ResourcesPage() {
  const supabase = await createSupabaseServer();
  const user = await getCurrentUser(supabase);

  // Гостя уводим НА ВИТРИНУ, а не на вход (правка 2026-09-06 по
  // замечанию владельца). Пока приём авторов заморожен, «войди, чтобы
  // попасть сюда» — обещание, которое мы не выполним: вошедший без
  // статуса тут же уедет на витрину следующим редиректом ниже. Два шага
  // там, где честный ответ — ноль.
  //
  // ⚠️ При разморозке креаторства вернуть /login?next=/resources: тогда
  // вход снова будет вести к чему-то, а не по кругу.
  if (!user) {
    redirect(CREATOR_SIGNUPS_OPEN ? "/login?next=/resources" : "/marketplace");
  }

  // Право загружать и состояние заявки — параллельно, они независимы.
  const [products, creator, application, blockedUntil] = await Promise.all([
    getOwnProducts(supabase, user.id),
    isCreator(supabase, user.id),
    getOwnApplication(supabase, user.id),
    getSubmissionBlock(supabase, user.id),
  ]);

  // Приём авторов заморожен — постороннему здесь нечего делать. Ссылок
  // сюда не осталось (пункт убран из навбара, кнопка с профиля тоже),
  // но адрес знают закладки и старые уведомления, и по нему человек
  // упёрся бы в форму заявки, которую база всё равно не примет.
  //
  // Уводим на витрину, а не показываем «пока закрыто»: объяснение — это
  // тот же анонс возможности, только другими словами. Автора (владельца)
  // редирект не касается, у него isCreator = true.
  if (!creator && !CREATOR_SIGNUPS_OPEN) {
    redirect("/marketplace");
  }

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
              {/* Под паузой кнопку не показываем: она вела бы на
                  форму, с которой человека сразу разворачивает. */}
              {creator && products.length > 0 && !blockedUntil && (
                <Button href="/admin/products/new" size="sm">
                  Add a map
                </Button>
              )}
            </div>
          </div>

          {/* Три состояния, и порядок проверок важен. Ещё не креатор —
              показываем заявку, а не «добавь первую карту»: кнопка вела
              бы на форму, с которой его развернёт гейт. Дальше обычное
              пустое состояние и, наконец, список. */}
          {/* Пауза после тяжёлого отказа — над списком и во всю ширину:
              это первое, что человек должен прочитать, зайдя сюда за
              «добавить карту». Правку уже отправленных карт она не
              трогает, и об этом сказано прямо — иначе он решит, что
              исправлять отклонённое тоже нельзя, и просто уйдёт. */}
          {blockedUntil && (
            <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 dark:border-red-900 dark:bg-red-950/40">
              <p className="text-sm font-semibold text-red-800 dark:text-red-200">
                New submissions are paused until{" "}
                {blockedUntil.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <p className="mt-1 text-sm text-red-700 dark:text-red-300">
                This came from a rejected submission — the reason is on the
                map below. You can still edit and resubmit the maps you have
                already uploaded.
              </p>
            </div>
          )}

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
                itself. It goes live on the marketplace once it&apos;s reviewed.
              </p>
              <div className="mt-6 flex justify-center">
                <Button href="/admin/products/new" size="md">
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
          {/* Смотреть на витрине — только у той, что на витрине и есть:
              у остальных публичной страницы просто не существует (RLS
              отдаёт лишь live-карты активных авторов), ссылка вела бы в
              404. */}
          {product.state === "live" && product.creatorActive && (
            <Link
              href={`/marketplace/${product.slug}`}
              className={`${BUTTON_PILL} text-zinc-600 hover:bg-zinc-950/[0.05] hover:text-zinc-950 dark:text-zinc-400 dark:hover:bg-zinc-50/[0.06] dark:hover:text-zinc-50`}
            >
              <Eye size={16} />
              View
            </Link>
          )}
          {/* Правку удалённой карты не предлагаем: форма всё равно её не
              сохранит, а кнопка обещает обратное. */}
          {product.state !== "deleted" && (
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
            state={product.state}
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
    if (product.state === "deleted") {
      // Своё удаление сюда не доходит — такие карты в список не
      // попадают вовсе (см. getOwnProducts). Ветка на него всё равно
      // есть: подпись «удалила площадка» под собственным решением
      // автора — это обвинение на пустом месте, и оно не должно стать
      // возможным, если фильтр когда-нибудь изменят.
      if (product.deletedBy === "creator") {
        return {
          label: "You deleted this map:",
          text: "It is off the marketplace. The file is still kept — write to support if you need it back.",
        };
      }
      return {
        label: "Removed by the site team:",
        text:
          product.suspensionReason ??
          "No reason was recorded. Get in touch with support.",
      };
    }
    if (product.state === "rejected" && product.rejectionReason) {
      return { label: "Why it was rejected:", text: product.rejectionReason };
    }
    // Своё собственное «спрятать» объяснять не надо — автор сам это сделал.
    if (product.state === "suspended" && product.suspensionReason) {
      return { label: "Why it was taken down:", text: product.suspensionReason };
    }
    // Карта ушла не за себя, а вместе со статусом автора. Подпись другая
    // именно поэтому: «за что сняли ЭТУ карту» здесь ответа не имеет, и
    // претензия к карте сбивала бы с толку — исправлять в ней нечего.
    //
    // Проверяется последней: если карту вдобавок сняли за её собственную
    // провинность, автору важнее прочитать претензию к карте — та
    // останется и после того, как доступ вернут.
    if (!product.creatorActive) {
      return {
        label: "Off the marketplace while your creator access is closed:",
        text: "Nothing is wrong with this map — it comes back with your creator status.",
      };
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
  // Порядок веток = что важнее автору прямо сейчас. Раньше здесь
  // сравнивались три поля в шести ветках; теперь состояние одно, и
  // отдельной проверки требует только статус самого автора — он про
  // человека, а не про карту.
  if (product.state === "pending") {
    return (
      <Badge className="bg-zinc-950/[0.05] text-zinc-600 dark:bg-zinc-50/[0.06] dark:text-zinc-400">
        In review
      </Badge>
    );
  }
  if (product.state === "rejected") {
    return (
      <Badge className="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
        Rejected
      </Badge>
    );
  }
  // «Hidden» на всё подряд было неинформативно: автор видел одно и то же
  // слово и когда прятал карту сам, и когда её снял модератор, и когда её
  // удалили из каталога. Три разных положения — три разных подписи.
  if (product.state === "deleted") {
    return (
      <Badge className="bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
        Removed
      </Badge>
    );
  }
  if (product.state === "suspended") {
    return (
      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
        Taken down
      </Badge>
    );
  }
  if (product.state === "hidden") {
    return (
      <Badge className="bg-zinc-950/[0.05] text-zinc-600 dark:bg-zinc-50/[0.06] dark:text-zinc-400">
        Hidden by you
      </Badge>
    );
  }
  // Дальше карта живая — но на витрине её может не быть, если закрыт
  // доступ автора. «Paused», а не «Taken down»: претензии к карте нет.
  if (!product.creatorActive) {
    return (
      <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
        Paused
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
