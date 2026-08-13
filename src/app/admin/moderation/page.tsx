import Link from "next/link";
import { sanitizeDescription } from "@/lib/sanitize";
import { DownloadSimple, Clock } from "@phosphor-icons/react/dist/ssr";
import { getPendingProducts, type SubmissionKind } from "@/lib/moderation";
import { ModerationActions } from "@/components/ModerationActions";
import { RefreshButton } from "@/components/RefreshButton";
import { ModerationGallery } from "@/components/ModerationGallery";
import { RICH_TEXT_CLASS } from "@/lib/rich-text";
import { BUTTON_COLORS, BUTTON_PILL, INLINE_LINK, NEW_TAB } from "@/components/Button";
import { creatorHref } from "@/lib/creators";

// Очередь всегда свежая: список меняется от каждого решения, кэшировать
// его нечего и незачем.
export const dynamic = "force-dynamic";

// Права проверяет layout админки (src/app/admin/layout.tsx) — сюда
// попадает только админ. Дублировать проверку здесь не нужно, но и
// полагаться на неё в API нельзя: /api/admin/moderation проверяет
// заново, потому что запрос туда можно отправить и минуя эту страницу.
// Откуда карта пришла в очередь. Три случая — три разных разбора:
// впервые её видят целиком, после отказа проверяют перечисленное, после
// снятия решают, снят ли повод. До этого все три выглядели одинаково, и
// отличить их можно было только по памяти.
function SubmissionBadge({ kind }: { kind: SubmissionKind }) {
  if (kind === "first") return null;

  const { label, className } = {
    after_takedown: {
      label: "Back after a takedown",
      className:
        "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    },
    after_rejection: {
      label: "Fixed after a rejection",
      className:
        "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
    },
    file_changed: {
      label: "File replaced on a live map",
      className:
        "bg-zinc-950/[0.05] text-zinc-600 dark:bg-zinc-50/[0.06] dark:text-zinc-400",
    },
  }[kind];

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}

export default async function ModerationPage() {
  const pending = await getPendingProducts();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
          Moderation queue
        </h1>
        {/* Очередь пополняется, пока она открыта: креатор отправляет
            карту, а страница об этом не узнаёт. */}
        <RefreshButton label="Check for new submissions" />
      </div>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        {pending.length === 0
          ? "Nothing waiting."
          : `${pending.length} map${pending.length === 1 ? "" : "s"} waiting for review.`}
      </p>

      {pending.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-zinc-200 p-12 text-center dark:border-zinc-800">
          <Clock size={40} weight="thin" className="mx-auto text-zinc-300 dark:text-zinc-700" />
          <p className="mt-4 text-sm text-zinc-500 dark:text-zinc-400">
            When a creator submits a map, it shows up here.
          </p>
        </div>
      ) : (
        <ul className="mt-8 space-y-8">
          {pending.map((product) => (
            <li
              key={product.id}
              className="rounded-3xl border border-zinc-200 p-6 dark:border-zinc-800"
            >
              {/* Шапка заявки: кто, что, почём, когда */}
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                      {product.title}
                    </h2>
                    <SubmissionBadge kind={product.submissionKind} />
                  </div>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    by{" "}
                    {product.creator ? (
                      <Link
                        href={creatorHref(product.creator.displayName)}
                        {...NEW_TAB}
                        className={`font-medium ${INLINE_LINK}`}
                      >
                        {product.creator.displayName}
                      </Link>
                    ) : (
                      "—"
                    )}{" "}
                    · {product.price} · {product.category ?? "no category"} ·{" "}
                    {new Date(product.createdAt).toLocaleDateString()}
                  </p>
                  <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                    {product.summary}
                  </p>

                  {/* За что снимали — прямо здесь. Разбирать возврат, не
                      видя претензии, значит решать вслепую: вопрос ведь
                      не «хороша ли карта», а «устранён ли повод».
                      Триггер эту причину намеренно не стирает. */}
                  {product.submissionKind === "after_takedown" &&
                    product.suspensionReason && (
                      <p className="mt-3 whitespace-pre-line rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                        <span className="font-semibold">
                          It was taken down for:{" "}
                        </span>
                        {product.suspensionReason}
                      </p>
                    )}
                </div>

                {/* Скачать файл — без этого проверка невозможна: судить о
                    карте по описанию нельзя, её надо открыть в игре. */}
                {product.fileUrl ? (
                  <a
                    href={product.fileUrl}
                    className={`${BUTTON_PILL} ${BUTTON_COLORS.secondary}`}
                  >
                    <DownloadSimple size={16} weight="bold" />
                    Download file
                  </a>
                ) : (
                  <span className="shrink-0 rounded-full bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 dark:bg-red-950/40 dark:text-red-400">
                    No file attached
                  </span>
                )}
              </div>

              {/* Галерея — обложка первой, как её увидит витрина;
                  по клику разворачивается на весь экран с листанием. */}
              <ModerationGallery images={product.images} title={product.title} />

              {/* Описание — ровно в том виде, в каком его увидит
                  покупатель (те же классы, тот же санитайзер, что на
                  /marketplace/[slug]). Смысл админки именно в этом: решение
                  принимается по готовой странице, а не по строке БД. */}
              <details className="mt-5 group">
                <summary className={`cursor-pointer text-sm font-medium ${INLINE_LINK}`}>
                  Preview description
                </summary>
                <div
                  className={`mt-3 rounded-2xl border border-zinc-200 p-5 text-sm leading-7 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 ${RICH_TEXT_CLASS}`}
                  dangerouslySetInnerHTML={{
                    __html: sanitizeDescription(product.description),
                  }}
                />
              </details>

              <ModerationActions productId={product.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
