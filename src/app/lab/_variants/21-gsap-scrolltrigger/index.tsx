import {
  COUNTRIES,
  DISCORD_INVITE,
  HERO,
  PLANS,
  PLANS_NOTE,
  SOCIALS,
  STEPS,
  noDash,
  pickWork,
  type LabData,
} from "../../_shared/content";
import { labLink } from "../../_shared/pages";
import { SLUG } from "./chrome";
import { ScrollPage } from "./client";
import { archivo } from "./font";

// Вариант 21 — gsap-scrolltrigger (официальный скилл GreenSock).
//
// Страница, где скролл — режиссёр: закреплённый hero, в котором
// картинка раскрывается из окошка на весь экран, горизонтальная лента
// работ с параллаксом внутри карточек, закреплённые шаги с растущей
// полосой, отзывы батчем и финальная фраза, заливаемая цветом.
// Библиотека: gsap + @gsap/react (useGSAP). Подробности — в client.tsx.

export function GsapScrollTrigger({ data }: { data: LabData }) {
  const { projects, reviews, stats } = data;
  const work = pickWork(projects, 7);

  return (
    <div className={archivo.variable}>
      <ScrollPage
        hero={{
          title: HERO.title,
          lede: HERO.lede,
          primary: { label: HERO.primary.label, href: labLink(SLUG, HERO.primary.href) },
          secondary: { label: HERO.secondary.label, href: labLink(SLUG, HERO.secondary.href) },
        }}
        heroImage={(work[0] ?? projects[0]).image}
        stats={stats.map((x) => ({ id: x.id, value: x.value, suffix: x.suffix, label: x.label }))}
        builds={work.map((p) => ({ slug: p.slug, title: p.title, tag: p.tag, image: p.image, size: p.size }))}
        steps={STEPS.map((x) => ({ ...x }))}
        reviews={reviews.slice(0, 6).map((r) => ({ slug: r.slug, name: r.name, role: r.role, text: noDash(r.text) }))}
        plans={PLANS.map((x) => ({ ...x }))}
        plansNote={PLANS_NOTE}
        countries={COUNTRIES.map((c) => ({ ...c }))}
        socials={SOCIALS.map((x) => ({ ...x }))}
        discord={DISCORD_INVITE}
      />
    </div>
  );
}
