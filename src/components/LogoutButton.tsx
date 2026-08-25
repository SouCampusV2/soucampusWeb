"use client";

import { SignOut } from "@phosphor-icons/react";
import { useLogout } from "@/lib/useLogout";
import { Button } from "@/components/Button";

// Кнопка выхода для страницы профиля. Клиентская — signOut живёт в
// браузере (чистит cookie сессии).
//
// Сам выход переехал в useLogout: он же был скопирован в Navbar, и
// правку «оставаться на той же странице» пришлось бы делать дважды.
export function LogoutButton() {
  const handleLogout = useLogout();

  return (
    <Button variant="secondary" onClick={handleLogout} className="gap-2">
      Log out
      <SignOut size={18} />
    </Button>
  );
}
