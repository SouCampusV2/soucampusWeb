import { Eye } from "@phosphor-icons/react/dist/ssr";

// Серверный компонент (импорт из /dist/ssr, как в terms/page.tsx) —
// это просто число с иконкой, ничего интерактивного, значит и грузить
// ради него JS в браузер незачем.
export function ViewCount({
  count,
  className = "",
}: {
  count: number | undefined;
  className?: string;
}) {
  // Пока страницу не открыл ни один человек, "0 views" выглядит хуже,
  // чем ничего: пустое место читается как "счётчика тут нет", а ноль —
  // как "работа никому не интересна". Показываем, когда есть что.
  if (!count) return null;

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-medium tabular-nums ${className}`}
    >
      <Eye size={14} weight="duotone" aria-hidden />
      {/* toLocaleString ставит разделители разрядов: 1240 -> "1,240".
          Локаль задана явно ("en-US"), а не оставлена на усмотрение
          системы: иначе сервер и браузер посетителя могли бы отформатировать
          число по-разному, и React пожаловался бы на расхождение. */}
      {count.toLocaleString("en-US")}
      <span className="sr-only"> unique views</span>
    </span>
  );
}
