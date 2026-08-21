import type { SupabaseClient } from "@supabase/supabase-js";

// Профиль пользователя, каким его показывает/редактирует сайт. Граница
// БД↔домен, как rowToProduct: снаружи camelCase, в БД snake_case.
export type Profile = {
  /**
   * ЕДИНСТВЕННОЕ имя человека: логин, адрес профиля /@<username> и то,
   * что видно везде. Уникально без учёта регистра, хранится как введено.
   * Менять можно раз в 30 дней (guard_username_change).
   */
  username: string;
  /**
   * Когда username меняли в последний раз; null — ни разу.
   * Менять можно раз в 30 дней, и стережёт это триггер
   * guard_username_change (миграция 20260821140000), а не форма.
   * Форме дата нужна, чтобы сказать «до какого числа нельзя», ДО того
   * как человек нажмёт «Сохранить» и получит отказ.
   */
  usernameChangedAt: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  /** Текст «о себе» на публичной странице /@<username>. */
  bio: string | null;
  /**
   * Цвет ника (#rrggbb) или null. Ставить его вправе только купивший —
   * и решает это триггер protect_name_color в базе, а не форма:
   * запись из браузера идёт прямо в profiles, минуя наш код.
   */
  nameColor: string | null;
  /** Купил ли что-нибудь — от этого зависит, показывать ли выбор цвета. */
  isClient: boolean;
};

// Читает строку profiles текущего пользователя. Клиент передаётся снаружи
// (серверный, под сессией пользователя) — RLS "own profile read" отдаёт
// только свою строку, так что отдельной проверки прав тут не нужно.
export async function readProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "username, username_changed_at, first_name, last_name, avatar_url, bio, name_color"
    )
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(`Не удалось загрузить профиль: ${error.message}`);
  if (!data) return null;

  // «Покупал ли» спрашиваем ту же функцию, что и публичный профиль
  // (миграция 20260820130000), а не считаем заказы здесь: два ответа на
  // один вопрос рано или поздно разъезжаются, и тогда человек видит
  // выбор цвета, который база ему не даст сохранить.
  const { data: clientFlag } = await supabase.rpc("profile_is_client", {
    p_user_id: userId,
  });

  return {
    username: data.username,
    usernameChangedAt: data.username_changed_at ?? null,
    firstName: data.first_name,
    lastName: data.last_name,
    avatarUrl: data.avatar_url,
    bio: data.bio ?? null,
    nameColor: data.name_color ?? null,
    isClient: Boolean(clientFlag),
  };
}
