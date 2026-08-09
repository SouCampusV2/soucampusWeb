import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

// Кто залогинен — для серверных страниц.
//
// ЗАЧЕМ ОТДЕЛЬНАЯ ФУНКЦИЯ, А НЕ ПРЯМОЙ auth.getUser()
//
// getUser() спрашивает сервер Supabase «этот токен настоящий?» — то есть
// уходит по сети на каждый вызов. А `proxy.ts` делает ровно то же самое
// на КАЖДЫЙ запрос сайта, до того как страница начнёт рендериться. В
// личном кабинете получалось два последовательных сетевых похода подряд
// ради одного и того же ответа. Пока функции жили в Вашингтоне, а база
// во Франкфурте, каждый стоил больше сотни миллисекунд — отсюда жалоба
// владельца на медленный кабинет (2026-08-08).
//
// getClaims() решает то же самое иначе: он проверяет ПОДПИСЬ токена
// криптографически, ключом из JWKS проекта, который кэшируется. Если у
// проекта включены асимметричные ключи подписи, проверка идёт локально,
// через WebCrypto, без сети вообще.
//
// Это НЕ ослабление проверки, и различие тут важное. Небезопасный путь —
// это getSession(): он просто разбирает cookie и верит написанному, а
// cookie подделывается. getClaims() математически проверяет, что токен
// выпущен нашим проектом и не истёк, — та же гарантия, что даёт getUser(),
// просто полученная без вопроса к серверу. Если же проект ещё на старом
// симметричном секрете, getClaims() сам сходит на сервер, как getUser(),
// то есть хуже не станет ни при каком раскладе.
//
// ⚠️ Чтобы выигрыш реально был, у проекта Supabase должны быть включены
// асимметричные ключи: Dashboard → Project Settings → JWT Keys → migrate.
// Без этого код работает так же, но по сети.
//
// cache() — дедупликация в пределах ОДНОГО рендера: если страница и её
// вложенный компонент спросят пользователя, запрос выполнится один раз.
// Между разными запросами ничего не хранится.

export type CurrentUser = {
  id: string;
  email: string | null;
  /** Ник из user_metadata — им заполняется профиль при первом входе. */
  displayName: string | null;
};

export const getCurrentUser = cache(async function getCurrentUser(
  supabase: SupabaseClient
): Promise<CurrentUser | null> {
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;

  const claims = data.claims as {
    sub?: string;
    email?: string;
    user_metadata?: { display_name?: string };
  };

  // sub — идентификатор пользователя в JWT. Без него токен бессмысленен,
  // и доверять ему нельзя.
  if (!claims.sub) return null;

  return {
    id: claims.sub,
    email: claims.email ?? null,
    displayName: claims.user_metadata?.display_name ?? null,
  };
});
