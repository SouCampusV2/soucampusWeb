import type { Metadata } from "next";
import Link from "next/link";
import { Unbounded } from "next/font/google";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Page not found",
  // Битый адрес в выдаче не нужен. Статус 404 Next отдаёт и без этого,
  // но краулер, добравшийся сюда по старой ссылке, получает и прямой
  // запрет — дешевле, чем ждать, пока он поверит статусу.
  robots: { index: false, follow: true },
};

// ЕДИНСТВЕННАЯ 404 НА ВЕСЬ САЙТ (решение владельца 2026-09-06).
//
// ⚠️ Файл в группе (site) УДАЛЁН НАМЕРЕННО, и это не упрощение, а способ
// добиться заказанного. Пока он существовал, notFound() со страницы
// внутри группы рисовался ВНУТРИ (site)/layout.tsx, то есть с навбаром,
// тарифами и футером — от них там было не избавиться. Без него ближайшей
// границей становится этот файл, а он лежит выше группы и её оболочку не
// наследует. Отсюда правило: **не заводить (site)/not-found.tsx снова** —
// он вернёт навбар обоим случаям молча.
//
// Что здесь СОЗНАТЕЛЬНО отсутствует:
//   • навбар и футер — человек попал не туда, и предлагать ему меню
//     магазина значит отвечать не на тот вопрос;
//   • CartProvider — он был нужен только навбару, а навбара больше нет;
//   • PageTransition — анимация перехода живёт в (site), и проигрывать
//     ей здесь нечего.
//
// Вся страница — одна ссылка. Цифра и есть кнопка: делать под ней ещё и
// «вернуться на главную» значило бы предложить два способа сделать одно
// и то же, а на экране, где всего два элемента, второй способ лишний.
export default function NotFound() {
  return (
    <Link
      href="/"
      aria-label="Go to the homepage"
      className="group flex min-h-screen w-full cursor-pointer flex-col items-center justify-center gap-4 px-6 text-center"
    >
      {/* Размер в vw, а не в rem: цифра должна занимать экран целиком на
          любой ширине — на телефоне это ~90% ширины, на мониторе тоже.
          leading-none и tracking убирают воздух, который на таком кегле
          превращается в пустые поля сверху и снизу. */}
      <span
        className={`${displayFont.className} select-none text-[38vw] font-extrabold leading-none tracking-tighter text-zinc-950 transition-colors group-hover:text-orange-500 dark:text-zinc-50 dark:group-hover:text-orange-400 sm:text-[30vw]`}
      >
        404
      </span>

      <span className="max-w-md text-sm text-zinc-500 dark:text-zinc-400 sm:text-base">
        This page wasn&apos;t crafted on our site.
      </span>
    </Link>
  );
}
