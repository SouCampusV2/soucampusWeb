"use client";

import { useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { Eye } from "@phosphor-icons/react";

// Плашка над профилем в режиме «View as visitor» (?view=visitor, 24.11):
// напоминает, что кнопки владельца спрятаны нарочно, и ведёт обратно.
// Адрес читаем через useSyncExternalStore: на сервере режима нет (false),
// в браузере — из location.search; страница статическая, без Suspense.
const subscribe = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  return () => window.removeEventListener("popstate", onChange);
};
const isVisitorView = () => new URLSearchParams(window.location.search).get("view") === "visitor";

export function VisitorViewBanner() {
  const pathname = usePathname();
  const on = useSyncExternalStore(subscribe, isVisitorView, () => false);
  if (!on) return null;
  return (
    <div className="mx-auto mb-6 flex max-w-6xl flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900 dark:border-orange-900/50 dark:bg-orange-950/40 dark:text-orange-100">
      <span className="flex items-center gap-2">
        This is how other people see your profile.
        <Eye size={18} weight="bold" aria-hidden />
      </span>
      {/* <a>, а не Link: кнопки владельца вернутся только с перезагрузкой. */}
      <a href={pathname} className="font-semibold underline decoration-2 underline-offset-4">
        Back to your view
      </a>
    </div>
  );
}
