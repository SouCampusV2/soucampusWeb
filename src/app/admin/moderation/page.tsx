import Link from "next/link";
import DOMPurify from "isomorphic-dompurify";
import { DownloadSimple, Clock } from "@phosphor-icons/react/dist/ssr";
import { getPendingProducts } from "@/lib/moderation";
import { ModerationActions } from "@/components/ModerationActions";
import { ModerationGallery } from "@/components/ModerationGallery";
import { RICH_TEXT_CLASS } from "@/lib/rich-text";
import { BUTTON_COLORS, BUTTON_PILL } from "@/components/Button";
import { creatorHref } from "@/lib/creators";

// Очередь всегда свежая: список меняется от каждого решения, кэшировать
// его нечего и незачем.
export const dynamic = "force-dynamic";

// Права проверяет layout админки (src/app/admin/layout.tsx) — сюда
// попадает только админ. Дублировать проверку здесь не нужно, но и
// полагаться на неё в API нельзя: /api/admin/moderation проверяет
// заново, потому что запрос туда можно отправить и минуя эту страницу.
export default async function ModerationPage() {
  const pending = await getPendingProducts();

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        Moderation queue
      </h1>
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
                  <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                    {product.title}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                    by{" "}
                    {product.creator ? (
                      <Link
                        href={creatorHref(product.creator.displayName)}
                        className="font-medium text-orange-600 hover:underline dark:text-orange-400"
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
                  /shop/[slug]). Смысл админки именно в этом: решение
                  принимается по готовой странице, а не по строке БД. */}
              <details className="mt-5 group">
                <summary className="cursor-pointer text-sm font-medium text-orange-600 hover:underline dark:text-orange-400">
                  Preview description
                </summary>
                <div
                  className={`mt-3 rounded-2xl border border-zinc-200 p-5 text-sm leading-7 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300 ${RICH_TEXT_CLASS}`}
                  dangerouslySetInnerHTML={{
                    __html: DOMPurify.sanitize(product.description, {
                      ALLOWED_TAGS: [
                        "p", "br", "strong", "em", "s", "code", "pre", "blockquote",
                        "h2", "h3", "ul", "ol", "li", "a", "img",
                        "table", "thead", "tbody", "tr", "th", "td",
                      ],
                      ALLOWED_ATTR: ["href", "target", "rel", "src", "alt", "colspan", "rowspan"],
                    }),
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
