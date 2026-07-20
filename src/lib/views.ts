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
  const { data, error } = await getSupabaseAdmin()
    .from("page_view_counts")
    .select("path, views");

  // Счётчик — украшение, а не содержание страницы. Если он не
  // загрузился, портфолио всё равно должно открыться: возвращаем
  // пустой объект, и компонент просто не покажет число. Это
  // сознательное отличие от getAllProjects, который падает громко —
  // там без данных показывать нечего.
  if (error) {
    console.error("Не удалось загрузить счётчики просмотров:", error.message);
    return {};
  }

  const counts: Record<string, number> = {};
  for (const row of data ?? []) {
    counts[row.path as string] = Number(row.views);
  }
  return counts;
}
