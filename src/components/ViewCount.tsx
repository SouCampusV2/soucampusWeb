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
    // text-xs + leading-4 + иконка 14 — ровно та же высота строки, что у
    // бейджа с типом работы рядом (text-xs, py-1): два значка на карточке
    // должны стоять на одной линии и быть одного роста.
    <span
      className={`inline-flex items-center gap-1.5 text-xs leading-4 ${className}`}
    >
      {/* weight="fill", не "duotone": у duotone поверх заливки идёт ещё и
          обводка, и на мелком размере глаз читает её как странный ореол
          вокруг иконки. Сплошной силуэт спокойнее. */}
      <Eye size={14} weight="fill" aria-hidden className="shrink-0" />
      {/* tabular-nums — цифры одинаковой ширины: без него счётчик
          дёргается по горизонтали, когда 999 становится 1,000. */}
      <span className="font-semibold tabular-nums">
        {count.toLocaleString("en-US")}
      </span>
      {/* Верхний регистр с разрядкой — как у бейджа типа работы, чтобы
          пара читалась как один набор значков, а не два чужих элемента.
          Приглушение через opacity, а не отдельным цветом: бейдж кладут
          на разные фоны, и прозрачность подстроится под любой. */}
      {label ? (
        <span aria-hidden className="uppercase tracking-wide opacity-60">
          {label}
        </span>
      ) : null}
      <span className="sr-only"> unique views</span>
    </span>
  );
}
