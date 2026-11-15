// ⚠️ ЛАБОРАТОРИЯ бренда (15–16.11). Владелец называет номера — выбранное
// переносится в настоящие компоненты, папка lab/brand удаляется.
// На проде страницы нет (notFound), поиску она закрыта.
//
// Круги 1–2 (15–16.11): навбар, /about и «How an order works» выбраны и
// перенесены на сайт (Navbar.tsx, AboutFlowerIntro.tsx, HowItWorks.tsx).
// Круг 3 (16.11): /contact, 404, экран загрузки, фавиконка.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContactFan, ContactGrow, ContactSections, ContactStill } from "./ContactVariants";
import {
  FaviconLab,
  LoadingCells,
  LoadingFan,
  LoadingTurn,
  NotFoundChunk,
  NotFoundDigits,
  NotFoundFlower,
} from "./ServiceVariants";
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
        title="Contact"
        text="Слева текст, кнопка Discord и калькулятор, справа визуал со знаком. В К2 и К3 поменяйте размер карты в калькуляторе."
      />
      <Label n="К1" name="Большой цветок справа, стоит" />
      <ContactStill />
      <Label n="К2" name="Цветок растёт вместе с размером карты" />
      <ContactGrow />
      <Label n="К3" name="Веер: чем больше карта, тем больше залитых лепестков" />
      <ContactFan />
      <Label n="К4" name="Нижние секции: знаки вместо картинок-переписок" note="Сейчас там pixel-chat.svg и pixel-answers.svg" />
      <ContactSections />

      <Chapter title="404" text="Страница без навбара и футера, как сейчас. Цветок — ссылка на главную." />
      <Label n="404-1" name="Большой цветок и «This chunk hasn't loaded yet»" />
      <NotFoundFlower />
      <Label n="404-2" name="4 · цветок · 4" />
      <NotFoundDigits />
      <Label n="404-3" name="Недогруженный цветок" note="Клетки появляются и застывают на 70% — чанк не догрузился" />
      <NotFoundChunk />

      <Chapter title="Экран загрузки" text="Где показывать — решим после выбора: между страницами магазина или при долгой загрузке данных." />
      <Label n="З-1" name="Цветок поворачивается рывками по 90°, как блок" />
      <LoadingTurn />
      <Label n="З-2" name="Веер заливается по кругу" />
      <LoadingFan />
      <Label n="З-3" name="Цветок собирается по клеткам" />
      <LoadingCells />

      <Chapter title="Фавиконка" text="Во вкладке браузера (светлой и тёмной) и в размерах 16, 32 и 180 (иконка на телефоне)." />
      <FaviconLab />
    </main>
  );
}
