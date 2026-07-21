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
const variants: Record<Variant, string> = {
  primary:
    "rounded-full bg-orange-500 text-zinc-950 hover:bg-orange-600 dark:bg-orange-400 dark:hover:bg-orange-500",
  secondary:
    "rounded-full border-2 border-orange-500 text-orange-500 hover:border-orange-600 hover:text-orange-600 dark:border-orange-400 dark:text-orange-400 dark:hover:border-orange-500 dark:hover:text-orange-500",
  tertiary:
    "text-orange-500 underline decoration-2 underline-offset-4 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-500",
};

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
}: ButtonProps) {
  // primary и secondary — «таблетки» с горизонтальным паддингом; tertiary
  // это текст-ссылка, ей паддинг не нужен.
  const padding = variant === "tertiary" ? "" : paddingBySize[size];
  const color = colorClassName ?? variants[variant];
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
    <button type="button" className={classes} onClick={onClick}>
      {children}
    </button>
  );
}
