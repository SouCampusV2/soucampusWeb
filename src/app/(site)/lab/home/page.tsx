// ⚠️ ЛАБОРАТОРИЯ главной, круг 2 (24.11). Круг 1: владелец выбрал Р2
// (бенто) и П1 (призыв к заказу, но «слишком просто и бездушно»). Здесь:
// статистика плашкой по скрину legko.company, бенто с иконками при
// наведении и три новых финала. Владелец называет номера — выбранное
// переносится в настоящие компоненты, папка lab/home удаляется.
// На проде страницы нет (notFound), поиску закрыта.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FinaleMeadow, FinaleOrbit, FinaleSunset } from "./FinaleVariants";

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

  return (
    <main className="flex-1 pb-32">
      <Chapter
        title="Финал страниц — круг 2"
        text="Вместо «Choose your plan». Везде призыв к заказу и Discord, кнопки-таблетки как на всём сайте."
      />
      <Label n="Ф1" name="Луг под звёздами" note="Ночное небо с искрами, земля из блоков, на ней растут цветы-знаки" />
      <FinaleMeadow />
      <Label n="Ф2" name="Орбита" note="Как на третьем скрине: цветок в свечении, вокруг вращаются места студии, снизу четыре карточки" />
      <FinaleOrbit />
      <Label n="Ф3" name="Закат" note="Тёплое небо, цветок вместо солнца, силуэт островов" />
      <FinaleSunset />
    </main>
  );
}
