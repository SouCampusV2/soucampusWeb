"use client";

import { useEffect, useState } from "react";
import { Plus, X } from "@phosphor-icons/react";
import { Button } from "@/components/Button";
import { PROFILE_LINK_ICONS } from "@/components/ProfileLinks";
import {
  checkProfileLink,
  PROFILE_LINK_KINDS,
  PROFILE_LINK_META,
  PROFILE_LINKS_MAX,
  type ProfileLink,
  type ProfileLinkKind,
} from "@/lib/profile-links";

// Окно правки ссылок на /settings (вечер 26.10, просьба владельца: восемь
// полей ввода прямо в форме — «некрасиво»). В форме остаётся строка с
// иконками и кнопка «Edit links»; сам редактор — здесь.
//
// Окно правит ЧЕРНОВИК. В форму список уходит только по «Done» и только
// целиком годным: каждая ссылка проверена той же checkProfileLink, что
// стоит при сохранении. «Cancel» и Escape закрывают окно и ничего не
// меняют — так закрытие окна никогда не портит то, что уже было в форме.
//
// Сохранить в базу всё равно надо кнопкой «Save changes» формы: окно —
// часть формы, а не отдельное сохранение. Два разных «сохранить» на одной
// странице путали бы, что уже записано, а что нет.

export function ProfileLinksDialog({
  value,
  onDone,
  onCancel,
}: {
  value: ProfileLink[];
  onDone: (links: ProfileLink[]) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState<ProfileLink[]>(value);
  // Ошибка у конкретной строки — по индексу; показывается под ней.
  const [errors, setErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function update(index: number, url: string) {
    setDraft((current) => current.map((link, i) => (i === index ? { ...link, url } : link)));
    setErrors((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
  }

  function add(kind: ProfileLinkKind) {
    setDraft((current) =>
      current.length >= PROFILE_LINKS_MAX ? current : [...current, { kind, url: "" }],
    );
  }

  function remove(index: number) {
    setDraft((current) => current.filter((_, i) => i !== index));
    // Индексы ниже удалённой строки сдвинулись — старые ошибки к ним
    // больше не относятся.
    setErrors({});
  }

  function done() {
    const next: ProfileLink[] = [];
    const found: Record<number, string> = {};
    draft.forEach((link, index) => {
      const checked = checkProfileLink(link.kind, link.url);
      if (checked.ok) next.push({ kind: link.kind, url: checked.url });
      else found[index] = checked.error;
    });
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }
    onDone(next);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Edit links"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/70 p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-3xl border border-zinc-200 bg-[#fbfbff] dark:border-zinc-800 dark:bg-zinc-950">
        <div className="flex items-start justify-between gap-4 p-5 pb-0 sm:p-6 sm:pb-0">
          <div>
            <h2 className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">Links</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              Up to {PROFILE_LINKS_MAX}, shown as icons on your profile.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-950/[0.05] dark:text-zinc-400 dark:hover:bg-zinc-50/[0.06]"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* Прокручивается только середина: шапка и кнопки окна всегда на
            виду, даже на телефоне с восемью ссылками. */}
        <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          {draft.length > 0 ? (
            <ul className="space-y-3">
              {draft.map((link, index) => {
                const IconFor = PROFILE_LINK_ICONS[link.kind];
                const meta = PROFILE_LINK_META[link.kind];
                return (
                  <li key={index}>
                    <div className="flex items-center gap-2">
                      <IconFor
                        size={20}
                        weight="fill"
                        className="shrink-0 text-zinc-500 dark:text-zinc-400"
                        aria-hidden
                      />
                      <input
                        type="text"
                        inputMode="url"
                        value={link.url}
                        onChange={(e) => update(index, e.target.value)}
                        placeholder={meta.placeholder}
                        aria-label={`${meta.label} link`}
                        aria-invalid={errors[index] ? true : undefined}
                        // Новая строка сразу ждёт ввода — за этим её и
                        // добавляли.
                        autoFocus={link.url === "" && index === draft.length - 1}
                        className={`min-w-0 flex-1 rounded-2xl border bg-transparent px-4 py-2.5 text-sm text-zinc-950 placeholder:text-zinc-400 focus:outline-none focus:ring-2 dark:text-zinc-50 dark:placeholder:text-zinc-500 ${
                          errors[index]
                            ? "border-red-400 focus:ring-red-500/25"
                            : "border-zinc-950/[0.08] focus:border-orange-500 focus:ring-orange-500/25 dark:border-zinc-50/[0.08]"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        aria-label={`Remove ${meta.label} link`}
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40"
                      >
                        <X size={16} aria-hidden />
                      </button>
                    </div>
                    {errors[index] && (
                      <p className="ml-7 mt-1 text-xs text-red-600 dark:text-red-400">
                        {errors[index]}
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No links yet.</p>
          )}

          {draft.length < PROFILE_LINKS_MAX && (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">Add</p>
              <div className="flex flex-wrap gap-1.5">
                {PROFILE_LINK_KINDS.map((kind) => {
                  const IconFor = PROFILE_LINK_ICONS[kind];
                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => add(kind)}
                      className="inline-flex items-center gap-1 rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-950 dark:border-zinc-800 dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-50"
                    >
                      <Plus size={12} aria-hidden />
                      <IconFor size={14} weight="fill" aria-hidden />
                      {PROFILE_LINK_META[kind].label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 border-t border-zinc-200 p-5 dark:border-zinc-800 sm:p-6">
          <Button type="button" variant="primary" onClick={done} className="flex-1">
            Done
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
