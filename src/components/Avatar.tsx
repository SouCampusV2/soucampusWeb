import { UserCircle } from "@phosphor-icons/react/dist/ssr";

// Аватар пользователя: настоящая картинка, если она загружена, иначе
// иконка-заглушка ТОГО ЖЕ размера.
//
// ПОЧЕМУ ОТДЕЛЬНЫЙ ФАЙЛ. Этот рисовальщик жил внутри Navbar.tsx приватной
// функцией, и когда аватар понадобился под комментариями, выбор был
// между копией и переездом. Копию проект уже проходил дважды — семью
// копиями свечения (PageGlow) и семью способами напечатать дату
// (lib/dates.ts), — и оба раза они разъезжались молча: чинили одну,
// остальные шесть оставались сломанными.
//
// ПОЧЕМУ ЗАГЛУШКА ТОГО ЖЕ РАЗМЕРА. Иначе строка дёргается в тот момент,
// когда картинка догружается: место под неё должно быть занято заранее.
//
// ⚠️ ПОЧЕМУ <img>, А НЕ next/image. Аватары лежат в Storage под адресом,
// который заранее не известен, а next/image требует перечислить домены и
// на каждый файл поднимает свою оптимизацию. Для картинки в 24 пикселя
// это дороже самой картинки. Правило то же, что стояло в Navbar.

export function Avatar({
  avatarUrl,
  size,
  className = "",
}: {
  avatarUrl: string | null;
  size: number;
  className?: string;
}) {
  if (!avatarUrl) {
    return <UserCircle size={size} className={`shrink-0 ${className}`} />;
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt=""
      style={{ height: size - 2, width: size - 2 }}
      className={`shrink-0 rounded-full object-cover object-top ${className}`}
    />
  );
}
