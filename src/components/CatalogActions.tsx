"use client";

import { useState } from "react";
import Link from "next/link";
import { useRefresh } from "@/lib/useRefresh";
import {
  EyeSlash,
  Eye,
  Trash,
  ArrowCounterClockwise,
  PencilSimple,
} from "@phosphor-icons/react";
import { BUTTON_PILL, BUTTON_COLORS, DANGER_COLORS } from "@/components/Button";
import {
  DELETION_TEMPLATES,
  buildReasonMessage,
  type ReasonTemplate,
} from "@/lib/rejection";
import type { CatalogRow } from "@/lib/catalog";
import { readApiError } from "@/lib/api-error";

// Действия над картой в каталоге админки.
//
// И снятие, и удаление требуют причины и потому идут через окно, а не по
// клику: карта пропадает из дохода автора, и «за что» он должен узнать
// из системы, а не из переписки. Причина собирается из шаблонов, как у
// отказа, — модератору не приходится каждый раз формулировать заново, а
// автор получает одинаковые слова за одинаковые проступки.
//
// Оба окна — ОДИН компонент с одной геометрией (центр экрана, та же
// ширина, те же отступы). Раньше это были две разные врезки, съезжавшие
// вниз по-разному в зависимости от того, что нажали.

// Раньше здесь было два режима — "suspend" | "delete". Окно снятия
// убрано (решение владельца 2026-08-22): с одним продавцом
// «снять чужую карту за нарушение» — действие без адресата. Сам
// обработчик жив и ждёт разморозки креаторства — разбор в
// /api/admin/catalog.
type Mode = "delete";

export function CatalogActions({
  product,
  own,
}: {
  product: CatalogRow;
  /** Карта смотрящего. Свою можно править и прятать, чужую — нет. */
  own: boolean;
}) {
  const refresh = useRefresh();
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState<Mode | null>(null);
  const [codes, setCodes] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setAsking(null);
    setCodes([]);
    setNote("");
    setTyped("");
    setError(null);
  }

  async function run(action: string, payload?: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id, action, ...payload }),
      });
      if (!res.ok) {
        const { code, message } = await readApiError(res);
        setError(message ?? code ?? "Something went wrong");
        return;
      }
      reset();
      // Каталог — серверный компонент; refresh перерисовывает его свежими
      // данными, не перезагружая страницу целиком.
      refresh();
    } finally {
      setBusy(false);
    }
  }

  const deleted = product.state === "deleted";
  const templates = DELETION_TEMPLATES;
  const reason = buildReasonMessage(templates, codes, note);
  // Сверяем без регистра и краевых пробелов — ровно как сервер.
  const titleMatches = typed.trim().toLowerCase() === product.title.toLowerCase();

  return (
    <>
      {/* items-center, а не items-start: обе кнопки одной высоты (h-10 из
          BUTTON_PILL) и обязаны стоять на одной линии — раньше блок
          прижимался к верху строки и «Delete» визуально уезжал. */}
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
        {deleted ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => run("restore")}
            className={`${BUTTON_PILL} ${BUTTON_COLORS.secondary}`}
          >
            <ArrowCounterClockwise size={16} weight="bold" />
            Restore
          </button>
        ) : (
          <>
            {/* Правка — кнопка, а не ссылка в строке под названием.
                Ссылка там была с постройки каталога, и владелец её не
                нашёл: мелкий текст рядом с «Open in the marketplace»
                читался как справка, а не как действие. Действия живут в
                этой колонке — значит и правка здесь.

                Ведёт в СУЩЕСТВУЮЩУЮ форму автора. Своего редактора для
                админки не заводим сознательно: это был бы второй путь
                записи в products со своими правами и своими дырами. */}
            {own && (
              <Link
                href={`/resources/${product.slug}/edit`}
                className={`${BUTTON_PILL} ${BUTTON_COLORS.secondary}`}
              >
                <PencilSimple size={16} weight="bold" />
                Edit
              </Link>
            )}

            {/* Спрятать и вернуть — только СВОЮ карту. Состояние hidden
                база подписывает «убрал автор» (триггер из миграции
                20260815130000), и на чужой карте такая подпись была бы
                неправдой — та же ошибка, от которой заведены deleted_by
                у карт и soft_delete_comment у комментариев.

                ⚠️ Запрет стоит НА СЕРВЕРЕ (/api/admin/catalog). Здесь мы
                лишь не рисуем заведомо бесполезную кнопку: спрятанная
                кнопка не защищает ничего — это правило проекта выяснялось
                пять раз за 20–21 августа. */}
            {own && product.state === "live" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run("hide")}
                className={`${BUTTON_PILL} ${BUTTON_COLORS.secondary}`}
              >
                <EyeSlash size={16} weight="bold" />
                Hide
              </button>
            )}

            {own && product.state === "hidden" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run("unhide")}
                className={`${BUTTON_PILL} ${BUTTON_COLORS.secondary}`}
              >
                <Eye size={16} weight="bold" />
                Publish again
              </button>
            )}

            {/* Снятую площадкой возвращаем независимо от того, чья она:
                это решение площадки, и отменять его ей же. Кнопки «Take
                down» больше нет, но карты, снятые ею раньше, остаться
                могли — без этой кнопки они заперты навсегда. */}
            {product.state === "suspended" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run("unsuspend")}
                className={`${BUTTON_PILL} ${BUTTON_COLORS.secondary}`}
              >
                <Eye size={16} weight="bold" />
                Publish again
              </button>
            )}

            <button
              type="button"
              disabled={busy}
              onClick={() => setAsking("delete")}
              className={`${BUTTON_PILL} ${DANGER_COLORS.quiet}`}
            >
              <Trash size={16} weight="bold" />
              Delete
            </button>
          </>
        )}
      </div>

      {/* Ошибка действия БЕЗ диалога — «Publish again» и «Restore».
          Раньше её негде было показать: текст ошибки отрисовывался только
          внутри окна подтверждения, а эти две кнопки срабатывают сразу.
          То есть сервер отвечал отказом, а на экране не менялось ничего,
          и кнопка выглядела сломанной — ровно так и потерялся день на
          поиск «почему Publish again не работает». Невидимая ошибка хуже
          самой ошибки: она отправляет искать поломку не туда. */}
      {!asking && error && (
        <p className="mt-2 text-right text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      {asking && (
        <ReasonDialog
          mode={asking}
          title={product.title}
          templates={templates}
          codes={codes}
          onToggle={(code) =>
            setCodes((current) =>
              current.includes(code)
                ? current.filter((c) => c !== code)
                : [...current, code]
            )
          }
          note={note}
          onNote={setNote}
          typed={typed}
          onTyped={setTyped}
          titleMatches={titleMatches}
          reason={reason}
          busy={busy}
          error={error}
          onCancel={reset}
          onConfirm={() =>
            run(asking, {
              reason,
              reasonCodes: codes,
              ...(asking === "delete" ? { confirmTitle: typed } : {}),
            })
          }
        />
      )}
    </>
  );
}

function ReasonDialog({
  mode,
  title,
  templates,
  codes,
  onToggle,
  note,
  onNote,
  typed,
  onTyped,
  titleMatches,
  reason,
  busy,
  error,
  onCancel,
  onConfirm,
}: {
  mode: Mode;
  title: string;
  templates: ReasonTemplate[];
  codes: string[];
  onToggle: (code: string) => void;
  note: string;
  onNote: (value: string) => void;
  typed: string;
  onTyped: (value: string) => void;
  titleMatches: boolean;
  reason: string;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isDelete = mode === "delete";
  // Причина обязательна в обоих случаях; у удаления сверх того нужно
  // перепечатать название — оно необратимо.
  const canConfirm = reason.trim().length > 0 && (!isDelete || titleMatches);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isDelete ? `Delete ${title}` : `Take down ${title}`}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-zinc-950/70 p-4 backdrop-blur-sm"
    >
      <div className="my-8 w-full max-w-lg rounded-3xl border border-zinc-200 bg-[#fbfbff] p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          {isDelete
            ? "Remove this map from the marketplace?"
            : "Take this map down?"}
        </h2>

        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {isDelete ? (
            <>
              {/* Пробел после названия — его тут не хватало, и текст читался
                  как «Sky Cathedralfrom the marketplace». */}
              Remove{" "}
              <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                {title}
              </span>{" "}
              from the marketplace and the creator&apos;s list? It stays in this
              catalog, and anyone who bought it keeps their download. Nothing is
              erased.
            </>
          ) : (
            <>
              <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                {title}
              </span>{" "}
              comes off the marketplace. The creator keeps it, sees the reason below,
              and can fix it and send it back for review.
            </>
          )}
        </p>

        <fieldset className="mt-5">
          <legend className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Why? The creator sees this.
          </legend>
          <div className="mt-2 space-y-1">
            {templates.map((template) => (
              <label
                key={template.code}
                className="flex cursor-pointer items-start gap-2.5 rounded-xl px-2 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-950/[0.04] dark:text-zinc-300 dark:hover:bg-zinc-50/[0.05]"
              >
                <input
                  type="checkbox"
                  checked={codes.includes(template.code)}
                  onChange={() => onToggle(template.code)}
                  className="mt-0.5 h-4 w-4 shrink-0 accent-orange-500"
                />
                {template.label}
              </label>
            ))}
          </div>
        </fieldset>

        <label
          htmlFor="catalog-reason-note"
          className="mt-4 mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
        >
          Anything to add
        </label>
        <textarea
          id="catalog-reason-note"
          value={note}
          onChange={(e) => onNote(e.target.value)}
          rows={2}
          className="w-full rounded-xl border border-zinc-950/[0.08] bg-transparent px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/25 dark:border-zinc-50/[0.08]"
        />

        {isDelete && (
          <>
            {/* Ввод названия, а не «вы уверены?»: диалог с одной кнопкой
                подтверждается не глядя, а перепечатать название нельзя
                машинально — приходится посмотреть, что именно удаляешь.
                Тот же приём, что у автора в ResourceActions. */}
            <label
              htmlFor="catalog-confirm-title"
              className="mt-4 mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Type{" "}
              <span className="font-semibold text-zinc-950 dark:text-zinc-50">
                {title}
              </span>{" "}
              to confirm
            </label>
            <input
              id="catalog-confirm-title"
              value={typed}
              onChange={(e) => onTyped(e.target.value)}
              autoComplete="off"
              className="w-full rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-3 text-sm text-zinc-950 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50"
            />
          </>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={`${BUTTON_PILL} text-zinc-600 hover:bg-zinc-950/[0.05] dark:text-zinc-400 dark:hover:bg-zinc-50/[0.06]`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy || !canConfirm}
            className={`${BUTTON_PILL} ${
              isDelete ? DANGER_COLORS.solid : BUTTON_COLORS.primary
            }`}
          >
            {busy ? "Working…" : isDelete ? "Delete" : "Take it down"}
          </button>
        </div>
      </div>
    </div>
  );
}
