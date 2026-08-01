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
