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
  /** Показывать ли в hero-карусели на /portfolio. */
  isFeatured: boolean;
  /** Extra shots of the same build, shown in the gallery on its subpage. */
  gallery?: string[];
};

// Верхняя граница на размер hero-карусели. Раскрывающиеся панели читаются
// хорошо только пока их немного, а is_featured в базе можно проставить
// хоть всем шестнадцати — это страховка от такой оплошности.
export const PORTFOLIO_HERO_SIZE = 5;

// Как строка выглядит в базе. Пишем только те колонки, которые реально
// запрашиваем ниже, — цифровые (price_amount, size_x, deadline_days)
// сайту сегодня не нужны, они лежат в БД для будущих сортировок.
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
  is_featured: boolean;
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
    isFeatured: row.is_featured,
    // Пустую галерею отдаём как undefined, а не как [] — компоненты уже
    // написаны под проверку `project.gallery && length > 0`.
    gallery: gallery.length > 0 ? gallery : undefined,
  };
}

// Список колонок для запроса. Одной строкой и в одном месте, чтобы
// getAllProjects и getProject не разъехались между собой.
// project_images(...) — вложенный запрос: Supabase сам подтянет
// связанные строки галереи по внешнему ключу, отдельный запрос не нужен.
const PROJECT_FIELDS = `
  slug, title, tag, summary, description, image_url,
  price_label, size_label, deadline_label, is_featured,
  project_images ( url, position )
`;

export async function getAllProjects(): Promise<Project[]> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select(PROJECT_FIELDS)
    .order("sort_order", { ascending: true });

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
    // maybeSingle: ждём одну строку или ни одной. В отличие от single()
    // отсутствие строки — не ошибка, а null: несуществующий /portfolio/xxx
    // должен показать 404, а не уронить страницу.
    .maybeSingle();

  if (error) throw new Error(`Не удалось загрузить проект "${slug}": ${error.message}`);

  return data ? rowToProject(data) : null;
}
