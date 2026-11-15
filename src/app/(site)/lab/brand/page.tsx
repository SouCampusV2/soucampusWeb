// ⚠️ ЛАБОРАТОРИЯ бренда (15–16.11): варианты навбара, первой секции /about и
// «How an order works» на одной странице. Владелец называет номера —
// выбранное переносится в настоящие компоненты, папка lab/brand удаляется.
// На проде страницы нет (notFound), поиску она закрыта.
//
// Круг 1 (15.11): выбраны Н1 (с размером знака из Н2), З5, А2.
// Круг 2 (16.11): уточнения по каждому — ниже.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav } from "./NavVariants";
import { AboutLab } from "./AboutVariants";
import { OrderScroll } from "./OrderVariants";
import { Label } from "./Label";

export const metadata: Metadata = { title: "Brand lab", robots: { index: false, follow: false } };

function Chapter({ title, text }: { title: string; text: string }) {
  return (
    <div className="mx-auto max-w-6xl px-6 pt-24">
      <h1 className="text-4xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">{title}</h1>
      <p className="mt-2 max-w-2xl text-zinc-600 dark:text-zinc-400">{text}</p>
    </div>
  );
}

export default function BrandLab() {
  if (process.env.VERCEL_ENV === "production") notFound();
  return (
    <main className="flex-1 pb-32">
      <Chapter
        title="Навбар — Н1, круг 2"
        text="Знак размером как в Н2, у цветка жёлтая серединка. Пункты панели как в админке: заголовок капсом, пояснения, иконки справа, стрелка без движения. Откройте Studio и Marketplace."
      />
      <Label n="Н1·1" name="Цветок, без тени" note="Пункты: иконка справа, без стрелки" />
      <div className="relative z-30 mx-auto max-w-6xl px-4"><Nav mark="flower" arrow={false} /></div>
      <Label n="Н1·2" name="Цветок с тенью блока" note="Пункты: иконка справа и стрелка" />
      <div className="relative z-20 mx-auto max-w-6xl px-4"><Nav mark="flower-shadow" arrow /></div>
      <Label n="Н1·3" name="Веер вместо цветка" note="Пункты: иконка справа и стрелка" />
      <div className="relative z-10 mx-auto max-w-6xl px-4"><Nav mark="fan" arrow /></div>

      <Chapter
        title="How an order works — З5, круг 2"
        text="Веер без окантовки: в светлой теме белый → чёрный, в тёмной чёрный → белый. Прокрутите через секцию; тему переключите, чтобы увидеть вторую половину."
      />
      <Label n="З5·1" name="На лаймовом фоне, как на главной" />
      <OrderScroll tone="lime" />
      <Label n="З5·2" name="На нейтральном фоне" note="Для сравнения: монохромный веер без цветного фона" />
      <OrderScroll tone="plain" />

      <Chapter
        title="About — А2, круг 2"
        text="Правый верхний угол, цветок зелёный и крупнее (растёт вместе с шириной экрана), секция ниже, слева — бейдж, SouCampus, текст, команды (новые помечены now) и кнопки. Щелей между пикселями при росте больше быть не должно."
      />
      <AboutLab />
    </main>
  );
}
