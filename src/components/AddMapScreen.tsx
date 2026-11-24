import Link from "next/link";
import { Warning } from "@phosphor-icons/react/dist/ssr";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getOwnProducts } from "@/lib/moderation";
import { getReactionOptions } from "@/lib/reactions";
import { UploadMapForm } from "@/components/UploadMapForm";

// Экран загрузки карты под заголовком страницы: предупреждения о
// своих картах и сама форма.
//
// Дверей сюда две, и обе ведут в одну форму: /admin/products/new для
// владельца и /resources/new для автора. Вторая появилась к разморозке
// креаторства — с 28.08 форма жила только в админке, и не-админ до неё
// не доходил (docs/SCANNER.md § 1, шаг 4). Заголовок, гейты и экран
// «отправлено» у каждой двери свои, а всё ниже — общее, чтобы две копии
// не разъехались, как разъехались галереи форм до 11.09.
//
// Права здесь не проверяются: это делает страница-дверь, а решает
// шлюз /api/creator/map.
export async function AddMapScreen({
  userId,
  submittedHref,
  cancelHref,
  freeOnly = false,
}: {
  userId: string;
  submittedHref: string;
  cancelHref: string;
  /** Платная цена закрыта (paid-maps.ts). */
  freeOnly?: boolean;
}) {
  const supabase = await createSupabaseServer();

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
  const own = await getOwnProducts(supabase, userId);
  const rejected = own.filter((p) => p.state === "rejected");
  const pending = own.filter((p) => p.state === "pending");

  return (
    <>
      {/* Отказ — здесь предупреждение оправдано. */}
      {rejected.length > 0 && (
        <div className="mt-8 rounded-2xl border border-orange-200 bg-orange-50 p-4 dark:border-orange-900 dark:bg-orange-950/30">
          <p className="flex gap-2.5 text-sm text-orange-900 dark:text-orange-100">
            <Warning size={18} weight="fill" className="mt-0.5 shrink-0" />
            <span>
              Fixing something after a rejection?{" "}
              <strong>Edit the existing map</strong> instead of uploading it
              again: a re-upload creates a second listing rather than replacing
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
                  · needs changes
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
        <UploadMapForm
          reactionOptions={reactionOptions}
          submittedHref={submittedHref}
          cancelHref={cancelHref}
          freeOnly={freeOnly}
        />
      </div>
    </>
  );
}
