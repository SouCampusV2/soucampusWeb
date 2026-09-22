import Image from "next/image";
import s from "../styles.module.css";

// Картинка, которая «строится» блоками снизу вверх — единственный
// авторский момент страницы.
//
// Как устроено: сама картинка лежит целиком и сразу (next/image с
// priority — LCP не ждёт анимации), а поверх неё сетка квадратов цвета
// неба. Квадраты исчезают по одному: нижний ряд первым, как ставят блоки
// в игре, с небольшим разбросом внутри ряда. Выглядит как постройка,
// растущая от земли.
//
// ⚠️ Компонент СЕРВЕРНЫЙ. Задержки считаются при рендере и уходят в
// разметку как CSS-переменная, анимацию крутит CSS. Ни байта JS в
// браузер — и нечему «мигнуть» при гидратации.
//
// Разброс псевдослучайный, но детерминированный (хэш от номера клетки):
// Math.random() дал бы разный HTML на каждом рендере.
const COLS = 16;
const ROWS = 7;
const ROW_STEP = 0.15; // секунд между рядами
const JITTER = 0.16; // разброс внутри ряда
const START = 0.45; // пауза, чтобы глаз успел увидеть заголовок

function jitter(i: number) {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function BuildReveal({ src, alt }: { src: string; alt: string }) {
  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const i = row * COLS + col;
      const fromGround = ROWS - 1 - row;
      const delay = START + fromGround * ROW_STEP + jitter(i) * JITTER;
      cells.push(
        <span
          key={i}
          className={s.cell}
          style={{ "--d": `${delay.toFixed(3)}s` } as React.CSSProperties}
        />
      );
    }
  }

  return (
    <div className={s.build}>
      <Image
        src={src}
        alt={alt}
        fill
        priority
        sizes="(min-width: 1400px) 1320px, 100vw"
        className={s.buildImg}
      />
      <div
        className={s.cells}
        style={{ "--cols": COLS, "--rows": ROWS } as React.CSSProperties}
        aria-hidden="true"
      >
        {cells}
      </div>
    </div>
  );
}
