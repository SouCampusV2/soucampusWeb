"use client";

import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";

// Кнопка выхода для страницы профиля. Клиентская — signOut живёт в
// браузере (чистит cookie сессии), после чего router.refresh перечитывает
// серверные компоненты и push уводит в магазин.
export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/shop");
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      className="inline-flex h-12 cursor-pointer items-center justify-center gap-2 rounded-full border-2 border-orange-500 px-7 text-sm font-semibold text-orange-500 transition-colors hover:border-orange-600 hover:text-orange-600 active:scale-95 dark:border-orange-400 dark:text-orange-400 dark:hover:border-orange-500 dark:hover:text-orange-500 sm:h-14"
    >
      <SignOut size={18} />
      Log out
    </button>
  );
}
