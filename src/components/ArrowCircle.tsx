type Props = {
  direction?: "left" | "right";
  className?: string;
  colorClassName?: string;
  label?: string;
};

// Общая иконка стрелки в кружке — используется и в ClientReviews (кнопки
// карусели), и в PricingSection (декоративная стрелка на карточках плана).
// "left" — то же самое изображение, отзеркаленное через scaleX(-1).
// colorClassName — переопределяет фон/цвет/hover кружка целиком (дефолт —
// тёмный кружок с белой иконкой, чуть светлее на hover). Для акцентных
// цветов сюда передаётся hover: на шаг темнее, как у primary-кнопки
// (например "bg-orange-400 hover:bg-orange-500 text-white").
// label — необязательный текст слева от кружка, цвет — text-zinc-950
// font-semibold (как у текста primary-кнопки).
export function ArrowCircle({
  direction = "right",
  className = "",
  colorClassName = "bg-zinc-950 hover:bg-zinc-800 text-white",
  label,
}: Props) {
  const circle = (
    <span
      className={`flex cursor-pointer items-center justify-center rounded-full transition-colors ${colorClassName} ${className}`}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="currentColor"
        aria-hidden="true"
        style={direction === "left" ? { transform: "scaleX(-1)" } : undefined}
      >
        <path d="m13.293 4.707 6.293 6.293a1 1 0 0 1 0 1.414l-6.293 6.293-1.414-1.414L16.586 13H4v-2h12.586l-4.707-4.879 1.414-1.414z" />
      </svg>
    </span>
  );

  if (!label) return circle;

  return (
    <span className="inline-flex items-center gap-3">
      <span className="font-semibold text-zinc-950">{label}</span>
      {circle}
    </span>
  );
}
