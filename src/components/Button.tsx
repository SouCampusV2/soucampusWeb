import Link from "next/link";

type Variant = "primary" | "secondary";
type Size = "sm" | "md" | "lg";

// h-14 (56px) на sm:+ — фиксированная высота ВСЕХ кнопок независимо от
// size/variant и от содержимого (текст, иконка, текст+иконка). Раньше высота
// задавалась вертикальным паддингом (py-*), из-за чего кнопка с иконкой
// внутри (см. "Join Discord" на /contact) становилась выше обычной текстовой
// кнопки того же size — паддинг теперь только горизонтальный. На мобильном
// (< 640px) кнопка немного компактнее (h-12/48px) — h-14 ощущается слишком
// массивной на телефоне.
const base =
  "inline-flex h-12 cursor-pointer items-center justify-center font-semibold transition-transform hover:scale-105 sm:h-14";

const variants: Record<Variant, string> = {
  primary: "rounded-full bg-orange-400 text-zinc-950 hover:bg-orange-500",
  secondary:
    "text-orange-500 underline decoration-2 underline-offset-4 hover:text-orange-600",
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
  const padding = variant === "primary" ? paddingBySize[size] : "";
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
