type Props = {
  direction?: "left" | "right";
  className?: string;
  colorClassName?: string;
  label?: string;
  /** "circle" (default) — icon inside a colored circle. "bare" — just the
   * arrow glyph, no circle/background, sized by className (e.g. h-6 w-6). */
  variant?: "circle" | "bare";
};

// Общая иконка стрелки — используется и в ClientReviews (кнопки карусели),
// и в PricingSection (декоративная стрелка на карточках плана), и как
// "голая" стрелка без кружка (например рядом с текстом кнопки).
// "left" — то же самое изображение, отзеркаленное через scaleX(-1).
// colorClassName — переопределяет фон/цвет/hover кружка целиком (дефолт —
// тёмный кружок с белой иконкой, чуть светлее на hover). Для акцентных
// цветов сюда передаётся hover: на шаг темнее, как у primary-кнопки
// (например "bg-orange-400 hover:bg-orange-500 text-white"). В варианте
// "bare" сюда передаётся просто цвет текста (например "text-zinc-950").
// label — необязательный текст слева от кружка, цвет — text-zinc-950
// font-semibold (как у текста primary-кнопки).
export function ArrowCircle({
  direction = "right",
  className = "",
  colorClassName = "bg-zinc-950 hover:bg-zinc-800 text-white dark:bg-zinc-50 dark:hover:bg-zinc-200 dark:text-zinc-950",
  label,
  variant = "circle",
}: Props) {
  const svg = (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={variant === "bare" ? `shrink-0 ${colorClassName} ${className}` : undefined}
      width={variant === "circle" ? 18 : undefined}
      height={variant === "circle" ? 18 : undefined}
      style={direction === "left" ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="m13.293 4.707 6.293 6.293a1 1 0 0 1 0 1.414l-6.293 6.293-1.414-1.414L16.586 13H4v-2h12.586l-4.707-4.879 1.414-1.414z" />
    </svg>
  );

  const circle =
    variant === "bare" ? (
      svg
    ) : (
      <span
        className={`flex cursor-pointer items-center justify-center rounded-full transition-colors ${colorClassName} ${className}`}
      >
        {svg}
      </span>
    );

  if (!label) return circle;

  return (
    <span className="inline-flex items-center gap-3">
      <span className="font-semibold text-zinc-950 dark:text-zinc-50">{label}</span>
      {circle}
    </span>
  );
}
