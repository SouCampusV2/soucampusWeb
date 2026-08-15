"use client";

import { useRouter } from "next/navigation";
import { useRefresh } from "@/lib/useRefresh";
import { SignOut } from "@phosphor-icons/react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { Button } from "@/components/Button";

// Кнопка выхода для страницы профиля. Клиентская — signOut живёт в
// браузере (чистит cookie сессии), после чего router.refresh перечитывает
// серверные компоненты и push уводит в магазин.
export function LogoutButton() {
  const router = useRouter();
  const refresh = useRefresh();

  async function handleLogout() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    refresh();
    router.push("/marketplace");
  }

  return (
    <Button variant="secondary" onClick={handleLogout} className="gap-2">
      Log out
      <SignOut size={18} />
    </Button>
  );
}
