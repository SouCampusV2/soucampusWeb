"use client";

import { useEffect, useState } from "react";
import { Check, LinkSimple } from "@phosphor-icons/react";
import { BUTTON_COLORS, BUTTON_PILL } from "@/components/Button";

// «Copy link» на странице работы и поста — чтобы кинуть адрес в Discord
// и получить карточку (src/lib/share.ts).
//
// Адрес собирается из window.location.origin, а не из SITE_URL: на preview
// кнопка обязана копировать ссылку на preview — страницы, которой ещё нет
// на проде, там просто не существует. На проде origin и есть прод.
//
// Путь приходит пропом, а не из location.pathname: в адресе мог остаться
// хвост (?from=home, #якорь), и в Discord он уехал бы вместе со ссылкой.

const RESET_MS = 2000;

export function CopyLinkButton({ path }: { path: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  // «Copied» гаснет сам: кнопка должна быть готова к следующему нажатию.
  useEffect(() => {
    if (state === "idle") return;
    const timer = setTimeout(() => setState("idle"), RESET_MS);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      setState("copied");
    } catch {
      // Буфер обмена недоступен (не https, запрет браузера) — говорим об
      // этом, а не делаем вид, что скопировали.
      setState("failed");
    }
  }

  const Icon = state === "copied" ? Check : LinkSimple;

  return (
    <button
      type="button"
      onClick={copy}
      className={`${BUTTON_PILL} ${BUTTON_COLORS.secondary}`}
    >
      <Icon size={16} weight="bold" aria-hidden />
      {state === "copied" ? "Copied" : state === "failed" ? "Couldn't copy" : "Copy link"}
      {/* Объявление для экранного диктора: смена подписи сама по себе не озвучивается. */}
      <span className="sr-only" aria-live="polite">
        {state === "copied" ? "Link copied" : ""}
      </span>
    </button>
  );
}
