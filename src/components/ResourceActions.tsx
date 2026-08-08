"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DotsThree, EyeSlash, Eye, Trash } from "@phosphor-icons/react";
import { BUTTON_PILL } from "@/components/Button";

// Что автор может сделать со своей картой помимо правки: спрятать её с
// витрины и удалить совсем.
//
// Меню, а не ещё две кнопки в строке: рядом уже стоят View и Edit —
// повседневные действия, и уравнивать с ними «удалить» неправильно.
// Опасное прячется на один клик глубже и подписано красным.
//
// Решение принимает /api/creator/product: здесь только намерение.
// Проверка «моя ли карта» и запрет удалять купленное живут на сервере —
// на эту форму полагаться нельзя, запрос отправляется и мимо неё.
export function ResourceActions({
  productId,
  title,
  status,
  isPublished,
}: {
  productId: string;
  title: string;
  status: "pending" | "published" | "rejected";
  isPublished: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Клик мимо закрывает меню. Без этого оно остаётся висеть, пока не
  // ткнёшь ровно в ту же кнопку, — и на странице с десятком карт легко
  // открыть второе, не закрыв первое.
  //
  // pointerdown на document в ФАЗЕ ПЕРЕХВАТА, а не mousedown на window
  // (как было, и оно не срабатывало):
  //   • перехват — событие достаётся нам ПЕРВЫМИ, до всплытия, поэтому
  //     любой stopPropagation по дороге (а на странице живёт перехватчик
  //     ссылок из PageTransition) больше не может нас отключить;
  //   • pointer вместо mouse — одно событие и на мышь, и на тач: на
  //     телефоне mousedown приходит с задержкой, а то и не приходит вовсе;
  //   • меню закрывается на нажатии, поэтому последующий click спокойно
  //     доходит до того, во что целились, — раньше промах по меню
  //     ощущался как «клик не сработал».
  // Esc — то же самое с клавиатуры, обязательное для всплывающего меню.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function send(action: "hide" | "unhide" | "delete") {
    setError(null);
    setPending(true);

    const response = await fetch("/api/creator/product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId,
        action,
        confirmTitle: action === "delete" ? typed : undefined,
      }),
    });

    setPending(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong.");
      return;
    }

    setOpen(false);
    setConfirming(false);
    setTyped("");
    router.refresh();
  }

  // Прятать можно только одобренную карту: у заявки в очереди витрины
  // и так нет (сервер отвечает на это 409, здесь просто не показываем
  // бессмысленный пункт).
  const canHide = status === "published";
  // Сверяем без регистра и краевых пробелов — ровно как сервер.
  const titleMatches = typed.trim().toLowerCase() === title.toLowerCase();

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={`More actions for ${title}`}
        aria-expanded={open}
        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-zinc-600 transition-colors hover:bg-zinc-950/[0.05] dark:text-zinc-400 dark:hover:bg-zinc-50/[0.06]"
      >
        <DotsThree size={20} weight="bold" />
      </button>

      {open && (
        <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-56 overflow-hidden rounded-2xl border border-zinc-200 bg-[#fbfbff] p-1 shadow-lg dark:border-zinc-800 dark:bg-zinc-950">
          {canHide && (
            <button
              type="button"
              onClick={() => send(isPublished ? "hide" : "unhide")}
              disabled={pending}
              className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-950/[0.05] disabled:opacity-60 dark:text-zinc-300 dark:hover:bg-zinc-50/[0.06]"
            >
              {isPublished ? <EyeSlash size={16} /> : <Eye size={16} />}
              {isPublished ? "Hide from the shop" : "Show in the shop"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            <Trash size={16} />
            Delete permanently
          </button>

          {error && !confirming && (
            <p className="px-3 py-2 text-xs text-red-600 dark:text-red-400">{error}</p>
          )}
        </div>
      )}

      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Delete ${title}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-[#fbfbff] p-6 dark:border-zinc-800 dark:bg-zinc-950">
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
              Delete this map?
            </h2>
            <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
              The map, its screenshots and the uploaded file are removed for
              good. This can&apos;t be undone — if you only want it off the
              shop, hide it instead.
            </p>

            {/* Ввод названия, а не «вы уверены?»: диалог с одной кнопкой
                подтверждается не глядя, а перепечатать название нельзя
                машинально — приходится посмотреть, что именно удаляешь. */}
            <label
              htmlFor={`confirm-${productId}`}
              className="mt-5 mb-1.5 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
            >
              Type <span className="font-semibold text-zinc-950 dark:text-zinc-50">{title}</span> to
              confirm
            </label>
            <input
              id={`confirm-${productId}`}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              className="w-full rounded-2xl border border-zinc-950/[0.08] bg-transparent px-4 py-3 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/25 dark:border-zinc-50/[0.08] dark:text-zinc-50"
            />

            {error && (
              <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  setTyped("");
                  setError(null);
                }}
                className={`${BUTTON_PILL} text-zinc-600 hover:bg-zinc-950/[0.05] dark:text-zinc-400 dark:hover:bg-zinc-50/[0.06]`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => send("delete")}
                disabled={pending || !titleMatches}
                className={`${BUTTON_PILL} bg-red-600 text-white hover:bg-red-700`}
              >
                {pending ? "Deleting…" : "Delete forever"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
