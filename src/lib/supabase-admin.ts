import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Подключение под служебным ключом (service_role). В отличие от
// публичного клиента в supabase.ts, этот ключ ОБХОДИТ RLS — он может
// всё. Нужен, чтобы писать в page_views: таблица закрыта для анонима
// наглухо, и это правильно (иначе публично отображаемый счётчик
// накручивался бы парой строк в консоли браузера).
//
// Три вещи, которые делают этот файл безопасным:
//
// 1. Переменная НЕ имеет префикса NEXT_PUBLIC_. Next.js подставляет в
//    браузерный бандл только переменные с этим префиксом — то есть ключ
//    физически не может уехать на клиент, даже по ошибке.
// 2. Проверка ниже: если этот модуль каким-то образом окажется в
//    браузере, он упадёт сразу и громко, а не утечёт молча.
// 3. Клиент создаётся лениво — импорт файла сам по себе ничего не
//    требует, как и в supabase.ts.
// SupabaseClient, а не ReturnType<typeof createClient>: во втором случае
// TypeScript выводит схему БД как `never` (мы не генерировали типы из
// базы), и любое обращение к колонке становится ошибкой. Здесь дженерик
// остаётся значением по умолчанию — форму строк мы описываем сами,
// в ProjectRow/StatRow и подобных.
let client: SupabaseClient | null = null;

export function getSupabaseAdmin() {
  if (typeof window !== "undefined") {
    throw new Error(
      "getSupabaseAdmin() вызван в браузере. Служебный ключ обходит RLS " +
        "и должен использоваться только на сервере (route handlers, серверные компоненты)."
    );
  }

  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Не задан SUPABASE_SERVICE_ROLE_KEY (или NEXT_PUBLIC_SUPABASE_URL). " +
        "См. .env.example — ключ берётся в Supabase → Settings → API Keys → Reveal."
    );
  }

  client = createClient(url, serviceKey, {
    // Служебному клиенту сессии не нужны: он не представляет никакого
    // пользователя и живёт ровно один запрос.
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
