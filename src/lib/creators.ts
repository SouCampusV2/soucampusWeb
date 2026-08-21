import { getSupabase } from "@/lib/supabase";

// Публичный профиль пользователя — то, что видно на /@<username>.
// Читается из представления public_profiles (см. миграцию
// 20260727130000_creators.sql): сама таблица profiles закрыта RLS
// «только своя строка», наружу отдаётся ровно безопасный поднабор
// колонок. Личные поля (имя/фамилия/discord) сюда не попадают вовсе.
export type Creator = {
  id: string;
  /**
   * ЕДИНСТВЕННОЕ имя человека: "SouCampus". Оно же логин, оно же адрес
   * профиля, оно же то, что видно везде. Уникально без учёта регистра.
   *
   * Двух имён у профиля было ровно полдня (20260821120000 разделила ник
   * и адрес, 20260821150000 свела обратно): свободная повторяемая
   * подпись давала «10000 SouCampus», а мелкий хэндл под крупным именем
   * не читает никто.
   */
  username: string;
  /**
   * Оно же в нижнем регистре — для адреса /@soucampus и для поиска.
   * Приезжает из вычисляемой колонки username_lower, а не считается
   * здесь: сравнение должно попадать в индекс.
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
  username: string;
  /** Вычисляемая базой lower(username) — 20260821150000. */
  username_lower?: string | null;
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
 * Адрес профиля: /@soucampus.
 *
 * ⚠️ Принимает handle — имя в НИЖНЕМ регистре. Само имя хранится как
 * введено ("SouCampus"), но адрес строчный: два адреса на один профиль
 * поисковику незачем.
 *
 * Почему `/@`, а не `/creator/`: адрес называл РОЛЬ, а роль меняется —
 * сегодня клиент, завтра автор, — профиль же остаётся тем же. Старый
 * адрес живёт редиректом в next.config.ts (тот же приём, что у
 * /shop → /marketplace).
 *
 * ⚠️ В файловой системе маршрут лежит по пути /u/[username], а не по
 * `@`: в App Router папка, начинающаяся с @, — это параллельный слот,
 * а не сегмент адреса. Красивый адрес даёт rewrite в next.config.ts.
 *
 * encodeURIComponent оставлен нарочно, хотя ограничение
 * profiles_username_format уже не пускает в имя ничего, кроме
 * [A-Za-z0-9_]: экранирование того, что и так безопасно, ничего не
 * стоит, а полагаться на то, что ограничение в базе никогда не ослабят,
 * — стоит. Сюда значение приезжает из БД, то есть это ввод пользователя.
 */
export function creatorHref(handle: string): string {
  return `/@${encodeURIComponent(handle)}`;
}

function rowToCreator(row: CreatorRow): Creator {
  return {
    id: row.id,
    username: row.username,
    // Фоллбэк на само имя — не «на всякий случай», а на один конкретный
    // случай: username_lower считает база, и у строки, вставленной до
    // 20260821150000 в открытой вкладке, её ещё может не быть в кэше
    // схемы PostgREST. lower() здесь даёт ровно то же значение.
    handle: (row.username_lower ?? row.username).toLowerCase(),
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
  "id, username, username_lower, avatar_url, bio, is_verified, is_creator, name_color, is_client";

// Тот же набор без is_creator — запасной путь, пока миграция
// 20260811120000 не прогнана. PostgREST на незнакомую колонку отвечает
// ошибкой и НЕ отдаёт строки вовсе, то есть профили и авторы на
// карточках витрины исчезли бы целиком из-за одной подписи под ником.
// Тот же принцип, что у PRODUCT_FIELDS_NO_IMAGES в products.ts.
const CREATOR_FIELDS_NO_ROLE = "id, username, avatar_url, bio, is_verified";

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
  // eq по username_lower — вычисляемой колонке (миграция 20260821150000).
  //
  // Само имя хранится КАК ВВЕДЕНО ("SouCampus"), потому что оно видимое,
  // а уникально оно без учёта регистра. Сравнивать поэтому надо
  // приведённые значения — но `where lower(username) = $1` из клиента не
  // выразить: PostgREST фильтрует только по колонкам. Остался бы ilike,
  // а он функциональный индекс не использует и читал бы таблицу целиком
  // на каждый заход в профиль. Отсюда и колонка.
  //
  // Адрес приводим к нижнему регистру сами: /@SouCampus набирают руками
  // и присылают в ссылках, и отдавать за это 404 было бы придиркой.
  const query = (fields: string) =>
    getSupabase()
      .from("public_profiles")
      .select(fields)
      .eq("username_lower", handle.toLowerCase())
      .maybeSingle();

  let { data, error } = await query(CREATOR_FIELDS);
  if (error && isMissingRole(error.message)) {
    // База без части колонок представления: ищем по самому имени.
    // ilike без подстановочных знаков — обычное сравнение, только
    // регистронезависимое; индекс оно не использует, но это запасной
    // путь, а не рабочий.
    ({ data, error } = await getSupabase()
      .from("public_profiles")
      .select(CREATOR_FIELDS_NO_ROLE)
      .ilike("username", handle)
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
