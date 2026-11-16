import type { Metadata } from "next";
import Link from "next/link";
import { Unbounded } from "next/font/google";
import { ChunkFlower } from "@/components/brand/ChunkFlower";
import { Navbar } from "@/components/Navbar";
import { ContactFooter } from "@/components/ContactFooter";
import { CartProvider } from "@/lib/cart-context";

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
// ⚠️ Файл в группе (site) УДАЛЁН НАМЕРЕННО: пока он существовал,
// notFound() со страницы внутри группы рисовался ВНУТРИ (site)/layout.tsx —
// с тарифами и анимацией перехода. Этот файл лежит выше группы и её
// оболочку не наследует, поэтому всё нужное он собирает сам. Правило
// прежнее: **не заводить (site)/not-found.tsx снова**.
//
// Навбар и футер ЕСТЬ с 17.11 (решение владельца): навбар теперь один на
// весь сайт, и без него 404 выглядела чужой страницей. До этого (с 06.09)
// их здесь сознательно не было. CartProvider нужен навбару — бейдж корзины.
// Чего здесь по-прежнему нет: тарифов (PricingSection) — на 404 они не к
// месту, и PageTransition — анимации перехода тут нечего проигрывать.
//
// Цифры с цветком и есть кнопка на главную: делать под ней ещё и «вернуться на
// главную» значило бы предложить два способа сделать одно и то же.
//
// Строка про покупки (возвращена 2026-11-14, решение владельца). Сюда
// попадает и покупатель, который из /purchases кликнул по карте, снятой
// с витрины. Для него голая «404» читается как «покупка пропала», хотя
// скачивание остаётся (getPurchasesForUser на state не смотрит). Строка
// стоит ОТДЕЛЬНО от ссылки-цифры: ссылка внутри ссылки — невалидный HTML.
export default function NotFound() {
  return (
    <CartProvider>
      <Navbar />
      {/* flex-1: body — колонка на всю высоту окна (корневой layout), main
          забирает всё место между навбаром и футером, цифры — посередине. */}
      <main className="flex w-full flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <Link
          href="/"
          aria-label="Go to the homepage"
          className="group flex cursor-pointer flex-col items-center gap-4"
        >
          {/* «4 · цветок · 4» с 16.11 (лаборатория бренда, вариант 404-2):
              вместо нуля — цветок SouCampus, который «не догрузился», как
              чанк. Размер в vw, а не в rem: цифры занимают экран на любой
              ширине. Цветок — em от того же кегля, поэтому растёт вместе с
              цифрами; 0.72em — высота прописной цифры у Unbounded. */}
          <span
            className={`${displayFont.className} flex select-none items-center gap-[0.04em] text-[34vw] font-extrabold leading-none tracking-tighter text-zinc-950 transition-colors group-hover:text-orange-500 dark:text-zinc-50 dark:group-hover:text-orange-400 sm:text-[26vw]`}
          >
            4
            <ChunkFlower className="size-[0.72em]" />
            4
          </span>
  
          <span className="max-w-md text-sm text-zinc-500 dark:text-zinc-400 sm:text-base">
            This chunk hasn&apos;t loaded yet.
          </span>
        </Link>
  
        <p className="max-w-md text-xs text-zinc-500 dark:text-zinc-400 sm:text-sm">
          Bought a map that&apos;s no longer listed? Your download is still in{" "}
          <Link
            href="/purchases"
            className="font-medium text-zinc-950 underline underline-offset-4 hover:text-orange-500 dark:text-zinc-50 dark:hover:text-orange-400"
          >
            My purchases
          </Link>
          .
        </p>
      </main>
      <ContactFooter />
    </CartProvider>
  );
}
