import type { Metadata } from "next";
import { LandingLab } from "@/components/lab/LandingLab";
import { getAllProjects } from "@/lib/projects";
import { getAllReviews } from "@/lib/reviews";
import { getStats } from "@/lib/stats";

// Лаборатория лендинга — только на ветке design-lab.
//
// Страница живёт внутри группы (site), то есть с обычным навбаром и
// футером. Это не лень: вариант лендинга надо смотреть в той же
// оболочке, в которой он будет жить, иначе сравнение нечестное —
// половина ощущения от первого экрана идёт от навбара над ним.
//
// ⚠️ noindex. Страница не должна попасть в поиск: это черновик, а не
// раздел сайта. В sitemap она тоже не добавлена — намеренно.
export const metadata: Metadata = {
  title: "Landing lab",
  robots: { index: false, follow: false },
};

export default async function LabPage() {
  // Те же данные, что у настоящей главной, и теми же функциями.
  // Подставлять сюда выдуманные проекты нельзя: макет, который хорошо
  // выглядит на ровных подписях в три слова, рассыпается на настоящем
  // названии в сорок символов — и узнаётся это уже после переноса.
  const [projects, reviews, stats] = await Promise.all([
    getAllProjects(),
    getAllReviews(),
    getStats(),
  ]);

  return (
    <main className="flex flex-1 flex-col">
      <LandingLab projects={projects} reviews={reviews} stats={stats} />
    </main>
  );
}
