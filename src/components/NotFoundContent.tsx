import { Unbounded } from "next/font/google";
import { Compass } from "@phosphor-icons/react/dist/ssr";
import { Button, INLINE_LINK } from "@/components/Button";
import { PageGlow } from "@/components/PageGlow";

// Тело страницы «адрес не найден», без навбара и футера.
//
// Вынесено в компонент, потому что у 404 ДВА входа, и chrome у них разный:
//   • src/app/not-found.tsx — несуществующий адрес где угодно на сайте.
//     Next рендерит его в КОРНЕВОМ layout, где нет ни навбара, ни футера
//     (они живут в (site)/layout.tsx), поэтому обвязку тот файл добавляет
//     себе сам.
//   • src/app/(site)/not-found.tsx — notFound(), вызванный из страницы
//     внутри группы (site): снятая карта, чужой профиль, битый slug.
//     Там обвязка приходит от layout'а, и добавлять её второй раз нельзя.
// Текст и вёрстка при этом обязаны быть одни и те же — иначе два разных
// «404» на одном сайте.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

export function NotFoundContent() {
  return (
    // Клип на полноширинном <main>, ограничение ширины — на секции внутри:
    // требование PageGlow, иначе max-w-* отрежет свечение по бокам.
    <main className="relative w-full grow overflow-x-clip px-6">
      <section className="relative mx-auto flex max-w-3xl flex-col items-start py-24 sm:py-32">
        <PageGlow color="rgba(251,146,60,0.35)" />

        <Compass size={40} weight="duotone" className="text-orange-400" />

        <span className="mt-6 text-sm font-semibold text-orange-500">
          Error 404
        </span>
        <h1
          className={`${displayFont.className} mt-3 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
        >
          This page doesn&apos;t exist
        </h1>
        <p className="mt-4 max-w-xl text-zinc-600 dark:text-zinc-400">
          The link is either mistyped, or it pointed at something that has
          since been moved or taken down.
        </p>

        {/* Отдельный абзац про покупки — самый частый честный способ сюда
            попасть у вошедшего человека: автор удалил карту, а ссылка на
            неё осталась в списке покупок. Без этой строки он видел бы
            «страницы не существует» и решил, что потерял купленное. */}
        <p className="mt-3 max-w-xl text-sm text-zinc-500 dark:text-zinc-400">
          Came here from a map you bought? The map page is gone, but your
          download isn&apos;t — it stays in{" "}
          <a href="/purchases" className={INLINE_LINK}>
            My purchases
          </a>
          . If the file is missing there too, message us and we&apos;ll send
          it over.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button href="/" size="lg">
            Back home
          </Button>
          <Button href="/portfolio" variant="secondary" size="lg">
            See the portfolio
          </Button>
          <Button href="/marketplace" variant="tertiary">
            Browse maps
          </Button>
        </div>
      </section>
    </main>
  );
}
