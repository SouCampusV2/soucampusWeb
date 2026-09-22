import type { Metadata, Viewport } from "next";
import { getAllProjects } from "@/lib/projects";
import { getAllReviews } from "@/lib/reviews";
import { getStats } from "@/lib/stats";
import { VARIANTS } from "./_variants";
import { LabSwitcher } from "./_shared/LabSwitcher";
import { isLabPage } from "./_shared/pages";

// Лаборатория лендинга, вторая версия (ветка design-lab, 2026-09-21).
//
// Двадцать пять лендингов, по одному на каждый привезённый скилл. Каждый
// строится строго по правилам СВОЕГО скилла — это не «пятнадцать
// вкусов одного автора», а пятнадцать ответов на вопрос «что сделал бы
// этот скилл, если дать ему нашу главную целиком».
//
// ⚠️ Страница вне группы (site): без навбара, футера, волны перехода.
// У каждого варианта своя шапка и подвал — это часть дизайна, и
// сравнивать варианты под нашим навбаром было бы нечестно.
//
// Страница студии — второй параметр (?p=portfolio|contact|about). Её
// рисует тот же вариант, если он её умеет (поле pages); не умеет —
// показывается лендинг. Отсутствующая страница не должна давать 404:
// переключатель сохраняет ?p= при переходе между вариантами.
//
// Выбор варианта — в адресе (?v=slug), рендерит его СЕРВЕР: в браузер
// уезжает только выбранный вариант со своими клиентскими кусками, а не
// все двадцать пять сразу. Ссылку на конкретный вариант можно переслать.
//
// noindex и нет в sitemap — черновик, а не раздел сайта.
export const metadata: Metadata = {
  title: "Landing lab",
  robots: { index: false, follow: false },
};

// viewport-fit=cover — без него env(safe-area-inset-*) всегда 0, и
// вариант mobile-native не смог бы отодвинуть нижнюю панель от «чёлки»
// и полоски жестов. Остальным вариантам это ничего не меняет.
export const viewport: Viewport = {
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default async function LabPage({
  searchParams,
}: {
  searchParams: Promise<{ v?: string; p?: string }>;
}) {
  const [{ v, p }, projects, reviews, stats] = await Promise.all([
    searchParams,
    getAllProjects(),
    getAllReviews(),
    getStats(),
  ]);

  const index = Math.max(0, VARIANTS.findIndex((variant) => variant.slug === v));
  const current = VARIANTS[index];
  const page = isLabPage(p) && p !== "home" && current.pages?.[p] ? p : "home";
  const Variant = page === "home" ? current.Component : current.pages![page]!;

  return (
    <>
      {/* key: при смене варианта React не пытается «переиспользовать»
          дерево прошлого — у разных вариантов нет ничего общего. */}
      <Variant key={`${current.slug}/${page}`} data={{ projects, reviews, stats }} />
      <LabSwitcher
        current={index}
        page={page}
        variants={VARIANTS.map(({ slug, label, skill, idea, pages }) => ({
          slug,
          label,
          skill,
          idea,
          pages: pages ? (Object.keys(pages) as (keyof typeof pages)[]) : [],
        }))}
        bottom={current.switcherBottom}
      />
    </>
  );
}
