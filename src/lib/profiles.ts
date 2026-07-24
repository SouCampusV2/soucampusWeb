import type { SupabaseClient } from "@supabase/supabase-js";

// Профиль пользователя, каким его показывает/редактирует сайт. Граница
// БД↔домен, как rowToProduct: снаружи camelCase, в БД snake_case.
export type Profile = {
  displayName: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
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
    .select("display_name, first_name, last_name, avatar_url")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(`Не удалось загрузить профиль: ${error.message}`);
  if (!data) return null;

  return {
    displayName: data.display_name,
    firstName: data.first_name,
    lastName: data.last_name,
    avatarUrl: data.avatar_url,
  };
}
