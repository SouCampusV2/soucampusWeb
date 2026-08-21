// Словари характеристик карты (миграция 20260821130000_product_specs).
//
// ГДЕ ГРАНИЦА С БАЗОЙ. База стережёт ОБЪЁМ: сколько значений влезет в
// массив и какой длины каждое (ограничение products_specs_len). Какие
// именно значения осмысленны — вопрос вкуса, и он живёт здесь, потому
// что версия 1.22 выйдет раньше, чем захочется идти в прод с миграцией.
// Тот же довод, что у палитры цвета ника (name-colors.ts).
//
// ЧТО БУДЕТ СО ЗНАЧЕНИЕМ ВНЕ СПИСКА. Ничего страшного: оно покажется
// как есть. Это сознательный размен — цена ошибки здесь косметическая,
// а жёсткий перечень в базе стоил бы миграции на каждую новую версию
// игры.

/**
 * Версии Minecraft — от новых к старым: в списке ищут свою, а своя у
 * большинства свежая. Порядок здесь же и порядок показа.
 *
 * ⚠️ Это ЗАЯВЛЕНИЕ АВТОРА о совместимости, а не проверенный факт —
 * площадка карты не запускает. Подпись на странице товара говорит об
 * этом прямо, чтобы «поддерживает 1.17» не читалось как гарантия.
 */
export const MC_VERSIONS = [
  "1.21.11", "1.21.8", "1.21.5", "1.21.4", "1.21.2", "1.21",
  "1.20", "1.19", "1.18", "1.17", "1.16", "1.15", "1.14",
  "1.13", "1.12", "1.8",
] as const;

/** Чем карта является. Одно значение — карта бывает чем-то одним. */
export const MAP_TYPES = [
  "Spawn", "Hub", "Lobby", "Survival world", "Adventure map",
  "Minigame arena", "City", "Building pack", "Terrain",
] as const;

/** Подо что годится. Набор: спавн честно годится и в хаб, и в мини-игру. */
export const GAME_MODES = [
  "Survival", "Creative", "Hub & lobby", "Minigame", "Adventure", "Roleplay",
] as const;

/** Стилистика. Тоже набор: «современный город» — две метки, а не одна. */
export const THEMES = [
  "Modern", "Medieval", "Fantasy", "City", "Nature", "Steampunk",
  "Futuristic", "Japanese", "Desert", "Nordic", "Pirate", "Winter",
] as const;

/**
 * Масштаб. Словами, а не числом блоков: число автор всё равно назовёт
 * на глаз, а покупателю нужна не точность, а порядок величины.
 */
export const MAP_SIZES = ["Small", "Medium", "Large", "Huge"] as const;

/** В каком виде отдаётся файл. */
export const FILE_FORMATS = [
  "Java world", "Bedrock world", "Schematic", "Datapack", "Resource pack",
] as const;

/**
 * Вес файла человеческими словами. Делим на 1024, а не на 1000: в
 * Minecraft-мире «МБ» читают как то, что показывает проводник, а он
 * считает двоичными.
 */
export function formatFileSize(bytes: number | null): string | null {
  if (bytes === null || !Number.isFinite(bytes) || bytes <= 0) return null;
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (mb < 100) return `${mb.toFixed(1)} MB`;
  return `${Math.round(mb)} MB`;
}
