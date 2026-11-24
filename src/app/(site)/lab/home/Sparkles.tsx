// Звёздочки-искры на фоне (лаборатория 24.11, по образцу legko.company).
// Четырёхлучевая звезда SVG, мерцает со своей задержкой. Позиции заданы
// списком, а не случайно: случайные прыгали бы между сервером и браузером.

type Spark = { top: string; left: string; size: number; delay: number };

const DEFAULT: Spark[] = [
  { top: "14%", left: "6%", size: 22, delay: 0 },
  { top: "70%", left: "12%", size: 10, delay: 1.2 },
  { top: "22%", left: "48%", size: 8, delay: 0.6 },
  { top: "80%", left: "37%", size: 12, delay: 2.1 },
  { top: "18%", left: "88%", size: 14, delay: 1.6 },
  { top: "76%", left: "92%", size: 18, delay: 0.3 },
  { top: "45%", left: "70%", size: 7, delay: 2.6 },
];

export function SparkleStar({ size, className = "", style }: { size: number; className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden className={className} style={style}>
      <path d="M12 0c.6 6.6 5.4 11.4 12 12-6.6.6-11.4 5.4-12 12-.6-6.6-5.4-11.4-12-12C6.6 11.4 11.4 6.6 12 0Z" fill="currentColor" />
    </svg>
  );
}

export function Sparkles({ sparks = DEFAULT, className = "text-white" }: { sparks?: Spark[]; className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 ${className}`}>
      {sparks.map((s, i) => (
        <SparkleStar
          key={i}
          size={s.size}
          className="absolute animate-[twinkle_3.2s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ top: s.top, left: s.left, animationDelay: `${s.delay}s` }}
        />
      ))}
      <style>{`@keyframes twinkle{0%,100%{opacity:.25;transform:scale(.7) rotate(0)}50%{opacity:1;transform:scale(1) rotate(45deg)}}`}</style>
    </div>
  );
}
