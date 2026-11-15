// ⚠️ ЛАБОРАТОРИЯ бренда (15.11): варианты навбара, первой секции /about и
// «How an order works» на одной странице. Владелец называет номера —
// выбранное переносится в настоящие компоненты, папка lab/brand удаляется.
// На проде страницы нет (notFound), поиску она закрыта.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Nav1, Nav2, Nav3, Nav4 } from "./NavVariants";
import { AboutLab } from "./AboutVariants";
import { Label } from "./Label";
import { OrderCenter, OrderHover, OrderMini, OrderPlay, OrderScroll } from "./OrderVariants";

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
        title="Навбар"
        text="Структура как в админке: SouCampus — на главную, группы Studio и Marketplace раскрываются. Справа всегда корзина, уведомления, сообщения, аккаунт и последней — Order now. Нажимайте на группы."
      />
      <Label n="Н1" name="Надпись SouCampus + цветок, группы панелью" />
      <div className="mx-auto max-w-6xl px-4"><Nav1 /></div>
      <Label n="Н2" name="Только крупный цветок слева" />
      <div className="mx-auto max-w-6xl px-4"><Nav2 /></div>
      <Label n="Н3" name="Цветок по центру, значком" note="Выступает из шапки вверх и вниз" />
      <div className="mx-auto max-w-6xl px-4 py-6"><Nav3 /></div>
      <Label n="Н4" name="Группы как вкладки" note="Ссылки открытой группы — вторым рядом под шапкой" />
      <div className="mx-auto max-w-6xl px-4"><Nav4 /></div>

      <Chapter
        title="How an order works"
        text="Компактно, пиксельный веер. Прокрутите к каждому — 1, 4 и 5 оживают сами; во 2-м наведите на шаг."
      />
      <Label n="З1" name="Сам заполняется при показе" note="Шаги списком слева, веер справа" />
      <OrderPlay />
      <Label n="З2" name="По наведению" note="Шаги в ряд, как было; веер у заголовка показывает, докуда дошёл заказ" />
      <OrderHover />
      <Label n="З3" name="Мини-веера вместо номеров" note="Без анимации: каждый шаг — свой залитый веер" />
      <OrderMini />
      <Label n="З4" name="Крупный веер над шагами" note="Белый веер на лаймовом" />
      <OrderCenter />
      <Label n="З5" name="По прокрутке, но обычной длины" note="Заливка идёт, пока секция проезжает через экран" />
      <OrderScroll />

      <Chapter
        title="About — первая секция"
        text="Заголовок SouCampus, большой цветок сразу, свечение вместо белого фона, при прокрутке растёт в 2–3 раза. Текст ждёт сверки стажа и названий команд."
      />
      <AboutLab />
    </main>
  );
}
