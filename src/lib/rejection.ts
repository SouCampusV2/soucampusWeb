// Причины отказа — общий словарь для админки и для формы креатора.
//
// Отказ «просто текстом» заставлял автора угадывать, что менять, а нас
// лишал возможности проверить при повторной отправке, что он это сделал.
// Поэтому у каждой причины есть код (едет в products.rejection_flags),
// формулировка для модератора, готовый текст для автора и — главное —
// признак `requiresChange`: по нему форма правки понимает, что именно
// обязано измениться перед повторной отправкой.

export type RejectionFlag =
  | "images"
  | "description"
  | "file"
  | "price"
  | "category"
  | "title";

export type RejectionTemplate = {
  flag: RejectionFlag;
  /** Короткая подпись в чек-боксе у модератора. */
  label: string;
  /** Готовый текст, который увидит автор. Модератор может дописать свой. */
  message: string;
  /**
   * Требует ли пункт ФАКТИЧЕСКОЙ замены при ресабмите. У файла и
   * картинок это проверяемо (новый файл / изменившийся набор), у текста
   * и цены — нет: «переписать описание» нельзя отличить от «поправить
   * запятую» автоматически, и делать вид, что можно, — самообман.
   */
  requiresChange: "file" | "images" | null;
};

export const REJECTION_TEMPLATES: RejectionTemplate[] = [
  {
    flag: "images",
    label: "Replace the screenshots",
    message:
      "The screenshots need work — add clear, well-lit shots that actually show the build.",
    requiresChange: "images",
  },
  {
    flag: "file",
    label: "Re-upload the map file",
    message:
      "The map file has a problem — it didn't open, is incomplete, or doesn't match the screenshots. Please re-upload it.",
    requiresChange: "file",
  },
  {
    flag: "description",
    label: "Rewrite the description",
    message:
      "The description needs more detail — what's included, the size of the build, and which Minecraft versions it works with.",
    requiresChange: null,
  },
  {
    flag: "title",
    label: "Change the title",
    message: "The title doesn't describe the map clearly enough.",
    requiresChange: null,
  },
  {
    flag: "price",
    label: "Reconsider the price",
    message: "The price doesn't match what's on offer here.",
    requiresChange: null,
  },
  {
    flag: "category",
    label: "Pick a different category",
    message: "This map is in the wrong category.",
    requiresChange: null,
  },
];

export function templateFor(flag: string): RejectionTemplate | undefined {
  return REJECTION_TEMPLATES.find((t) => t.flag === flag);
}

// --- Причины для действий над УЖЕ ЖИВУЩЕЙ картой ---
//
// Отказ (выше) — это ответ на заявку: карта ещё не выходила в свет, автор
// правит и присылает снова. Снятие и удаление — про карту, которая уже
// стояла на витрине, и разговор там другой: не «доделай», а «так нельзя».
// Поэтому отдельные списки, а не общий: смешав их, мы предлагали бы
// модератору снять карту с формулировкой «добавь скриншотов посветлее».
//
// Общая форма у всех трёх — код + подпись модератору + текст автору, —
// чтобы окно причины в админке было одним компонентом на все случаи.
export type ReasonTemplate = {
  code: string;
  /** Короткая подпись в чек-боксе у модератора. */
  label: string;
  /** Готовый текст, который увидит автор. */
  message: string;
};

/**
 * За что карту снимают с витрины. Снятие обратимо: карта остаётся у
 * автора, он правит и присылает на повторную проверку.
 */
export const TAKEDOWN_TEMPLATES: ReasonTemplate[] = [
  {
    code: "not_as_described",
    label: "Doesn't match the description",
    message:
      "The map doesn't match what the page promises — the build, the size or the contents are different from the description and screenshots.",
  },
  {
    code: "broken_file",
    label: "The file is broken",
    message:
      "The download is broken — the file doesn't open, is incomplete, or isn't the map it claims to be. Fix it and send it back for review.",
  },
  {
    code: "stolen_content",
    label: "Someone else's work",
    message:
      "We've had a credible report that this build isn't yours. It stays off the shop until you can show it is.",
  },
  {
    code: "misleading_images",
    label: "Misleading screenshots",
    message:
      "The screenshots show something other than what buyers get — renders, other people's builds, or areas that aren't in the file.",
  },
  {
    code: "buyer_complaints",
    label: "Buyer complaints",
    message:
      "Several buyers reported problems with this map. It's off the shop while we sort it out.",
  },
  {
    code: "rules",
    label: "Against the site rules",
    message:
      "The listing breaks the site rules — check the terms and reply to this if you think it's a mistake.",
  },
];

/**
 * За что карту убирают из каталога совсем. Причины тяжелее: удаление
 * автор отменить не может, поэтому формулировки окончательные.
 */
export const DELETION_TEMPLATES: ReasonTemplate[] = [
  {
    code: "copyright",
    label: "Copyright claim",
    message:
      "The map was removed after a copyright claim from the rightful author.",
  },
  {
    code: "stolen_content",
    label: "Someone else's work",
    message: "The map was removed because the build isn't yours.",
  },
  {
    code: "duplicate",
    label: "Duplicate listing",
    message:
      "The map was removed as a duplicate — the same build is already listed.",
  },
  {
    code: "prohibited",
    label: "Prohibited content",
    message:
      "The map was removed for content that isn't allowed on the site. See the terms.",
  },
  {
    code: "creator_request",
    label: "The creator asked us to",
    message: "The map was removed at your own request.",
  },
];

export function reasonTemplateFor(
  templates: ReasonTemplate[],
  code: string
): ReasonTemplate | undefined {
  return templates.find((t) => t.code === code);
}

/**
 * Собирает текст для автора из выбранных пунктов и приписки модератора —
 * то же, что buildRejectionMessage, но для ReasonTemplate. Держим
 * отдельной функцией, а не обобщаем одну на оба типа: у отказа ключ
 * зовётся flag и едет в rejection_flags, здесь — code и едет в
 * suspension_reason, и склеивать эти две истории в один generic значило
 * бы прятать разницу, а не убирать её.
 */
export function buildReasonMessage(
  templates: ReasonTemplate[],
  codes: string[],
  note: string
): string {
  const lines = codes
    .map((code) => reasonTemplateFor(templates, code)?.message)
    .filter((m): m is string => Boolean(m))
    .map((m) => `• ${m}`);

  const extra = note.trim();
  if (extra) lines.push(extra);
  return lines.join("\n");
}

/**
 * Собирает текст письма автору из выбранных пунктов и произвольной
 * приписки модератора. Пункты идут списком — так автору видно, что
 * задач может быть несколько, а не одна размытая претензия.
 */
export function buildRejectionMessage(flags: string[], note: string): string {
  const lines = flags
    .map((flag) => templateFor(flag)?.message)
    .filter((m): m is string => Boolean(m))
    .map((m) => `• ${m}`);

  const extra = note.trim();
  if (extra) lines.push(extra);
  return lines.join("\n");
}
