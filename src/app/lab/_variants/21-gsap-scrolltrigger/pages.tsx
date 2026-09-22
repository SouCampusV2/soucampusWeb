import { DISCORD_INVITE, noDash, type LabData } from "../../_shared/content";
import type { Project } from "@/lib/projects";
import { archivo } from "./font";
import { ScrollAbout, ScrollContact, ScrollPortfolio } from "./scenes";

// Страницы студии варианта Scroll — серверные обёртки: шрифт и данные из
// базы. Сами сцены клиентские (scenes.tsx): ScrollTrigger живёт в браузере.

const toBuild = (p: Project) => ({
  slug: p.slug,
  title: p.title,
  tag: p.tag,
  image: p.image,
  size: p.size,
  deadline: p.deadline,
  summary: noDash(p.summary),
});

export function ScrollPortfolioPage({ data }: { data: LabData }) {
  const featured = data.projects.filter((p) => p.isFeatured);
  const rest = data.projects.filter((p) => !p.isFeatured);
  // Сетка 3×3 для отъезда камеры: центр (индекс 4) — первая избранная,
  // вокруг — следующие работы по порядку.
  const [hero, ...others] = featured.length ? [featured[0], ...data.projects.filter((p) => p !== featured[0])] : data.projects;
  const ring = others.slice(0, 8);
  const grid = [...ring.slice(0, 4), hero, ...ring.slice(4)];

  return (
    <div className={archivo.variable}>
      <ScrollPortfolio grid={grid.map(toBuild)} featured={featured.map(toBuild)} rest={rest.map(toBuild)} />
    </div>
  );
}

export function ScrollContactPage() {
  return (
    <div className={archivo.variable}>
      <ScrollContact discord={DISCORD_INVITE} />
    </div>
  );
}

export function ScrollAboutPage() {
  return (
    <div className={archivo.variable}>
      <ScrollAbout />
    </div>
  );
}
