import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Пути, по которым считаются просмотры. Собраны здесь, чтобы обработчик
// /api/view и страницы, которые показывают счётчик, пользовались одними
// и теми же строками и не разъехались из-за опечатки.
export const VIEW_PATHS = {
  portfolio: "/portfolio",
  project: (slug: string) => `/portfolio/${slug}`,
} as const;

// Разрешённые к подсчёту пути. Обработчик принимает только их: иначе
// любой мог бы засорить таблицу произвольными строками ("/выдумка"),
// и она бы бесконтрольно росла.
export function isTrackablePath(path: string) {
  return path === VIEW_PATHS.portfolio || /^\/portfolio\/[a-z0-9-]+$/.test(path);
}

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
