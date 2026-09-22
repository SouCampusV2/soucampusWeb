"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Drawer } from "vaul";
import { Books, ChatCircle, House, SquaresFour } from "@phosphor-icons/react";
import { DISCORD_INVITE } from "@/lib/site";
import s from "./styles.module.css";

// Шторки рендерятся в корень варианта, а не в <body>: иначе до них не
// доходят CSS-переменные цвета и шрифт, заданные на корне.
function portalTarget() {
  return typeof document === "undefined" ? undefined : (document.getElementById("pocket-root") ?? undefined);
}

type Build = { slug: string; title: string; tag: string; image: string; summary: string; size: string; deadline: string; price: string };

// Лента работ: горизонтальная прокрутка с прилипанием. touch-action:
// pan-x pan-y пропускает и вертикальный скролл страницы, а
// overscroll-behavior-x: contain не даёт ленте «утянуть» назад браузер
// жестом свайпа (§9 «Carousel scrolls vertically» / навигация назад).
// Тап по карточке открывает шторку Vaul с деталями.
export function BuildStrip({ builds }: { builds: Build[] }) {
  const [open, setOpen] = useState<Build | null>(null);
  return (
    <>
      <ul className={s.strip}>
        {builds.map((b) => (
          <li key={b.slug}>
            <button type="button" className={s.card} onClick={() => setOpen(b)}>
              <span className={s.cardImg}>
                <Image src={b.image} alt="" fill sizes="280px" draggable={false} />
              </span>
              <span className={s.cardTitle}>{b.title}</span>
              <span className={s.muted}>{b.tag}</span>
            </button>
          </li>
        ))}
      </ul>
      <Drawer.Root open={!!open} onOpenChange={(v) => !v && setOpen(null)}>
        <Drawer.Portal container={portalTarget()}>
          <Drawer.Overlay className={s.overlay} />
          <Drawer.Content className={s.sheet} aria-describedby={undefined}>
            <Drawer.Handle className={s.handle} />
            {open && (
              <div className={s.sheetBody}>
                <span className={s.sheetImg}>
                  <Image src={open.image} alt={open.title} fill sizes="480px" />
                </span>
                <Drawer.Title className={s.sheetTitle}>{open.title}</Drawer.Title>
                <p className={s.muted}>{open.summary}</p>
                <dl className={s.facts}>
                  <div><dt>Size</dt><dd>{open.size}</dd></div>
                  <div><dt>Built in</dt><dd>{open.deadline}</dd></div>
                  <div><dt>Price</dt><dd>{open.price}</dd></div>
                </dl>
                <Link href={`/portfolio/${open.slug}`} className={`${s.btn} ${s.btnPrimary}`}>Open this build</Link>
              </div>
            )}
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </>
  );
}

// Шторка заказа: по кнопке в нижней панели. Шаги, оценка и два пути.
// Поле ввода — 16px, иначе iOS зумит страницу при фокусе (§4).
export function OrderSheet({ steps, children }: { steps: { title: string; text: string }[]; children: React.ReactNode }) {
  return (
    <Drawer.Root>
      <Drawer.Trigger asChild>{children}</Drawer.Trigger>
      <Drawer.Portal container={portalTarget()}>
        <Drawer.Overlay className={s.overlay} />
        <Drawer.Content className={s.sheet} aria-describedby={undefined}>
          <Drawer.Handle className={s.handle} />
          <div className={s.sheetBody}>
            <Drawer.Title className={s.sheetTitle}>Order a map</Drawer.Title>
            <ol className={s.sheetSteps}>
              {steps.map((st, i) => (
                <li key={st.title}>
                  <b>{i + 1}. {st.title}</b>
                  <span className={s.muted}>{st.text}</span>
                </li>
              ))}
            </ol>
            <Link href="/contact" className={`${s.btn} ${s.btnPrimary}`}>Start with the contact form</Link>
            <a href={DISCORD_INVITE} target="_blank" rel="noreferrer" className={`${s.btn} ${s.btnSecondary}`}>Or message me on Discord</a>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

// Нижняя панель вкладок: подсвечивает раздел, который сейчас на экране.
// Вкладки — ссылки-якоря (работают без JS), подсветку даёт
// IntersectionObserver, а не слушатель скролла.
const TABS = [
  { id: "home", label: "Home", Icon: House },
  { id: "builds", label: "Builds", Icon: SquaresFour },
  { id: "reviews", label: "Reviews", Icon: ChatCircle },
  { id: "library", label: "Library", Icon: Books },
];

export function TabBar({ steps }: { steps: { title: string; text: string }[] }) {
  const [active, setActive] = useState("home");
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    TABS.forEach((t) => {
      const el = document.getElementById(t.id);
      if (el) io.observe(el);
    });
    return () => io.disconnect();
  }, []);

  return (
    <nav aria-label="Sections" className={s.tabbar}>
      {TABS.map((t) => (
        <a key={t.id} href={`#${t.id}`} className={s.tab} aria-current={active === t.id ? "true" : undefined}>
          <t.Icon size={22} weight={active === t.id ? "fill" : "regular"} aria-hidden="true" />
          {t.label}
        </a>
      ))}
      <OrderSheet steps={steps}>
        <button type="button" className={s.tabOrder}>Order</button>
      </OrderSheet>
    </nav>
  );
}
