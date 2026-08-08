import Link from "next/link";

type Variant = "primary" | "secondary" | "tertiary";
type Size = "sm" | "md" | "lg";

// h-14 (56px) на sm:+ — фиксированная высота ВСЕХ кнопок независимо от
// size/variant и от содержимого (текст, иконка, текст+иконка). Раньше высота
// задавалась вертикальным паддингом (py-*), из-за чего кнопка с иконкой
// внутри (см. "Join Discord" на /contact) становилась выше обычной текстовой
// кнопки того же size — паддинг теперь только горизонтальный. На мобильном
// (< 640px) кнопка немного компактнее (h-12/48px) — h-14 ощущается слишком
// массивной на телефоне.
// No hover:scale-105 (removed site-wide) — hover is color-only now (each
// variant's own hover:bg-*/hover:text-* below), and buttons with an icon
// animate the icon instead (see the `group` + `group-hover:-rotate-45`
// pattern on ArrowCircle wherever a Button carries one). active:scale-95
// stays — it's a distinct "pressed" click/tap feedback, not a growing
// hover effect.
const base =
  "inline-flex h-12 cursor-pointer items-center justify-center font-semibold transition-transform active:scale-95 sm:h-14";

// Единая цветовая схема кнопок по всему сайту (2026-07-20):
//   светлая тема — 500, при наведении 600
//   тёмная тема  — 400, при наведении 500
// В светлой теме фон почти белый, поэтому нужен насыщенный оттенок;
// в тёмной наоборот — на чёрном тот же 500 выглядит грязным, и шкала
// сдвигается на шаг светлее. Это та же формула отражения вокруг 500,
// что и во всём DESIGN.md, просто применённая к кнопкам.
//
// Три варианта:
//   primary   — заливка (главное действие).
//   secondary — та же таблетка, что и primary (форма/высота/паддинг),
//               но без заливки: прозрачный фон + обводка того же акцента.
//               Текст акцентного цвета (на заливке его нет, поэтому не
//               zinc-950, как у primary, а сам оранжевый). Hover — тот же
//               сдвиг 500→600 / 400→500, но по цвету обводки и текста.
//   tertiary  — текст-ссылка с подчёркиванием, без формы и паддинга
//               (бывший secondary; переименован, когда появилась обводка).
//
// Экспортируется (BUTTON_COLORS) для мест, где нужна кнопочная РАСКРАСКА, но
// не кнопочная ГЕОМЕТРИЯ: маленькие пилюли (py-2) на /profile не влезают в
// фиксированную высоту h-12/h-14 из base, а цвета обязаны совпадать с
// остальными кнопками. Раньше эти классы копировались туда руками и
// разъезжались — теперь источник один.
// Подчёркивание tertiary отделено от её цвета намеренно.
//
// Когда в tertiary есть иконка, подчёркивать её нельзя — черта проезжает
// под стрелкой и выглядит как опечатка. Поэтому у таких кнопок черта
// вешается на <span> с текстом, а не на саму кнопку (см. «Open Discord»
// на /contact и BackLink). Но до 2026-08-08 «цвет без подчёркивания»
// нельзя было получить, не переписав руками все четыре цветовых класса
// через colorClassName — и на /contact именно это и сделано, из-за чего
// синяя ссылка держит собственную копию оттенков. Теперь части
// разделены: цвет берётся отсюда, черта добавляется там, где нужна.
export const TERTIARY_UNDERLINE = "underline decoration-2 underline-offset-4";

export const TERTIARY_COLORS =
  "text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-500";

export const BUTTON_COLORS: Record<Variant, string> = {
  primary:
    "rounded-full bg-orange-500 text-zinc-950 hover:bg-orange-600 dark:bg-orange-400 dark:hover:bg-orange-500",
  secondary:
    "rounded-full border-2 border-orange-500 text-orange-500 hover:border-orange-600 hover:text-orange-600 dark:border-orange-400 dark:text-orange-400 dark:hover:border-orange-500 dark:hover:text-orange-500",
  // Без иконки — подчёркиваем кнопку целиком, это обычный случай.
  tertiary: `${TERTIARY_COLORS} ${TERTIARY_UNDERLINE}`,
};

// Геометрия «маленькой пилюли» — того самого исключения, ради которого
// существует BUTTON_COLORS. Раньше каждое такое место писало
// `px-5 py-2` руками, и высоты разъезжались ровно по той же причине, по
// которой в base появилась h-12: паддинг задаёт ОТСТУП, а не высоту, и
// кнопка с обводкой (border-2) выходит на 4px выше соседней с заливкой,
// а кнопка с иконкой — выше кнопки без неё. Поэтому здесь тоже
// фиксированная высота, а паддинг только горизонтальный.
export const BUTTON_PILL =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-full px-5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

// Ссылка ВНУТРИ текста — не кнопка и не tertiary.
//
// Разница принципиальная и часто путается. `Button variant="tertiary"` —
// это самостоятельное действие: у него кнопочная высота (h-12/h-14 из
// base), он стоит отдельной строкой и подчёркнут всегда. А это — слово
// или два внутри предложения: «by SouCampus», «Back to site», ссылка на
// портфолио посреди абзаца. Дать им кнопочную высоту значило бы разорвать
// строку, в которой они стоят.
//
// Заведено 2026-08-08: таких ссылок по сайту набралось около четырёх
// десятков примерно в дюжине разных начертаний — где-то с подчёркиванием
// по наведению, где-то без, с тремя разными оттенками в тёмной теме.
// Подчёркивание здесь по hover, а не всегда: сплошь подчёркнутый абзац
// читается тяжело, а отдельная tertiary-кнопка наоборот обязана быть
// подчёркнутой, потому что стоит одна и ей нужно выглядеть кликабельной.
export const INLINE_LINK =
  "text-orange-600 hover:underline dark:text-orange-400";

// Точечное переопределение цвета primary-кнопки (по умолчанию — оранжевый,
// см. правило "кнопки всегда orange" в DESIGN.md). Использовать только для
// осознанных экспериментов/исключений, не как обычный способ красить кнопки.

const paddingBySize: Record<Size, string> = {
  sm: "px-5",
  md: "px-7",
  lg: "px-8",
};

const textBySize: Record<Size, string> = {
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
};

type ButtonProps = {
  children: React.ReactNode;
  variant?: Variant;
  size?: Size;
  href?: string;
  className?: string;
  pageTransition?: boolean;
  target?: string;
  rel?: string;
  onClick?: () => void;
  colorClassName?: string;
  // Только для варианта-<button> (без href): тип для отправки формы и
  // блокировка на время запроса. У ссылки (href) этих понятий нет.
  type?: "button" | "submit";
  disabled?: boolean;
};

export function Button({
  children,
  variant = "primary",
  size = "md",
  href,
  className = "",
  pageTransition = false,
  target,
  rel,
  onClick,
  colorClassName,
  type = "button",
  disabled = false,
}: ButtonProps) {
  // primary и secondary — «таблетки» с горизонтальным паддингом; tertiary
  // это текст-ссылка, ей паддинг не нужен.
  const padding = variant === "tertiary" ? "" : paddingBySize[size];
  const color = colorClassName ?? BUTTON_COLORS[variant];
  const classes = `${base} ${color} ${padding} ${textBySize[size]} ${className}`;

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        target={target}
        rel={rel}
        data-page-transition={pageTransition ? "true" : undefined}
        onClick={onClick}
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={`${classes} disabled:cursor-not-allowed disabled:opacity-60`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
