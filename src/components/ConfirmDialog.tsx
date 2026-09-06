"use client";

import { useEffect, useRef } from "react";
import { BUTTON_PILL, DANGER_COLORS } from "@/components/Button";

// Наше окно подтверждения — вместо confirm() браузера.
//
// ⚠️ Дело не в том, что стандартное окно не в нашем стиле. Диалоги
// браузера можно ЗАГЛУШИТЬ НАВСЕГДА: после нескольких подряд браузер
// предлагает «запретить этой странице создавать диалоги», и человек,
// однажды согласившийся, больше никогда их не увидит — а confirm() при
// этом молча возвращает false. Кнопка перестаёт срабатывать без единого
// следа, и починить это со стороны сайта нельзя. Ровно то состояние, из
// которого 23.08 вытаскивали удаление комментария; 25.08 по той же
// причине отсюда убрали alert(). Способ спросить и способ сообщить не
// должны уметь отключаться мимо нас.
//
// Почему компонент, а не хук (в отличие от useDismiss, где мы решили
// наоборот). У выпадашек общим было ПОВЕДЕНИЕ, а разметка у каждой своя
// — потому и хук. Здесь наоборот: разметка одна и та же во всех случаях
// (затемнение, карточка, заголовок, два действия), а различается только
// текст. Общим делаем то, что действительно общее.
//
// Два самодельных диалога — в CatalogActions и ResourceActions — этот
// компонент НЕ переписывает. У них подтверждение вводом названия карты,
// то есть своё поле и своя проверка; они принимают children и могут
// переехать сюда отдельной правкой, когда до них дойдут руки. Здесь
// сознательно закрыт только простой случай «да/нет».

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Cancel",
  danger = false,
  pending = false,
  error,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel: string;
  cancelLabel?: string;
  /** Красная кнопка подтверждения — для действий, которые что-то убирают. */
  danger?: boolean;
  pending?: boolean;
  error?: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Esc закрывает, как у всех выпадашек на сайте. Слушатель вешается
  // только пока окно открыто: висящий постоянно перехватывал бы Esc у
  // страницы под ним.
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  // Фокус переезжает на кнопку подтверждения, иначе он остаётся на
  // кнопке под затемнением: Tab уводил бы в невидимую часть страницы, а
  // чтение с экрана продолжало бы читать её.
  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      // Клик по затемнению = отмена. Проверка на currentTarget
      // обязательна: без неё клик по самой карточке всплывал бы сюда и
      // закрывал окно, до которого человек только что дотянулся.
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-md rounded-3xl border border-zinc-200 bg-[#fbfbff] p-6 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
          {title}
        </h2>

        {description && (
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {description}
          </p>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className={`${BUTTON_PILL} text-zinc-600 hover:bg-zinc-950/[0.05] dark:text-zinc-400 dark:hover:bg-zinc-50/[0.06]`}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`${BUTTON_PILL} ${
              danger ? DANGER_COLORS.solid : "bg-orange-500 text-zinc-950 hover:bg-orange-400"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
