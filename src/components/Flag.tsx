import Image from "next/image";

// Флаг рисуем КАРТИНКОЙ (SVG из public/flags), а не эмодзи. Причина: на
// Windows нет шрифта для эмодзи-флагов, и 🇳🇱 показывается как буквы "NL".
// SVG выглядит одинаково на всех системах.
//
// В базе флаг по-прежнему хранится эмодзи (🇳🇱) — так data-driven: добавил
// отзыв строкой в БД, флаг подхватился сам. Здесь эмодзи переводится в код
// страны ("NL"), а по коду берётся файл /flags/NL.svg. Сами SVG скопированы
// из пакета country-flag-icons (265 стран, включая 🇪🇺 EU) — чтобы добавить
// новую страну, ничего делать не нужно, файл уже лежит.

// Эмодзи-флаг — это две буквы-«региональных индикатора» (🇳 + 🇱). Каждый
// смещён от латинской буквы на фиксированную величину; вычитаем её обратно.
const REGIONAL_INDICATOR_A = 0x1f1e6;

function flagEmojiToCode(emoji: string): string | null {
  const chars = [...emoji];
  if (chars.length < 2) return null;

  const letters = chars.slice(0, 2).map((ch) => {
    const cp = ch.codePointAt(0);
    if (cp === undefined || cp < REGIONAL_INDICATOR_A || cp > REGIONAL_INDICATOR_A + 25) {
      return null;
    }
    return String.fromCharCode(65 + (cp - REGIONAL_INDICATOR_A));
  });

  if (letters.some((l) => l === null)) return null;
  return letters.join("");
}

export function Flag({ emoji, className = "" }: { emoji: string; className?: string }) {
  const code = flagEmojiToCode(emoji);
  if (!code) return null;

  return (
    <Image
      src={`/flags/${code}.svg`}
      alt={code}
      width={18}
      height={12}
      // SVG крохотный и статический — оптимизатор Next ему не нужен (а SVG он
      // по умолчанию и не пропускает без dangerouslyAllowSVG). Отдаём как есть.
      unoptimized
      className={`inline-block rounded-[2px] align-middle ${className}`}
    />
  );
}
