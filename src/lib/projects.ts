import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";

// Форма проекта, которой пользуется весь сайт. Осталась ровно такой же,
// как была при массиве в этом файле, — поэтому ни один компонент из-за
// переезда на БД не изменился. Названия колонок в базе другие
// (image_url, price_label, ...), перевод одного в другое — ниже, в
// rowToProject. Это граница: снаружи домен сайта, внутри устройство БД.
export type Project = {
  slug: string;
  title: string;
  tag: string;
  summary: string;
  description: string;
  deadline: string;
  size: string;
  price: string;
  image: string;
  /** Стороны участка в блоках. null — размер не число (так бывает у старых строк). */
  sizeX: number | null;
  sizeZ: number | null;
  /** Цена числом. null — работа не продавалась (личная, командная, пробная). */
  priceAmount: number | null;
  /** Показывать ли в hero-карусели на /portfolio. */
  isFeatured: boolean;
  /** Extra shots of the same build, shown in the gallery on its subpage. */
  gallery?: string[];
  /** Где работу можно купить (премейд у заказчика на BuiltByBit). null — негде. */
  listingUrl: string | null;
  /** По ссылке премейд бесплатный — кнопка «Download», а не «Buy». */
  listingIsFree: boolean;
  /** Место в списке; null у строк без порядка (уходят в конец). */
  sortOrder: number | null;
  /**
   * Видна ли посетителям. false — черновик: его видит только админка
   * (служебным ключом), публичный ключ такую строку не получит вовсе —
   * прячет политика в базе (миграция 20261112140000_project_drafts).
   */
  isPublished: boolean;
  /** Когда работа добавлена (created_at). По ней Recent projects на главной берёт самые новые. */
  createdAt: string;
};

// Верхняя граница на размер hero-карусели. Раскрывающиеся панели читаются
// хорошо только пока их немного, а is_featured в базе можно проставить
// хоть всем шестнадцати — это страховка от такой оплошности. Шестая
// панель добавлена 16.10 под Redspire Commons: на 640px свёрнутые панели
// по 64px занимают 320, раскрытой остаётся достаточно.
export const PORTFOLIO_HERO_SIZE = 6;

// Как строка выглядит в базе. Пишем только те колонки, которые реально
// запрашиваем ниже. Цифровые size_x/size_z/price_amount понадобились
// 24.09 странице работы (площадь, «есть ли цена»); deadline_days сайту
// по-прежнему не нужен и не читается.
type ProjectRow = {
  slug: string;
  title: string;
  tag: string;
  summary: string;
  description: string;
  image_url: string;
  price_label: string;
  size_label: string;
  deadline_label: string;
  size_x: number | null;
  size_z: number | null;
  price_amount: number | null;
  is_featured: boolean;
  listing_url: string | null;
  listing_is_free: boolean;
  sort_order: number | null;
  is_published: boolean;
  created_at: string;
  project_images: { url: string; position: number }[] | null;
};

// Перевод "строка из базы" -> "проект, как его понимает сайт".
// Вынесено отдельной чистой функцией, а не спрятано внутрь запроса,
// чтобы это можно было проверить тестом без обращения к сети.
export function rowToProject(row: ProjectRow): Project {
  const gallery = (row.project_images ?? [])
    // Порядок фото задаёт position. Сортируем здесь, а не полагаемся на
    // порядок, в котором их вернула база, — во вложенном запросе он
    // ничем не гарантирован.
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((img) => img.url);

  return {
    slug: row.slug,
    title: row.title,
    tag: row.tag,
    summary: row.summary,
    description: row.description,
    deadline: row.deadline_label,
    size: row.size_label,
    price: row.price_label,
    image: row.image_url,
    sizeX: row.size_x,
    sizeZ: row.size_z,
    // numeric из Postgres PostgREST отдаёт числом, но на всякий случай
    // приводим: строка «187.5» дала бы в сравнениях неожиданное.
    priceAmount: row.price_amount === null ? null : Number(row.price_amount),
    isFeatured: row.is_featured,
    // Пустую галерею отдаём как undefined, а не как [] — компоненты уже
    // написаны под проверку `project.gallery && length > 0`.
    gallery: gallery.length > 0 ? gallery : undefined,
    listingUrl: row.listing_url,
    listingIsFree: row.listing_is_free,
    sortOrder: row.sort_order,
    isPublished: row.is_published,
    createdAt: row.created_at,
  };
}

// Список колонок для запроса. Одной строкой и в одном месте, чтобы
// getAllProjects и getProject не разъехались между собой.
// project_images(...) — вложенный запрос: Supabase сам подтянет
// связанные строки галереи по внешнему ключу, отдельный запрос не нужен.
const PROJECT_FIELDS = `
  slug, title, tag, summary, description, image_url,
  price_label, size_label, deadline_label, is_featured,
  size_x, size_z, price_amount, listing_url, listing_is_free, sort_order,
  is_published, created_at, project_images ( url, position )
`;

// Площадь участка в футбольных полях — чтобы «200×200» стало понятно
// человеку, который не держит в голове, много это или мало. Блок в
// Minecraft — метр, поле по стандарту FIFA — 105×68 м.
const PITCH_M2 = 105 * 68;

/**
 * Сколько футбольных полей занимает участок, округлённо, или null.
 *
 * null, когда считать нечестно: сторон нет, или подпись размера — не
 * простое «N×M». У Driftstone Isles она «150×150 each»: островов
 * несколько, и площадь одного выдавалась бы за площадь всей работы.
 */
export function footprintInPitches(project: Pick<Project, "size" | "sizeX" | "sizeZ">): number | null {
  const { size, sizeX, sizeZ } = project;
  if (!sizeX || !sizeZ) return null;
  if (!/^\d+×\d+$/.test(size)) return null;
  const pitches = (sizeX * sizeZ) / PITCH_M2;
  // Меньше одного поля — одна цифра после запятой («0.8»), иначе целые
  // до десяти с половинкой: «5.6» читается, «5.60224» — нет.
  return pitches < 10 ? Math.round(pitches * 10) / 10 : Math.round(pitches);
}

/** Работы для посетителей: только опубликованные. */
export async function getAllProjects(): Promise<Project[]> {
  return loadProjects(getSupabase(), { onlyPublished: true });
}

/**
 * Общий запрос списка. Клиент передаётся снаружи, чтобы админка могла
 * прочитать черновики служебным ключом (projects-admin.ts), не таща
 * этот ключ сюда: projects.ts импортируют и клиентские компоненты.
 *
 * onlyPublished у публичного ключа дублирует политику базы — это не
 * защита, а честность запроса: если сюда однажды передадут служебный
 * ключ, черновики всё равно не уедут на сайт.
 */
export async function loadProjects(
  db: SupabaseClient,
  { onlyPublished }: { onlyPublished: boolean }
): Promise<Project[]> {
  let query = db.from("projects").select(PROJECT_FIELDS);
  if (onlyPublished) query = query.eq("is_published", true);
  const { data, error } = await query.order("sort_order", { ascending: true });

  // Молча отдать пустой список — худший вариант: сайт соберётся с пустым
  // портфолио, и никто не заметит. Лучше упасть на сборке с текстом ошибки.
  if (error) throw new Error(`Не удалось загрузить проекты: ${error.message}`);

  return (data ?? []).map(rowToProject);
}

export async function getProject(slug: string): Promise<Project | null> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select(PROJECT_FIELDS)
    .eq("slug", slug)
    .eq("is_published", true)
    // maybeSingle: ждём одну строку или ни одной. В отличие от single()
    // отсутствие строки — не ошибка, а null: несуществующий /portfolio/xxx
    // должен показать 404, а не уронить страницу.
    .maybeSingle();

  if (error) throw new Error(`Не удалось загрузить проект "${slug}": ${error.message}`);

  return data ? rowToProject(data) : null;
}
