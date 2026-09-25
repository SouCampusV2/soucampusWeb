import { Unbounded } from "next/font/google";
import { Button } from "@/components/Button";
import { HeroWorld } from "@/components/HeroWorld";

// KUniforma (как у HoneyFrost) — проприетарный шрифт, файла нет.
// Unbounded — крупный геометричный шрифт, похожий по духу, используем
// для всего заголовка целиком (обе строки).
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

// Первый экран с 24.09: генеративная карта мира во весь экран (HeroWorld,
// перенесена из лаборатории, вариант «Seed»), текст — в стеклянной
// панели слева. Панель стеклянная тем же рецептом, что пилюля навбара
// (полупрозрачный цвет страницы + blur), поэтому следует теме сама.
//
// ⚠️ Секция заезжает ПОД навбар отрицательным отступом ровно на его
// высоту: h-[4.5rem] / sm:h-20 на <nav> в Navbar.tsx ПЛЮС 2px рамки
// (`border` на <header>, по 1px сверху и снизу). Навбар sticky и занимает
// место в потоке, без этого над картой осталась бы полоса фона — до
// 24.09 (вечер) без рамки там и оставалась белая полоска в 2px. Поменяется высота
// навбара или его рамка — меняй и здесь.
//
// Панель прижата к левому КРАЮ ЭКРАНА (px-4 / md:px-12), а не к левому
// краю контейнера навбара (max-w-6xl) — так было в лаборатории, и так
// попросил владелец 24.09: на широком экране карта справа видна шире.
//
// PageGlow здесь больше нет: свечение рисовалось на фоне страницы, а
// фоном теперь служит карта.
export function Hero() {
  return (
    <section className="relative -mt-[calc(4.5rem+2px)] flex min-h-[100dvh] items-end overflow-hidden bg-[#24488a] sm:-mt-[calc(5rem+2px)] md:items-center">
      <HeroWorld />

      <div className="relative w-full px-4 pb-24 pt-32 md:px-12 md:pb-0">
        {/* ⚠️ На тач-экранах размытия нет (pointer-coarse:, 25.09): под
            панелью движется карта, и backdrop-blur пересчитывается на
            каждом кадре по всей её площади — на телефоне это подёргивание
            карты. Вместо размытия фон плотнее (85% вместо 60%), чтобы
            текст читался. Тот же приём у плашки World seed (HeroWorld). */}
        {/* Проявление — CSS-анимацией (animate-hero-in в globals.css), а
            не Motion. У Motion начальный opacity: 0 лежит в серверном HTML,
            а снимает его JS после гидратации: Chrome не считает невидимый
            текст показанным, и LCP ждал весь бандл, хотя заголовок уже
            пришёл с HTML. CSS-анимация стартует с первой отрисовки. */}
        <div
          className="animate-hero-in motion-reduce:animate-none max-w-2xl rounded-3xl border border-zinc-950/[0.06] bg-[#fbfbff]/60 p-7 backdrop-blur-xl sm:p-10 pointer-coarse:bg-[#fbfbff]/85 pointer-coarse:backdrop-blur-none dark:border-zinc-50/[0.08] dark:bg-zinc-950/60 dark:pointer-coarse:bg-zinc-950/85"
        >
          <h1 className="tracking-tight text-zinc-950 dark:text-zinc-50">
            <span
              className={`${displayFont.className} block text-3xl leading-tight sm:text-5xl`}
            >
              SouCampus crafts
            </span>
            <span
              className={`${displayFont.className} mt-3 block text-3xl leading-tight sm:text-5xl`}
            >
              your <span className="text-lime-500">ideas</span> and{" "}
              <span className="text-blue-500">dreams</span>
            </span>
          </h1>

          <p className="mt-6 text-lg text-zinc-600 dark:text-zinc-400">
            I create custom maps, structures and entire worlds in Minecraft —
            from scratch to a breathtaking masterpiece
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Button href="/portfolio" variant="primary" size="md" pageTransition>
              See what I&apos;ve built
            </Button>
            {/* Та же надпись и тот же адрес, что у кнопки в навбаре: обе
                видны на этом экране одновременно, и разные имена у одного
                действия читались бы как два разных предложения. Стрелки
                нет: поворот на -45 означает «уходишь с сайта», а /contact —
                своя страница (см. тот же комментарий в Navbar). */}
            <Button href="/contact" variant="secondary" size="md" pageTransition>
              Order a map
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
