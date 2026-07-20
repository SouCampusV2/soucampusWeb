import { Eye } from "@phosphor-icons/react/dist/ssr";

// Серверный компонент (импорт из /dist/ssr, как в terms/page.tsx) —
// это просто число с иконкой, ничего интерактивного, значит и грузить
// ради него JS в браузер незачем.
export function ViewCount({
  count,
  label = "Views",
  className = "",
}: {
  count: number | undefined;
  /** Подпись после числа. Передать "" чтобы показать только цифру. */
  label?: string;
  className?: string;
}) {
  // Пока страницу не открыл ни один человек, "0 Views" выглядит хуже,
  // чем ничего: пустое место читается как "счётчика тут нет", а ноль —
  // как "работа никому не интересна". Показываем, когда есть что.
  if (!count) return null;

  return (
    <span
      className={`inline-flex items-center gap-2 text-sm leading-none ${className}`}
    >
      <Eye size={18} weight="duotone" aria-hidden className="shrink-0" />
      {/* tabular-nums — цифры одинаковой ширины: без него счётчик
          дёргается по горизонтали, когда 999 становится 1,000. */}
      <span className="font-semibold tabular-nums">
        {count.toLocaleString("en-US")}
      </span>
      {/* Подпись приглушена относительно числа: важна цифра, слово —
          подсказка. opacity, а не отдельный цвет, чтобы бейдж одинаково
          работал на любом фоне, куда его поставят. */}
      {label ? (
        <span aria-hidden className="opacity-70">
          {label}
        </span>
      ) : null}
      <span className="sr-only"> unique views</span>
    </span>
  );
}
