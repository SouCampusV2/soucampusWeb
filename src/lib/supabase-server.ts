import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Клиент Supabase для СЕРВЕРНОГО кода: серверные компоненты, route
// handlers, server actions.
//
// Он читает сессию пользователя из cookie запроса — поэтому знает, кто
// залогинен, и его запросы идут под правами этого пользователя (RLS), а
// не анонима. Это НЕ то же самое, что supabase-admin.ts: тот обходит RLS
// служебным ключом и не представляет никакого пользователя.
//
// cookies() в Next 16 асинхронный — отсюда await (см. api/view/route.ts,
// там тот же await cookies()).
export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // cookieStore.set() бросает, если вызван из серверного
            // компонента (там ответ уже нельзя менять). Это ожидаемо и
            // безопасно: фактическое обновление cookie сессии берёт на
            // себя proxy.ts на каждый запрос. Здесь молча игнорируем.
          }
        },
      },
    }
  );
}
