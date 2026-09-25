"use client";

import { useRouter, usePathname } from "next/navigation";
import { useRefresh } from "@/lib/useRefresh";

// Выход из аккаунта — один на все места, откуда выходят.
//
// ПОЧЕМУ ХУК, А НЕ ДВЕ КОПИИ. Их и было две: LogoutButton.tsx (кнопка на
// странице профиля) и Navbar.tsx (пункт в выпадашке). Один и тот же
// signOut + refresh + переход, набранные дважды. Проект это уже проходил
// семью копиями свечения и семью способами напечатать дату — чинили одну,
// остальные молча оставались прежними. Правку «оставаться на месте»
// пришлось бы делать в обоих файлах, и второй бы забыли.

// Адреса, на которых без аккаунта делать нечего: они либо уводят на
// /login, либо показывают чужое. Уходя отсюда, человека надо перевести.
//
// ⚠️ Список ПРЕФИКСОВ, а не точных адресов: /resources/<slug>/edit и
// /admin/comments должны попадать под правило вместе с корнем раздела.
const PERSONAL_PREFIXES = [
  "/settings",
  "/purchases",
  "/resources",
  "/notifications",
  "/welcome",
  "/creator",
  "/admin",
];

export function useLogout() {
  const router = useRouter();
  const refresh = useRefresh();
  const pathname = usePathname();

  return async function logout() {
    // Клиент — по требованию, а не импортом сверху: хук живёт в навбаре на
    // каждой странице, а выходят редко (см. useUser.ts, 25.09).
    const { createSupabaseBrowser } = await import("@/lib/supabase-browser");
    const supabase = createSupabaseBrowser();
    await supabase.auth.signOut();

    // ⚠️ ОСТАЁМСЯ НА МЕСТЕ (просьба владельца 25.08). Раньше выход всегда
    // уводил в каталог — то есть человек, вышедший со страницы карты,
    // терял страницу, которую читал, и должен был искать её заново.
    // Выход — это смена того, КЕМ ты смотришь, а не того, ЧТО ты
    // смотришь.
    //
    // Исключение — личные разделы: остаться на /purchases без аккаунта
    // нельзя, там нечего показывать. Оттуда уводим в каталог, как
    // раньше.
    const personal = PERSONAL_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (personal) {
      router.push("/marketplace");
    } else {
      // refresh, а не reload: серверные компоненты перечитываются с новой
      // (пустой) сессией, навбар меняется на гостевой, а прокрутка и
      // состояние страницы остаются на месте.
      refresh();
    }
  };
}
