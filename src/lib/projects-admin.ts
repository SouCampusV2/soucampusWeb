import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { loadProjects, type Project } from "@/lib/projects";

// Работы портфолио для админки — вместе с черновиками (2026-11-12).
//
// Отдельный файл, а не функция в projects.ts: тот импортируют клиентские
// компоненты (PortfolioForm, PortfolioHero, RecentProjects), и служебный
// ключ рядом с ним — один неосторожный импорт от браузерного бандла.
// Если этот файл всё же окажется в браузере, supabase-admin.ts падает
// сам при первом вызове (его пункт 2).
//
// Черновик публичный ключ не прочитает — его прячет политика базы. Поэтому
// админка читает служебным ключом; права проверяет layout админки до
// того, как страница вообще дойдёт до этого вызова.
export async function getAllProjectsForAdmin(): Promise<Project[]> {
  return loadProjects(getSupabaseAdmin(), { onlyPublished: false });
}
