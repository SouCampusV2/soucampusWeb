import type { SupabaseClient } from "@supabase/supabase-js";
import { parseProfileLinks, type ProfileLink } from "@/lib/profile-links";

// Профиль пользователя, каким его показывает/редактирует сайт. Граница
// БД↔домен, как rowToProduct: снаружи camelCase, в БД snake_case.
export type Profile = {
  /**
   * ЕДИНСТВЕННОЕ имя человека: логин, адрес профиля /@<username> и то,
   * что видно везде. Уникально без учёта регистра, хранится как введено.
   * Менять можно раз в USERNAME_COOLDOWN_DAYS дней (guard_username_change).
   */
  username: string;
  /**
   * Когда username меняли в последний раз; null — ни разу.
   * Менять можно раз в USERNAME_COOLDOWN_DAYS дней, и стережёт это
   * триггер guard_username_change (интервал задан в миграции
   * 20260906130000), а не форма.
   *
   * ⚠️ Числом здесь не писать. 06.09 пауза стала 14 дней вместо 30, и
   * три комментария подряд остались с прежней цифрой — нашёл
   * еженедельный отчёт. Это ровно то, что RULES.md называет «комментарий,
   * объясняющий снятое ограничение, опаснее отсутствующего».
   * Форме дата нужна, чтобы сказать «до какого числа нельзя», ДО того
   * как человек нажмёт «Сохранить» и получит отказ.
   */
  usernameChangedAt: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  /** Баннер над шапкой профиля (20261025130000); null — нет. */
  bannerUrl: string | null;
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
  /** Discord, X и прочее под именем (20261026120000); пусто — нет. */
  links: ProfileLink[];
};

// Читает строку profiles текущего пользователя. Клиент передаётся снаружи
// (серверный, под сессией пользователя) — RLS "own profile read" отдаёт
// только свою строку, так что отдельной проверки прав тут не нужно.
export async function readProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const query = (fields: string) =>
    supabase.from("profiles").select(fields).eq("id", userId).maybeSingle();

  const BASE =
    "username, username_changed_at, first_name, last_name, avatar_url, bio, name_color";

  // banner_url — из 20261025130000, links — из 20261026120000. Пока база
  // их не знает, PostgREST не отдаёт строку вовсе, и /settings падал бы
  // целиком из-за одного поля. Ступени по одной колонке: незнакомые links
  // не должны уносить с собой уже известный баннер.
  let { data, error } = await query(`${BASE}, banner_url, links`);
  if (error?.message.includes("links")) {
    ({ data, error } = await query(`${BASE}, banner_url`));
  }
  if (error?.message.includes("banner_url")) {
    ({ data, error } = await query(BASE));
  }

  if (error) throw new Error(`Не удалось загрузить профиль: ${error.message}`);
  if (!data) return null;
  const row = data as unknown as {
    username: string;
    username_changed_at: string | null;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    bio: string | null;
    name_color: string | null;
    banner_url?: string | null;
    links?: unknown;
  };

  // «Покупал ли» спрашиваем ту же функцию, что и публичный профиль
  // (миграция 20260820130000), а не считаем заказы здесь: два ответа на
  // один вопрос рано или поздно разъезжаются, и тогда человек видит
  // выбор цвета, который база ему не даст сохранить.
  const { data: clientFlag } = await supabase.rpc("profile_is_client", {
    p_user_id: userId,
  });

  return {
    username: row.username,
    usernameChangedAt: row.username_changed_at ?? null,
    firstName: row.first_name,
    lastName: row.last_name,
    avatarUrl: row.avatar_url,
    bannerUrl: row.banner_url ?? null,
    bio: row.bio ?? null,
    nameColor: row.name_color ?? null,
    isClient: Boolean(clientFlag),
    links: parseProfileLinks(row.links),
  };
}

/**
 * Сколько дней имя заперто после смены (`guard_username_change`).
 *
 * ⚠️ Настоящее правило — в триггере, здесь копия для интерфейса: формам
 * нужно назвать срок ДО нажатия «Сохранить», а ходить за ним в базу ради
 * подписи под полем дороже, чем держать число рядом. Разъедутся — сайт
 * покажет неверную дату, но лишней смены база всё равно не пропустит.
 *
 * Жило в ProfileEditForm.tsx, пока форм с этим правилом была одна. С
 * появлением /welcome их стало две, и вторая вписала «30 days» руками —
 * то есть ровно тот случай, ради которого константы и выносят.
 */
export const USERNAME_COOLDOWN_DAYS = 14;
