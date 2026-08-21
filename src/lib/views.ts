import { getSupabaseAdmin } from "@/lib/supabase-admin";

// Белый список путей переехал в view-paths.ts: он нужен и браузеру
// (ViewTracker), а этот модуль тянет служебный ключ Supabase и в
// клиентский бандл попадать не должен. Реэкспорт — чтобы существующие
// импорты из views.ts продолжали работать.
export { VIEW_PATHS, isTrackablePath } from "@/lib/view-paths";

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
 * Счётчик одной страницы.
 *
 * Отдельная функция, а не `(await getViewCounts())[path]`: тот тянет
 * строку на КАЖДЫЙ считаемый адрес сайта, а странице карты нужен один.
 * На двадцати картах разница незаметна, на тысяче — это тысяча строк
 * ради одного числа. Хвост из аудита 2026-07-22, закрыт 2026-08-21,
 * когда счётчик понадобился на деталке.
 *
 * Ноль при любой беде — счётчик украшение, а не содержание страницы
 * (тот же довод, что у getViewCounts).
 *
 * ТОЛЬКО для серверных компонентов: внутри служебный ключ.
 */
export async function getViewCount(path: string): Promise<number> {
  try {
    const { data, error } = await getSupabaseAdmin()
      .from("page_view_counts")
      .select("views")
      .eq("path", path)
      .maybeSingle();

    if (error) throw new Error(error.message);
    return data ? Number(data.views) : 0;
  } catch (e) {
    console.warn(
      `Счётчик просмотров ${path} недоступен:`,
      e instanceof Error ? e.message : e
    );
    return 0;
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
