import type { Metadata } from "next";
import Link from "next/link";
import { Warning } from "@phosphor-icons/react/dist/ssr";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getAdminUser } from "@/lib/admin";
import { getOwnProducts } from "@/lib/moderation";
import { isCreator, getSubmissionBlock } from "@/lib/creator-applications";
import { UploadMapForm } from "@/components/UploadMapForm";
import { getReactionOptions } from "@/lib/reactions";
import { INLINE_LINK } from "@/components/Button";

export const metadata: Metadata = {
  title: "Add a map",
  robots: { index: false },
};

// Личная страница — не кэшируем. В админке так везде: она показывает
// состояние базы прямо сейчас, и минута задержки здесь означала бы, что
// владелец смотрит на вчерашний каталог.
export const dynamic = "force-dynamic";

// ФОРМА ПЕРЕЕХАЛА СЮДА С /creator/upload (2026-08-28), и переезд был
// вынужденным.
//
// 21 августа профиль сменил адрес на /@<имя>, и в next.config.ts
// появился редирект /creator/:username → /@:username. `:username` — это
// ЛЮБОЙ односегментный адрес под /creator/, то есть и `upload` тоже:
// форма перестала открываться в тот же день. Редиректы выполняются
// раньше маршрутизации, поэтому файл даже не получал шанса отрисоваться,
// а выглядело это как 404 профиля с ником «upload». Семь дней все четыре
// двери сюда вели в никуда, и ни один тест этого не заметил — правила
// next.config.ts не покрыты ничем.
//
// Решение владельца: увести форму в админку, а пространство /creator/
// оставить профилям целиком. Со старого адреса стоит редирект — он
// обязателен, а не для красоты: href «/creator/upload» уже записан в
// разосланные уведомления об одобренных заявках, и переписать их нельзя.
//
// ⚠️ ЧТО ПЕРЕЕЗД НЕ МЕНЯЕТ: право загружать по-прежнему висит на
// is_creator, а не на is_admin. Так решает БАЗА — политика "creators
// insert own products" (20260811160000) требует is_creator у автора
// строки. Админка здесь только ДВЕРЬ. Отсюда следствие на день
// разморозки креаторства: чужому автору эта дверь не откроется (он не
// админ), и креаторский вход придётся возвращать отдельно.
export default async function AddMapPage() {
  // Гость и посторонний сюда не доходят: гейт стоит в layout админки и
  // отвечает 404 обоим. Здесь id нужен по другой причине — карта
  // пишется на него как на автора.
  const admin = await getAdminUser();
  if (!admin) return null;

  const supabase = await createSupabaseServer();

  // Проверяем НЕ админство, а статус креатора — потому что его требует
  // база при вставке. Без этой проверки админ-не-креатор заполнил бы всю
  // форму, загрузил файл и получил отказ RLS на последнем шаге, не поняв
  // за что. Тот же довод, что у паузы ниже.
  const creator = await isCreator(supabase, admin.id);

  // Пауза после тяжёлого отказа (миграция 20260811160000). Она стоит в
  // той же политике вставки и админа не обходит: строка в profiles одна
  // на все роли.
  const blockedUntil = creator
    ? await getSubmissionBlock(supabase, admin.id)
    : null;

  if (!creator || blockedUntil) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Add a map
        </h1>
        <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30">
          <p className="flex gap-2.5 text-sm text-orange-900 dark:text-orange-100">
            <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
            <span>
              {creator ? (
                <>
                  Uploads from this account are paused until a rejection
                  cooldown runs out. The database enforces it, so the form would
                  only fail on the last step.
                </>
              ) : (
                <>
                  This account is an admin but not a creator, and the database
                  files every map under a creator. Grant{" "}
                  <code>is_creator</code> in <code>profiles</code> first — the
                  form would be rejected on submit otherwise.
                </>
              )}
            </span>
          </p>
        </div>
        <p className="mt-6 text-sm">
          <Link href="/admin/products" className={INLINE_LINK}>
            Back to the catalog
          </Link>
        </p>
      </div>
    );
  }

  // Список реакций читаем ЗДЕСЬ: форма клиентская, а список живёт в
  // базе. Тянуть его из браузера значило бы лишний запрос при каждом
  // открытии формы ради данных, которые страница и так получает.
  const reactionOptions = await getReactionOptions();

  // Два РАЗНЫХ случая, и путать их нельзя.
  //
  // Отклонённая карта — единственный, где предупреждать уместно: после
  // отказа человек естественно идёт «загрузить заново» и создаёт ВТОРУЮ
  // строку вместо исправления первой (slug при совпадении получает
  // случайный суффикс, ничто дубликат не останавливает).
  //
  // Карта на ревью — обычное состояние, а не проблема: отправил одну,
  // спокойно делаешь вторую. Сначала предупреждение показывалось на обе,
  // и человек, добавляя ВТОРУЮ карту, получал тревожную плашку про
  // дубликаты на ровном месте.
  const own = await getOwnProducts(supabase, admin.id);
  const rejected = own.filter((p) => p.state === "rejected");
  const pending = own.filter((p) => p.state === "pending");

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        Add a map
      </h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Submitted maps go through the review queue before they reach the
        marketplace — your own included.
      </p>

      {/* Отказ — здесь предупреждение оправдано. */}
      {rejected.length > 0 && (
        <div className="mt-8 rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30">
          <p className="flex gap-2.5 text-sm text-orange-900 dark:text-orange-100">
            <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
            <span>
              Fixing something after a rejection?{" "}
              <strong>Edit the existing map</strong> instead of uploading it
              again — a re-upload creates a second listing rather than replacing
              the first.
            </span>
          </p>
          <ul className="mt-3 space-y-1.5">
            {rejected.map((product) => (
              <li key={product.id}>
                <Link
                  href={`/resources/${product.slug}/edit`}
                  className="text-sm font-semibold text-orange-700 underline decoration-2 underline-offset-4 hover:text-orange-800 dark:text-orange-300 dark:hover:text-orange-200"
                >
                  {product.title}
                </Link>{" "}
                <span className="text-xs text-orange-800/70 dark:text-orange-200/70">
                  — needs changes
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Карты на проверке — просто справка, без тревоги: ни рамки, ни
          значка предупреждения, приглушённый текст. Добавлять вторую
          карту, пока первая на ревью, совершенно нормально. */}
      {pending.length > 0 && rejected.length === 0 && (
        <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
          {pending.length === 1
            ? "One of your maps is in review"
            : `${pending.length} of your maps are in review`}
          :{" "}
          {pending.map((product, i) => (
            <span key={product.id}>
              {i > 0 && ", "}
              <Link
                href={`/resources/${product.slug}/edit`}
                className="font-medium text-zinc-700 underline decoration-zinc-300 underline-offset-4 hover:text-orange-600 dark:text-zinc-300 dark:decoration-zinc-600 dark:hover:text-orange-400"
              >
                {product.title}
              </Link>
            </span>
          ))}
          . Adding another one is fine.
        </p>
      )}

      <div className="mt-10">
        <UploadMapForm userId={admin.id} reactionOptions={reactionOptions} />
      </div>
    </div>
  );
}
