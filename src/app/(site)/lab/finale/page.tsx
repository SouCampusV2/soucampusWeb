// ⚠️ ЛАБОРАТОРИЯ финала страниц, круг 4 (24.11): настоящие материалы вместо
// нарисованных — рендеры работ, заказ с ползунком, Discord с живыми
// цифрами, свежее со студии. Владелец называет номера — выбранное
// переносится, папка lab/finale удаляется. На проде страницы нет.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAllProjects } from "@/lib/projects";
import { getAllProducts } from "@/lib/products";
import { getAllUpdates } from "@/lib/updates";
import {
  CardsBold, CardsQuiet, FreshRow, RenderBottom, RenderFan, RenderGlass, RenderSplit, RenderWithCards,
  type DiscordStats, type Fresh, type Shot,
} from "./Variants";

export const metadata: Metadata = { title: "Finale lab", robots: { index: false, follow: false } };

// Живые цифры сервера: Discord отдаёт их по ссылке-приглашению без ключей.
async function getDiscordStats(): Promise<DiscordStats> {
  try {
    const r = await fetch("https://discord.com/api/v10/invites/EHudSpvEVV?with_counts=true", { next: { revalidate: 600 } });
    if (!r.ok) return null;
    const j = (await r.json()) as { approximate_member_count?: number; approximate_presence_count?: number; guild?: { id: string; icon: string | null } };
    return {
      members: j.approximate_member_count ?? 0,
      online: j.approximate_presence_count ?? 0,
      icon: j.guild?.icon ? `https://cdn.discordapp.com/icons/${j.guild.id}/${j.guild.icon}.png?size=128` : null,
    };
  } catch {
    return null;
  }
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

export default async function FinaleLab() {
  if (process.env.VERCEL_ENV === "production") notFound();
  const [projects, products, stats] = await Promise.all([getAllProjects(), getAllProducts(), getDiscordStats()]);
  const shots: Shot[] = [...projects]
    .sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || (a.createdAt < b.createdAt ? 1 : -1))
    .map((p) => ({ image: p.image, title: p.title, slug: p.slug }));
  const [s1, s2, s3] = shots;
  const post = getAllUpdates()[0];
  const map = [...products].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0];
  const fresh: Fresh[] = [
    ...(post ? [{ label: "What's new", title: post.title, href: `/updates/${post.slug}`, image: post.cover.src }] : []),
    ...(map ? [{ label: "New on the marketplace", title: map.title, href: `/marketplace/${map.slug}`, image: map.image }] : []),
    ...(s1 ? [{ label: "Latest work", title: s1.title, href: `/portfolio/${s1.slug}`, image: s1.image }] : []),
  ];

  return (
    <main className="flex flex-1 flex-col pb-32">
      <div className="mx-auto w-full max-w-6xl px-6 pt-24">
        <h1 className="text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">Финал страниц — круг 4</h1>
        <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">
          Настоящие материалы вместо нарисованных. Discord сейчас: {stats ? `${stats.members} участников, ${stats.online} онлайн` : "цифры не пришли"}.
          У каждой карточки Discord два вида — с общим числом и только «online now».
        </p>
      </div>

      <Label n="А1" name="Рендер во всю ширину" note="Текст снизу слева на тёмном градиенте; подпись, что на фото" />
      {s1 && <RenderBottom shot={s1} />}
      <Label n="А2" name="Рендер и стекло по центру" />
      {s2 && <RenderGlass shot={s2} />}
      <Label n="А3" name="Рендер слева, текст справа" note="Текст на фоне страницы — обе темы" />
      {s3 && <RenderSplit shot={s3} />}
      <Label n="А4" name="Три рендера веером" note="Наведите — карточка поднимается" />
      <RenderFan shots={shots} />

      <Label n="Б1" name="Две яркие карточки" note="Оранжевая с ползунком цены, синяя Discord; здесь только «online now»" />
      <CardsBold stats={stats} showTotal={false} />
      <Label n="Б1+" name="То же, с общим числом участников" />
      <CardsBold stats={stats} showTotal />
      <Label n="Б2" name="Две спокойные карточки" note="На фоне страницы, цвет в акцентах" />
      <CardsQuiet stats={stats} showTotal={false} />

      <Label n="В1" name="Свежее со студии" note="Пост What's new, новая карта, новая работа — само обновляется" />
      <FreshRow items={fresh} />

      <Label n="АБ" name="Рендер фоном, поверх две стеклянные карточки" />
      {s1 && <RenderWithCards shot={s1} stats={stats} showTotal={false} />}
    </main>
  );
}
