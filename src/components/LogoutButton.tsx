"use client";

import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { Button } from "@/components/Button";

// Кнопка выхода для страницы профиля. Клиентская — signOut живёт в
// браузере (чистит cookie сессии), после чего router.refresh перечитывает
// серверные компоненты и push уводит в магазин.
export function LogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();
    router.refresh();
    router.push("/marketplace");
  }

  return (
    <Button variant="secondary" onClick={handleLogout} className="gap-2">
      Log out
      <SignOut size={18} />
    </Button>
  );
}
