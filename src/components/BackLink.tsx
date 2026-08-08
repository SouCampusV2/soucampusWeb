import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import {
  Button,
  TERTIARY_COLORS,
  TERTIARY_UNDERLINE,
} from "@/components/Button";

// Ссылка «назад» — ОДНА на весь сайт.
//
// До 2026-08-08 таких ссылок было пять, и все пять были собраны отдельно:
// `← All work` на работе портфолио, `← All products` на товаре, `← Home` на
// отзыве, `← Your resources` в правке карты, плюс «Back to shop» уже вовсе
// без стрелки. Каждая со своим набором классов — разъехались подчёркивание,
// оттенок в тёмной теме и размер текста. Та же болезнь, что была у градиента
// (семь копий) и у белого списка санитайзера (две копии): правило есть,
// но каждый новый экран собирает его заново.
//
// Стрелка — иконка Phosphor, а не текстовый символ `←` (решение владельца
// 2026-08-08). Символ берёт начертание из шрифта: он не выравнивается по
// оптической середине строки, не масштабируется вместе с текстом и в разных
// системах рисуется по-разному. `ArrowCircle` здесь не подходит — он про
// стрелку-кружок как самостоятельный элемент, а тут иконка внутри строки.
//
// Сам вид берётся у `Button variant="tertiary"` — то есть подчёркивание,
// оранжевый акцент и общая для всех кнопок текстовая шкала приезжают
// оттуда и правятся в одном месте.
export function BackLink({
  href,
  children,
  /** ?from=home и подобное: страница сама решает, куда возвращать. */
  pageTransition = false,
}: {
  href: string;
  children: React.ReactNode;
  pageTransition?: boolean;
}) {
  return (
    <Button
      href={href}
      variant="tertiary"
      size="sm"
      pageTransition={pageTransition}
      // Цвет без подчёркивания: черта уходит на текст, иначе она
      // проезжает и под стрелкой (см. TERTIARY_UNDERLINE в Button.tsx).
      colorClassName={TERTIARY_COLORS}
      // gap-2 — тот же способ развести иконку и текст, что уже применён у
      // кнопок с иконкой (см. «Open Discord» на /contact).
      className="group gap-2"
    >
      {/* group-hover сдвигает стрелку влево — направление подсказывает, что
          произойдёт по клику. Тот же приём, что поворот стрелки у
          ArrowCircle: анимируется иконка, а не сама кнопка. */}
      <ArrowLeft
        size={16}
        weight="bold"
        className="transition-transform group-hover:-translate-x-1"
      />
      <span className={TERTIARY_UNDERLINE}>{children}</span>
    </Button>
  );
}
