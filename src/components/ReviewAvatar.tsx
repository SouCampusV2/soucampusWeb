import Image from "next/image";
import { Skeleton } from "@/components/Skeleton";

// Аватар клиента — ОДИН компонент на карусель и на страницу отзыва.
// Два места рисуют одно и то же лицо, и если собирать его в каждом
// отдельно, они разъедутся так же, как разъезжались ссылки «назад»
// (см. шапку BackLink.tsx).
//
// Отзыв бывает от двоих (Luke & Sven) — тогда кружки заходят друг на
// друга, как стопка. Обводка цвета фона (`ringClassName`) отделяет
// верхний от нижнего: без неё два тёмных аватара сливаются в пятно.
// Фон у карусели свой на каждую карточку (orange/lime), поэтому цвет
// обводки задаёт тот, кто рисует, а не компонент.
// Размер — ступенями, а не свободными классами: у каждой ступени своё
// перекрытие второго кружка и своё `sizes` для next/image, и эти три
// числа обязаны меняться вместе. Отступ фиксированный, а не в процентах:
// процент считается от ширины родителя, а родитель здесь сжимается по
// содержимому — ширина зависела бы сама от себя.
const SIZES = {
  sm: { box: "h-10 w-10", overlap: "-ml-3", sizes: "40px" },
  md: { box: "h-14 w-14", overlap: "-ml-4", sizes: "56px" },
  lg: { box: "h-16 w-16 sm:h-20 sm:w-20", overlap: "-ml-5 sm:-ml-6", sizes: "80px" },
} as const;

export function ReviewAvatar({
  avatars,
  name,
  size,
  ringClassName,
  priority = false,
}: {
  avatars: string[];
  name: string;
  size: keyof typeof SIZES;
  ringClassName: string;
  priority?: boolean;
}) {
  // Аватара нет — та же заглушка, что стояла здесь до 24.09. Новый
  // отзыв в базе появляется раньше, чем его картинка в public/.
  const { box, overlap, sizes } = SIZES[size];

  if (avatars.length === 0) {
    return (
      <div className={`${box} shrink-0 overflow-hidden rounded-full`}>
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className="flex shrink-0">
      {avatars.map((src, i) => (
        <div
          key={src}
          // Второй кружок заходит на первый примерно на треть, а не
          // наполовину: у Luke лицо в центре кадра, при половине его
          // закрыло бы соседом.
          className={`relative ${box} overflow-hidden rounded-full ${
            i > 0 ? `${overlap} ring-[3px] ${ringClassName}` : ""
          }`}
        >
          <Image
            src={src}
            // Картинка при одном клиенте — просто его лицо, подпись рядом
            // уже называет имя; при двоих имя в подписи общее.
            alt={avatars.length > 1 ? `${name}, avatar ${i + 1}` : name}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover"
          />
        </div>
      ))}
    </div>
  );
}
