import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Кто имеет право разбирать очередь модерации.
//
// Проверка ТОЛЬКО серверная и всегда прямо перед действием — у админки
// нет ни одного клиентского гейта, на который можно было бы положиться
// (тот же принцип, что у CreatorOwnerActions: показ кнопки — это UX,
// а не защита).
//
// Читаем флаг служебным ключом, а не сессией пользователя: колонка
// is_admin живёт в profiles, у которой RLS «только своя строка». Свою
// строку пользователь прочитать может, так что технически хватило бы и
// сессии — но тогда право админа зависело бы от политики RLS, которую
// однажды поменяют по другому поводу. Служебный ключ делает источник
// правды однозначным.
//
// ЗДЕСЬ СОЗНАТЕЛЬНО ОСТАЁТСЯ getUser(), а не getCurrentUser() (2026-08-09).
// Страницы кабинета переведены на getClaims() ради скорости: он проверяет
// подпись токена локально, без похода в Supabase (см. lib/current-user.ts).
// Гарантия подлинности там та же, но есть разница, которая для админки
// существенна: локальная проверка подтверждает, что токен НАШ и не истёк,
// и ничего не знает про отзыв. Разлогинился, увели ноутбук, отобрали
// доступ — выданный токен всё равно останется годным до конца своего
// срока. Для «моих покупок» это приемлемо, для права публиковать чужие
// карты — нет. getUser() спрашивает сервер и видит отзыв сразу; лишний
// сетевой поход на одной служебной странице владельца того стоит.

export type AdminUser = {
  id: string;
  email: string | null;
};

/**
 * Текущий пользователь, если он админ. null — не залогинен ИЛИ не админ.
 *
 * Намеренно не различает эти два случая для вызывающего кода: страница
 * админки на оба отвечает 404, чтобы её существование нельзя было
 * нащупать по разнице ответов.
 */
export async function getAdminUser(): Promise<AdminUser | null> {
  // Наружу все отказы выглядят одинаково (404), и это правильно. Но в
  // ЛОГ СЕРВЕРА причину пишем разборчиво: без этого «не пускает» —
  // неотличимо от «сломалось», и чинить приходится вслепую.
  const deny = (why: string) => {
    console.warn(`[admin] доступ не выдан: ${why}`);
    return null;
  };

  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return deny("в этом браузере нет сессии — сначала войти на /login");

  let data: { is_admin: boolean } | null = null;
  try {
    const result = await getSupabaseAdmin()
      .from("profiles")
      .select("is_admin")
      .eq("id", user.id)
      .maybeSingle();

    if (result.error) {
      // Колонки нет — значит миграция модерации не прогнана в ЭТОЙ базе.
      // Частый случай: код смотрит в preview, а миграцию прогнали на прод.
      const hint = result.error.message.includes("is_admin")
        ? " — похоже, миграция 20260730140000_moderation не прогнана в базе, на которую смотрит .env.local"
        : "";
      return deny(`запрос profiles.is_admin не удался: ${result.error.message}${hint}`);
    }
    data = result.data as { is_admin: boolean } | null;
  } catch (err) {
    // getSupabaseAdmin бросает, если нет SUPABASE_SERVICE_ROLE_KEY.
    return deny(err instanceof Error ? err.message : "служебный клиент недоступен");
  }

  if (!data) return deny(`у пользователя ${user.email} нет строки в profiles`);
  if (!data.is_admin) {
    return deny(
      `у пользователя ${user.email} is_admin = false. ` +
        "Проверить: select p.display_name, p.is_admin from profiles p join auth.users u on u.id = p.id where u.email = '" +
        user.email +
        "';"
    );
  }

  return { id: user.id, email: user.email ?? null };
}
