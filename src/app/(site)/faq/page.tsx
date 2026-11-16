import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "@phosphor-icons/react/dist/ssr";
import { JsonLd } from "@/components/JsonLd";
import { HELP_BODY, HELP_H2, HELP_LINK, HelpPageHeader } from "@/components/HelpTabs";
import { FAQ_ITEMS, FAQ_SECTIONS, FAQ_UPDATED } from "@/lib/faq";
import { SITE_URL } from "@/lib/site";


export const metadata: Metadata = {
  title: "FAQ",
  description:
    "How a custom Minecraft map commission works, what it costs, and answers about Java versions, schematics and putting a map on your server.",
  alternates: { canonical: "/faq" },
};

// Машиночитаемая копия тех же вопросов. Звёздочек-вопросов в выдаче
// Google FAQPage больше не даёт (с 2023 — только гос- и медсайтам), но
// разметка по-прежнему говорит поиску, что это вопрос и ответ, а не
// просто абзац. Текст — тот же массив, что на странице: расходиться им
// не из чего.
const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  url: `${SITE_URL}/faq`,
  mainEntity: FAQ_ITEMS.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: { "@type": "Answer", text: item.answer.join("\n\n") },
  })),
};

export default function FaqPage() {
  return (
    // Клип на полноширинном <main>, ограничение ширины — на секциях
    // внутри: требование PageGlow.
    <main className="relative w-full overflow-x-clip">
      <JsonLd data={FAQ_JSON_LD} />

      {/* Шапка общая для четырёх справочных страниц (HelpTabs.tsx): вкладки
          вместо видимого h1, абзац, дата. Отступы — там, не здесь. */}
      <HelpPageHeader active="faq" title="FAQ" updated={FAQ_UPDATED}>
        How a commission works from the first message to the delivered
        world, buying maps in the shop, and the Minecraft questions that
        come up along the way. Installing a map, pasting a schematic and
        fixing what looks wrong are walked through in the{" "}
        <Link href="/wiki" className={HELP_LINK}>
          Wiki
        </Link>
        .
      </HelpPageHeader>

      <div className={HELP_BODY}>
        {FAQ_SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="scroll-mt-24">
            <h2 className={HELP_H2}>
              {section.title}
            </h2>

            {/* <details>, а не FaqAccordion с /contact: тот рисует ответ
                только у открытого вопроса, и в серверном HTML ответов нет
                вовсе — поиск видел бы одни вопросы. Здесь все ответы
                лежат в разметке, а раскрывает их браузер без JS. Цена —
                раскрытие без анимации высоты. */}
            <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
              {section.items.map((item) => (
                <details key={item.question} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left text-lg font-semibold text-zinc-950 dark:text-zinc-50 [&::-webkit-details-marker]:hidden">
                    <h3>{item.question}</h3>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300">
                      <Plus
                        size={20}
                        weight="bold"
                        className="transition-transform duration-200 group-open:rotate-45"
                      />
                    </span>
                  </summary>
                  <div className="space-y-3 pb-6 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
                    {item.answer.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                    {item.link && (
                      <p>
                        <Link
                          href={item.link.href}
                          className={HELP_LINK}
                          data-page-transition="true"
                        >
                          {item.link.label} →
                        </Link>
                      </p>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
