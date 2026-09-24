"use client";

import { motion } from "motion/react";
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
// высоту (h-[4.5rem] / sm:h-20 на <nav> в Navbar.tsx): навбар sticky и
// занимает место в потоке, без этого над картой осталась бы полоса
// фона. Поменяется высота навбара — меняй и здесь.
//
// Панель прижата к левому КРАЮ ЭКРАНА (px-4 / md:px-12), а не к левому
// краю контейнера навбара (max-w-6xl) — так было в лаборатории, и так
// попросил владелец 24.09: на широком экране карта справа видна шире.
//
// PageGlow здесь больше нет: свечение рисовалось на фоне страницы, а
// фоном теперь служит карта.
export function Hero() {
  return (
    <section className="relative -mt-[4.5rem] flex min-h-[100dvh] items-end overflow-hidden bg-[#24488a] sm:-mt-20 md:items-center">
      <HeroWorld />

      <div className="relative w-full px-4 pb-24 pt-32 md:px-12 md:pb-0">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="max-w-2xl rounded-3xl border border-zinc-950/[0.06] bg-[#fbfbff]/85 p-7 backdrop-blur-xl sm:p-10 dark:border-zinc-50/[0.08] dark:bg-zinc-950/80"
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
        </motion.div>
      </div>
    </section>
  );
}
