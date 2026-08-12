import { getSupabase } from "@/lib/supabase";

// Публичный профиль пользователя — то, что видно на /creator/[handle].
// Читается из представления public_profiles (см. миграцию
// 20260727130000_creators.sql): сама таблица profiles закрыта RLS
// «только своя строка», наружу отдаётся ровно безопасный поднабор
// колонок. Личные поля (имя/фамилия/discord) сюда не попадают вовсе.
export type Creator = {
  id: string;
  /** Публичный ник, как его ввёл пользователь: "SouCampus". */
  displayName: string;
  /** Он же в адресе — ник в нижнем регистре: /creator/soucampus. */
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
};

type CreatorRow = {
  id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean;
  /** Появилась в представлении миграцией 20260811120000; у старых баз её нет. */
  is_creator?: boolean | null;
};

// Хэндл = ник в нижнем регистре. Ники уникальны РЕГИСТРОНЕЗАВИСИМО
// (уникальный индекс по lower(display_name)), поэтому такое отображение
// однозначно: двух профилей с одинаковым хэндлом быть не может.
export function toHandle(displayName: string): string {
  return displayName.toLowerCase();
}

export function creatorHref(displayName: string): string {
  // encodeURIComponent — ник может содержать пробел или юникод, а он
  // едет в адрес.
  return `/creator/${encodeURIComponent(toHandle(displayName))}`;
}

function rowToCreator(row: CreatorRow): Creator {
  return {
    id: row.id,
    displayName: row.display_name,
    handle: toHandle(row.display_name),
    avatarUrl: row.avatar_url,
    bio: row.bio,
    isVerified: row.is_verified,
    isCreator: Boolean(row.is_creator),
  };
}

const CREATOR_FIELDS = "id, display_name, avatar_url, bio, is_verified, is_creator";

// Тот же набор без is_creator — запасной путь, пока миграция
// 20260811120000 не прогнана. PostgREST на незнакомую колонку отвечает
// ошибкой и НЕ отдаёт строки вовсе, то есть профили и авторы на
// карточках витрины исчезли бы целиком из-за одной подписи под ником.
// Тот же принцип, что у PRODUCT_FIELDS_NO_IMAGES в products.ts.
const CREATOR_FIELDS_NO_ROLE = "id, display_name, avatar_url, bio, is_verified";

function isMissingRole(message: string): boolean {
  return message.includes("is_creator");
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
  // ilike без подстановочных знаков — это обычное сравнение, только
  // регистронезависимое: ровно то, что нужно, раз хэндл в адресе
  // строчный, а ник хранится как введён.
  const query = (fields: string) =>
    getSupabase()
      .from("public_profiles")
      .select(fields)
      .ilike("display_name", handle)
      .maybeSingle();

  let { data, error } = await query(CREATOR_FIELDS);
  if (error && isMissingRole(error.message)) {
    ({ data, error } = await query(CREATOR_FIELDS_NO_ROLE));
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
