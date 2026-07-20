import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Пути, по которым считаются просмотры. Собраны здесь, чтобы обработчик
// /api/view и страницы, которые показывают счётчик, пользовались одними
// и теми же строками и не разъехались из-за опечатки.
export const VIEW_PATHS = {
  portfolio: "/portfolio",
  project: (slug: string) => `/portfolio/${slug}`,
} as const;

// Статические страницы сайта. Динамические (работы и отзывы) проверяются
// шаблоном ниже — перечислять 16 адресов вручную бессмысленно, они
// меняются вместе с содержимым базы.
const STATIC_PATHS = new Set([
  "/",
  "/portfolio",
  "/about",
  "/contact",
  "/shop",
  "/terms",
]);

// Разрешённые к подсчёту пути. Обработчик принимает только их: иначе
// кто угодно мог бы засорить таблицу произвольными строками ("/выдумка"),
// и она росла бы бесконтрольно. Шаблонslug'а намеренно узкий — строчные
// латинские буквы, цифры и дефис, ровно то, что порождает БД.
export function isTrackablePath(path: string) {
  if (STATIC_PATHS.has(path)) return true;
  return /^\/(portfolio|reviews)\/[a-z0-9-]{1,80}$/.test(path);
}

/** Уникальные посетители всего сайта, по периодам. */
export type SiteViews = {
  all_time: number;
  today: number;
  week: number;
  month: number;
};

export const EMPTY_SITE_VIEWS: SiteViews = {
  all_time: 0,
  today: 0,
  week: 0,
  month: 0,
};

/**
 * Счётчики уникальных посетителей: путь -> число.
 *
 * ТОЛЬКО для серверных компонентов: внутри служебный ключ. Страницы
 * статические и собираются на сервере, так что этого достаточно — а
 * таблица при этом остаётся полностью недоступной из браузера.
 */
export async function getViewCounts(): Promise<Record<string, number>> {
  // Счётчик — украшение, а не содержание страницы. Что бы ни пошло не так
  // (нет служебного ключа, недоступна база, нет таблицы) — портфолио
  // обязано открыться, просто без чисел. Это сознательное отличие от
  // getAllProjects, который падает громко: там без данных показывать нечего.
  //
  // Именно поэтому в CI нет переменной SUPABASE_SERVICE_ROLE_KEY. Задача
  // CI — проверить, что код собирается, а не выпустить готовый сайт (это
  // делает Vercel, и там ключ есть). Отдавать боевой ключ, который обходит
  // RLS, ещё и в GitHub Actions — лишний носитель секрета без выгоды.
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("page_view_counts")
      .select("path, views");

    if (error) throw new Error(error.message);

    const counts: Record<string, number> = {};
    for (const row of data ?? []) {
      counts[row.path as string] = Number(row.views);
    }
    return counts;
  } catch (e) {
    console.warn(
      "Счётчики просмотров недоступны, страница соберётся без них:",
      e instanceof Error ? e.message : e
    );
    return {};
  }
}

/**
 * Уникальные посетители всего сайта за четыре периода.
 *
 * Возвращаются все четыре числа сразу, одним запросом, хотя показывается
 * в каждый момент одно: переключатель периода тогда работает мгновенно и
 * без обращения к серверу. Запрашивать по клику пришлось бы заводить ещё
 * один публичный маршрут — ради четырёх чисел, которые весят байты.
 *
 * ТОЛЬКО для серверных компонентов: внутри служебный ключ.
 */
export async function getSiteViews(): Promise<SiteViews> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("site_view_counts")
      .select("all_time, today, week, month")
      .single();

    if (error) throw new Error(error.message);

    return {
      all_time: Number(data.all_time),
      today: Number(data.today),
      week: Number(data.week),
      month: Number(data.month),
    };
  } catch (e) {
    console.warn(
      "Счётчик посетителей сайта недоступен:",
      e instanceof Error ? e.message : e
    );
    return EMPTY_SITE_VIEWS;
  }
}
