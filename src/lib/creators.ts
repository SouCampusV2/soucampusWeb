import { getSupabase } from "@/lib/supabase";

// Публичный профиль пользователя — то, что видно на /creator/[handle].
// Читается из представления public_profiles (см. миграцию
// 20260727130000_creators.sql): сама таблица profiles закрыта RLS
// «только своя строка», наружу отдаётся ровно безопасный поднабор
// колонок. Личные поля (имя/фамилия/discord) сюда не попадают вовсе.
export type Creator = {
  id: string;
  /**
   * Как человека видно: "SouCampus". МОЖЕТ ПОВТОРЯТЬСЯ — с 2026-08-21
   * уникальности у ника нет, различает людей username.
   */
  displayName: string;
  /**
   * Адрес профиля и логин: /creator/soucampus. Отдельная колонка с
   * 20260821120000; до неё считался из ника на лету, и оттого смена
   * ника ломала все ссылки на профиль.
   */
  handle: string;
  avatarUrl: string | null;
  bio: string | null;
  /**
   * Галочка. Ей же сейчас управляется единственная привилегия витрины —
   * кнопка «Order a custom build» (приём заказов пока только у бренда).
   */
  isVerified: boolean;
  /**
   * Есть ли право выкладывать карты. Отличает креатора от обычного
   * участника в шапке профиля — до этого обе роли выглядели одинаково.
   */
  isCreator: boolean;
  /**
   * Что-то покупал. Считается на лету поверх закрытых заказов
   * (profile_is_client, миграция 20260820130000) — наружу приходит
   * только «да/нет», без единой строки чужого заказа.
   */
  isClient: boolean;
  /** Цвет ника (#rrggbb) — привилегия купивших. null = обычный ник. */
  nameColor: string | null;
};

type CreatorRow = {
  id: string;
  /** Из 20260821120000; у баз без неё колонки нет — см. fallback ниже. */
  username?: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  /** Появилась в представлении миграцией 20260811120000; у старых баз её нет. */
  is_creator?: boolean | null;
  /** Обе — из 20260820130000; до неё представление их не отдаёт. */
  is_client?: boolean | null;
  name_color?: string | null;
};

/**
 * Адрес профиля.
 *
 * ⚠️ Принимает username, а НЕ ник. До 2026-08-21 здесь стоял
 * `toHandle(displayName)` — ник, приведённый к нижнему регистру, — и это
 * была главная причина, по которой ник нельзя было менять: смена уносила
 * с собой адрес профиля, а освободившееся имя мог занять кто угодно.
 * Теперь адрес — собственная колонка, и от подписи он не зависит.
 *
 * encodeURIComponent оставлен нарочно, хотя ограничение
 * profiles_username_format уже не пускает в username ничего, кроме
 * [a-z0-9_]: экранирование того, что и так безопасно, ничего не стоит,
 * а полагаться на то, что ограничение в базе никогда не ослабят, —
 * стоит. Сюда значение приезжает из БД, то есть это ввод пользователя.
 */
export function creatorHref(handle: string): string {
  return `/creator/${encodeURIComponent(handle)}`;
}

function rowToCreator(row: CreatorRow): Creator {
  return {
    id: row.id,
    displayName: row.display_name,
    // Фоллбэк на ник — только для базы без миграции 20260821120000.
    // Совпадает со старым поведением, поэтому ссылки там не ломаются.
    handle: row.username ?? row.display_name.toLowerCase(),
    avatarUrl: row.avatar_url,
    bio: row.bio,
    isVerified: row.is_verified,
    isCreator: Boolean(row.is_creator),
    isClient: Boolean(row.is_client),
    nameColor: isHexColor(row.name_color) ? row.name_color : null,
  };
}

// Цвет едет в атрибут style, поэтому форма проверяется ещё раз здесь, а
// не только ограничением в базе. Правило то же, что у ссылок в
// уведомлениях (safeHref): значение из базы — это всё-таки ввод
// пользователя, и доверять ему на выходе так же нельзя, как на входе.
// Одна проверка в БД и одна на границе домена — не дублирование, а два
// разных рубежа: база стережёт запись, это — вывод.
export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}

const CREATOR_FIELDS =
  "id, username, display_name, avatar_url, bio, is_verified, is_creator, name_color, is_client";

// Тот же набор без is_creator — запасной путь, пока миграция
// 20260811120000 не прогнана. PostgREST на незнакомую колонку отвечает
// ошибкой и НЕ отдаёт строки вовсе, то есть профили и авторы на
// карточках витрины исчезли бы целиком из-за одной подписи под ником.
// Тот же принцип, что у PRODUCT_FIELDS_NO_IMAGES в products.ts.
const CREATOR_FIELDS_NO_ROLE = "id, display_name, avatar_url, bio, is_verified";

function isMissingRole(message: string): boolean {
  // Любая из трёх колонок, добавленных представлению позже: PostgREST на
  // незнакомую отвечает ошибкой и не отдаёт строк ВООБЩЕ, то есть авторы
  // на карточках витрины исчезли бы целиком из-за одной подписи.
  return (
    message.includes("is_creator") ||
    message.includes("is_client") ||
    message.includes("name_color") ||
    message.includes("username")
  );
}

// Ошибку чтения профилей глушим и отдаём пустоту вместо исключения: пока
// миграция не прогнана, представления public_profiles ещё нет, и падать
// из-за этого не должны ни сборка, ни витрина (тот же принцип, что у
// get_product_stats и product_images).
function warn(message: string) {
  console.warn(`public_profiles недоступно: ${message}`);
}

export async function getAllCreators(): Promise<Creator[]> {
  const query = (fields: string) =>
    getSupabase().from("public_profiles").select(fields);

  let { data, error } = await query(CREATOR_FIELDS);
  if (error && isMissingRole(error.message)) {
    ({ data, error } = await query(CREATOR_FIELDS_NO_ROLE));
  }

  if (error) {
    warn(error.message);
    return [];
  }
  return ((data ?? []) as unknown as CreatorRow[]).map(rowToCreator);
}

export async function getCreatorByHandle(handle: string): Promise<Creator | null> {
  // eq по username, а не ilike по нику. Раньше сравнивали
  // регистронезависимо, потому что хэндл считался из ника; теперь
  // username хранится уже строчным (ограничение profiles_username_format),
  // и точное сравнение — не придирчивость, а единственно верный вариант:
  // ilike заставил бы базу игнорировать уникальный индекс.
  //
  // Адрес приводим к нижнему регистру сами: /creator/SouCampus набирают
  // руками и присылают в ссылках, и отдавать за это 404 было бы
  // придиркой к посетителю.
  const query = (fields: string) =>
    getSupabase()
      .from("public_profiles")
      .select(fields)
      .eq("username", handle.toLowerCase())
      .maybeSingle();

  let { data, error } = await query(CREATOR_FIELDS);
  if (error && isMissingRole(error.message)) {
    // База без 20260821120000: username там нет, и хэндл — это ник.
    ({ data, error } = await getSupabase()
      .from("public_profiles")
      .select(CREATOR_FIELDS_NO_ROLE)
      .ilike("display_name", handle)
      .maybeSingle());
  }

  if (error) {
    warn(error.message);
    return null;
  }
  return data ? rowToCreator(data as unknown as CreatorRow) : null;
}

// Карта id → профиль. Нужна витрине: карточка товара показывает автора,
// а связать products.creator_id с профилем вложенной выборкой PostgREST
// нельзя — внешний ключ ведёт на закрытую RLS таблицу profiles, и анониму
// такая связь вернула бы null. Поэтому профили берутся отдельным
// запросом (их немного) и подмешиваются на нашей стороне.
export async function getCreatorsById(): Promise<Map<string, Creator>> {
  const creators = await getAllCreators();
  return new Map(creators.map((c) => [c.id, c]));
}
