import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Заявки на статус креатора.
//
// До этого загрузить карту мог ЛЮБОЙ зарегистрированный: /creator/upload
// был открыт всем, и единственным фильтром была модерация каждой карты по
// отдельности. То есть спамера приходилось ловить заново на каждой
// заявке, вместо одного решения по человеку.
//
// Флаг profiles.is_creator существует с 24.07 и до сих пор нигде не
// использовался — вот его применение.

export type ApplicationStatus = "pending" | "approved" | "rejected";

export type CreatorApplication = {
  id: string;
  userId: string;
  portfolioUrl: string | null;
  discord: string | null;
  about: string;
  status: ApplicationStatus;
  rejectionReason: string | null;
  createdAt: string;
  decidedAt: string | null;
};

type Row = {
  id: string;
  user_id: string;
  portfolio_url: string | null;
  discord: string | null;
  about: string;
  status: ApplicationStatus;
  rejection_reason: string | null;
  created_at: string;
  decided_at: string | null;
};

function toApplication(row: Row): CreatorApplication {
  return {
    id: row.id,
    userId: row.user_id,
    portfolioUrl: row.portfolio_url,
    discord: row.discord,
    about: row.about,
    status: row.status,
    rejectionReason: row.rejection_reason,
    createdAt: row.created_at,
    decidedAt: row.decided_at,
  };
}

/**
 * Последняя заявка пользователя — под ЕГО сессией: политика
 * "read own application" отдаёт только свои строки, отдельной проверки
 * владения в коде не требуется.
 *
 * Последняя, а не единственная: отклонённых может накопиться сколько
 * угодно (отказали — исправился — подал снова), и человеку нужно видеть
 * актуальное состояние, а не первую попытку.
 */
export async function getOwnApplication(
  supabase: SupabaseClient,
  userId: string
): Promise<CreatorApplication | null> {
  const { data, error } = await supabase
    .from("creator_applications")
    .select(
      "id, user_id, portfolio_url, discord, about, status, rejection_reason, created_at, decided_at"
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Не роняем страницу настроек, пока миграция не прогнана.
    console.warn(`Заявка недоступна: ${error.message}`);
    return null;
  }
  return data ? toApplication(data as Row) : null;
}

/** Есть ли у человека право загружать карты. */
export async function isCreator(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_creator")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.warn(`Статус креатора недоступен: ${error.message}`);
    // Закрываемся, а не открываемся: при непонятной ошибке правильнее
    // не пустить, чем пустить. Загрузка — это запись в общее хранилище.
    return false;
  }
  return Boolean(data?.is_creator);
}

/**
 * До какого момента человеку закрыта отправка новых карт, или null.
 *
 * Настоящий запрет стоит в RLS-политике вставки (миграция
 * 20260811160000) — эта функция нужна, чтобы СКАЗАТЬ человеку, до какого
 * числа ждать, вместо отказа базы без объяснений. Полагаться на неё как
 * на защиту нельзя и не нужно.
 *
 * Прошедшую дату считаем отсутствием паузы: чистить колонку по
 * расписанию было бы лишней работой ради того же результата.
 */
export async function getSubmissionBlock(
  supabase: SupabaseClient,
  userId: string
): Promise<Date | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("submissions_blocked_until")
    .eq("id", userId)
    .maybeSingle();

  // Колонки ещё нет (миграция не прогнана) — считаем, что паузы нет.
  // Открываемся, а не закрываемся, в отличие от isCreator: там ошибка
  // означала бы «пустить неизвестно кого», здесь — «держать взаперти
  // того, кого никто не наказывал».
  if (error || !data?.submissions_blocked_until) return null;

  const until = new Date(data.submissions_blocked_until as string);
  return until > new Date() ? until : null;
}

/** Действующий креатор в списке админки. */
export type CreatorRow = {
  id: string;
  /** Единственное имя человека — оно же адрес профиля (20260821150000). */
  username: string;
  maps: number;
};

/**
 * Все, у кого сейчас есть право загружать — список для отзыва статуса.
 *
 * Служебным ключом: чужие строки profiles закрыты RLS, а владельцу нужен
 * ровно чужой список. Количество карт — рядом с именем, потому что это
 * первое, что хочется знать перед тем, как забирать статус.
 */
export async function getCreators(): Promise<CreatorRow[]> {
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("profiles")
    .select("id, username")
    .eq("is_creator", true)
    .order("username");

  if (error) {
    console.warn(`Список креаторов недоступен: ${error.message}`);
    return [];
  }

  const rows = (data ?? []) as { id: string; username: string }[];
  if (rows.length === 0) return [];

  // Карты — одним запросом на весь список, а не по запросу на человека.
  const { data: products } = await db
    .from("products")
    .select("creator_id")
    .in(
      "creator_id",
      rows.map((r) => r.id)
    );

  const counts = new Map<string, number>();
  for (const product of products ?? []) {
    const id = product.creator_id as string;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }

  return rows.map((row) => ({
    id: row.id,
    username: row.username,
    maps: counts.get(row.id) ?? 0,
  }));
}

/**
 * Очередь заявок для владельца. Служебным ключом — чужие строки закрыты
 * RLS, а модератор как раз не автор (тот же случай, что у очереди карт).
 */
export async function getPendingApplications(): Promise<
  (CreatorApplication & { username: string; email: string | null })[]
> {
  const db = getSupabaseAdmin();

  const { data, error } = await db
    .from("creator_applications")
    .select(
      "id, user_id, portfolio_url, discord, about, status, rejection_reason, created_at, decided_at"
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.warn(`Очередь заявок недоступна: ${error.message}`);
    return [];
  }

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) return [];

  // Ники — одним запросом на всю очередь.
  const { data: profiles } = await db
    .from("profiles")
    .select("id, username")
    .in(
      "id",
      rows.map((r) => r.user_id)
    );
  const names = new Map<string, string>();
  for (const p of profiles ?? []) names.set(p.id, p.username);

  // Адрес берём из auth.users: в profiles его нет, а владельцу он нужен —
  // по нему он и ответит человеку, пока нет раздела сообщений.
  const emails = new Map<string, string>();
  const { data: users } = await db.auth.admin.listUsers({ perPage: 1000 });
  for (const u of users?.users ?? []) {
    if (u.email) emails.set(u.id, u.email);
  }

  return rows.map((row) => ({
    ...toApplication(row),
    username: names.get(row.user_id) ?? "—",
    email: emails.get(row.user_id) ?? null,
  }));
}
