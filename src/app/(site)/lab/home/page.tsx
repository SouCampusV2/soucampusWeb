// ⚠️ ЛАБОРАТОРИЯ главной (24.11): варианты Recent projects и того, чем
// заменить «Choose your plan» внизу страниц. Владелец называет номера —
// выбранное переносится в настоящие компоненты, папка lab/home удаляется.
// На проде страницы нет (notFound), поиску закрыта.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllProjects } from "@/lib/projects";
import { getAllProducts } from "@/lib/products";
import { getAllUpdates } from "@/lib/updates";
import { PortfolioHero } from "@/components/PortfolioHero";
import { RecentProjects } from "@/components/RecentProjects";
import { RecentBento, RecentLift, RecentPolaroids, RecentShowcase } from "./RecentVariants";
import { EndDiscord, EndFresh, EndOrder, EndPrice, type FreshItem } from "./EndVariants";

export const metadata: Metadata = { title: "Home lab", robots: { index: false, follow: false } };

function Chapter({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto max-w-6xl px-6 pt-24">
      <h1 className="text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{title}</h1>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">{text}</p>
    </div>
  );
}

function Label({ n, name, note }: { n: string; name: string; note?: string }) {
  return (
    <div className="mx-auto mt-20 max-w-6xl px-6 pb-6">
      <p className="flex flex-wrap items-baseline gap-3">
        <span className="rounded-full bg-orange-500 px-3 py-1 text-sm font-bold text-zinc-950">{n}</span>
        <span className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">{name}</span>
        {note && <span className="text-sm text-zinc-500 dark:text-zinc-400">{note}</span>}
      </p>
    </div>
  );
}

export default async function HomeLab() {
  if (process.env.VERCEL_ENV === "production") notFound();

  const [projects, products] = await Promise.all([getAllProjects(), getAllProducts()]);
  const newest = [...projects].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const post = getAllUpdates()[0];
  const map = [...products].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  const fresh: FreshItem[] = [
    ...(post ? [{ label: "What's new", title: post.title, href: `/updates/${post.slug}`, image: post.cover.src }] : []),
    ...(map ? [{ label: "New on the marketplace", title: map.title, href: `/marketplace/${map.slug}`, image: map.image }] : []),
    ...(newest[0] ? [{ label: "Latest work", title: newest[0].title, href: `/portfolio/${newest[0].slug}`, image: newest[0].image }] : []),
  ];

  return (
    <main className="flex-1 pb-32">
      <Chapter
        title="Recent projects"
        text="Как сейчас — для сравнения, потом варианты. Наведение без увеличения картинки: у каждого варианта свой эффект — наведите на карточки."
      />
      <Label n="Р0" name="Как сейчас" note="Три карточки, при наведении картинка увеличивается" />
      <RecentProjects projects={projects} />

      <Label n="Р1" name="Как на странице портфолио" note="Тот же блок, что на /portfolio: наведение показывает работу крупно" />
      <PortfolioHero projects={newest.slice(0, 8)} />

      <Label n="Р2" name="Бенто: одна большая, две рядом" note="Наведение: оранжевая рамка, фото светлеет, выезжает описание" />
      <RecentBento projects={newest} />

      <Label n="Р3" name="Витрина с лентой" note="Листается сама; наведите на миниатюру — она встанет крупно" />
      <RecentShowcase projects={newest} />

      <Label n="Р4" name="Карточки поднимаются" note="Высокие фото, плашка поверх; наведение: карточка подпрыгивает, выезжает описание" />
      <RecentLift projects={newest} />

      <Label n="Р5" name="Фото на столе" note="Полароиды внахлёст под углом; наведение выпрямляет и кладёт сверху" />
      <RecentPolaroids projects={newest} />

      <Chapter
        title="Вместо «Choose your plan»"
        text="Секция в самом низу страниц, перед футером. Тарифы обещали подписку, которой нет; здесь — то, что куда-то ведёт."
      />
      <Label n="П1" name="Призыв к заказу" note="Тёмный блок, пиксельные цветы, две кнопки" />
      <EndOrder />
      <Label n="П2" name="Discord" note="Лаймовая карточка: что там происходит и кнопка" />
      <EndDiscord />
      <Label n="П3" name="Свежее со студии" note="Последний пост What's new, новая карта, новая работа — меняется само" />
      <EndFresh items={fresh} />
      <Label n="П4" name="Сколько стоила бы твоя карта" note="Ползунок размера, цена и срок сразу" />
      <EndPrice />
    </main>
  );
}
