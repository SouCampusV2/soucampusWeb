import { getSupabase } from "@/lib/supabase";

// Три цифры на главной. Значения правятся вручную в Table Editor —
// автоматически их не вычислить: в базе 16 работ портфолио (витрина
// избранного), а заказов за всё время 246, включая всё, что было до
// сайта. Когда появится настоящая таблица orders (Этап 4), можно будет
// складывать "историческую базу + новые заказы", но не раньше.
export type Stat = {
  id: string;
  label: string;
  value: number;
  suffix: string;
  // Смысловой акцент, не класс. Конкретные цвета — в Stats.tsx,
  // потому что это вопрос дизайна, а не данных (см. миграцию
  // 20260720190000_stats_accent.sql).
  accent: "orange" | "lime" | "blue";
};

type StatRow = {
  id: string;
  label: string;
  value: number;
  suffix: string;
  accent: string;
};

export function rowToStat(row: StatRow): Stat {
  return {
    id: row.id,
    label: row.label,
    value: Number(row.value),
    suffix: row.suffix,
    // В базе accent — text с проверкой check, TypeScript про неё не знает.
    accent: row.accent === "lime" ? "lime" : row.accent === "blue" ? "blue" : "orange",
  };
}

export async function getStats(): Promise<Stat[]> {
  const { data, error } = await getSupabase()
    .from("stats")
    .select("id, label, value, suffix, accent")
    .order("sort_order", { ascending: true });

  if (error) throw new Error(`Не удалось загрузить статистику: ${error.message}`);

  return (data ?? []).map(rowToStat);
}
