import type { Metadata } from "next";
import Link from "next/link";
import { Unbounded } from "next/font/google";
import { Button, INLINE_LINK, TERTIARY_UNDERLINE } from "@/components/Button";
import Image from "next/image";
import { DiscordLogo } from "@phosphor-icons/react/dist/ssr";
import { ArrowCircle } from "@/components/ArrowCircle";
import { FaqAccordion } from "@/components/FaqAccordion";
import { BuildEstimator } from "@/components/BuildEstimator";
import { PageGlow } from "@/components/PageGlow";
import { HowItWorks } from "@/components/HowItWorks";
import { DISCORD_INVITE } from "@/lib/site";
import { CONTACT_FAQ } from "@/lib/faq";

// Тот же дисплейный шрифт, что у Hero на главной — тут используется на
// H1 страницы, чтобы обе "герой"-секции сайта визуально рифмовались.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Order a custom Minecraft build from SouCampus. Describe your idea on Discord and get an instant price and timeline estimate.",
  alternates: { canonical: "/contact" },
};

// Вопросы — выборка из общего FAQ (lib/faq.ts, CONTACT_FAQ), а не своя
// копия: до 17.11 здесь жили восемь своих ответов, и они разошлись с /faq
// (сроки, правки, версии). Аккордеон печатает ответ одним абзацем.
const FAQ = CONTACT_FAQ.map((item) => ({
  question: item.question,
  answer: item.answer.join(" "),
}));

export default function ContactPage() {
  return (
    <>
      {/* Hero — same glow technique as the homepage Hero: a radial gradient
          bled up behind the navbar (-top-32) instead of a flat background,
          so there's no white gap above/behind the floating navbar pill. */}
      {/* Высота свечения фиксированная и НЕ тянется за высотой секции: у
          градиента спад к прозрачности на 70% радиуса, и растянутый на
          высокую секцию (её сильно удлинил калькулятор) он давал видимую
          жёсткую грань посередине. Его работа — подсветить навбар и
          заголовок, а не закрыть секцию целиком. */}
      <section className="relative overflow-x-clip pb-8 pt-20 sm:pb-16">
        <PageGlow color="rgba(59,130,246,0.35)" />
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-6 sm:grid-cols-2">
          <div>
            {/* Заголовок (17.11, владелец): большой «I'm here, always on
                Discord» вернулся, а слово «Contact» — внутри самого
                заголовка первой строкой, не плашкой над ним (плашки над
                заголовками убраны 16.11 и не возвращаются). Голое «Contact»
                (16.11) не понравилось: левая колонка стала короткой рядом
                с калькулятором. */}
            <h1
              className={`${displayFont.className} text-4xl leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl lg:text-6xl`}
            >
              Contact me.{" "}
              {/* zinc-600, не 500: на синем свечении 500 читался бледно (17.11). */}
              <span className="text-zinc-600 dark:text-zinc-300">
                I&apos;m here, always on{" "}
                <span className="text-blue-500">Discord</span>
              </span>
            </h1>
            <p className="mt-6 max-w-md text-zinc-700 dark:text-zinc-300">
              Orders, questions and support, all in one place. We reply on
              weekdays and weekends alike.
            </p>
            <div className="mt-8">
              <Button
                href={DISCORD_INVITE}
                target="_blank"
                rel="noopener noreferrer"
                variant="primary"
                size="lg"
                colorClassName="rounded-full bg-blue-500 text-zinc-950 hover:bg-blue-600 dark:bg-blue-400 dark:hover:bg-blue-500"
                className="group gap-3"
              >
                Join Discord
                {/* Иконка Discord справа вместо стрелки (просьба владельца
                    16.11): кнопка и так ведёт наружу, логотип говорит куда. */}
                <DiscordLogo size={24} weight="fill" aria-hidden="true" />
              </Button>
            </div>
          </div>

          {/* Instant estimate — a Wise-style "calculator" card, adapted
              from currency conversion to map size -> price/timeline, right
              in the Hero where the placeholder photo used to be. It's
              genuinely useful content (unlike a stand-in photo), so unlike
              that placeholder it's not hidden on mobile — it just becomes
              the second stacked block instead of a side-by-side column. */}
          <BuildEstimator />
        </div>
      </section>

      {/* Сразу под калькулятором: человек прикинул цену — следующий
          вопрос «а дальше что». Полосой во всю ширину, поэтому вне <main>;
          фон нейтральный, как везде (16.11; до этого синий, в цвет страницы). */}
      <HowItWorks />

      <main className="w-full mx-auto max-w-6xl flex-1 px-6">
      {/* Chat to us directly */}
      <section className="grid items-center gap-8 py-10 sm:gap-10 sm:py-20 sm:grid-cols-2">
        {/* С 17.11 — объёмная воксельная сцена вместо пиксельной SVG
            (владелец: «Стив в тёмной комнате пишет в Discord, вид сзади»).
            Сгенерирована в Figma (файл «SouCampus — Contact illustrations»),
            персонаж свой, не Стив; фигурок мобов и логотипов на ней нет
            намеренно — первый вариант с Крипером и значками Discord
            отброшен. WebP 1536×864, ~65 КБ; ночная сцена одна на обе темы. */}
        <div className="relative aspect-video overflow-hidden rounded-2xl bg-zinc-900">
          <Image
            src="/contact/chat-room.webp"
            alt="A blocky builder in a dark room typing a message on a glowing chat screen"
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
            Chat to us directly
          </h2>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Describe your map idea in a Discord ticket. I&apos;ll reply
            personally and we&apos;ll work out the details and timeline.
          </p>
          <div className="mt-6">
            <Button
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              variant="tertiary"
              size="lg"
              colorClassName="text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500"
              className="group gap-2"
            >
              {/* Черта на тексте, а не на кнопке: иначе она проезжает и
                  под стрелкой (см. TERTIARY_UNDERLINE в Button.tsx). */}
              <span className={TERTIARY_UNDERLINE}>Open Discord</span>
              <ArrowCircle
                direction="right"
                variant="bare"
                className="h-6 w-6 transition-transform duration-300 group-hover:-rotate-45"
                colorClassName="text-blue-500 dark:text-blue-400"
              />
            </Button>
          </div>
        </div>
      </section>

      {/* Ready-to-go answers */}
      <section className="grid items-center gap-8 border-t border-zinc-200 py-10 dark:border-zinc-800 sm:gap-10 sm:py-20 sm:grid-cols-2">
        <div className="sm:order-1">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
            Ready-to-go answers
          </h2>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Common questions about ordering, timelines and payment are below,
            no need to message on Discord.
          </p>
          <div className="mt-6">
            <Button
              href="#faq"
              variant="tertiary"
              size="lg"
              colorClassName={`text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500 ${TERTIARY_UNDERLINE}`}
            >
              See the questions
            </Button>
          </div>
        </div>
        {/* Пара к сцене выше (17.11): тот же персонаж ночью в библиотеке
            читает светящуюся книгу — «ответы уже написаны». Figma, файл
            «SouCampus — Contact illustrations»; WebP 1536×864. */}
        <div className="relative order-first aspect-video overflow-hidden rounded-2xl bg-zinc-900 sm:order-2">
          <Image
            src="/contact/answers-library.webp"
            alt="The same blocky builder reading a glowing book in a cozy library at night"
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      </section>

      {/* FAQ — last section on the page, so no bottom padding/divider here;
          PricingSection (global, right after this <main>) skips its own
          top divider/padding on this route too, see PricingSection.tsx. */}
      <section id="faq" className="scroll-mt-24 border-t border-zinc-200 pt-10 dark:border-zinc-800 sm:pt-20">
        <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
          Frequently asked questions
        </h2>

        <FaqAccordion items={FAQ} />

        <p className="mt-8 text-sm text-zinc-600 dark:text-zinc-400">
          More about how I work, shop maps and Minecraft versions:{" "}
          <Link href="/faq" className={INLINE_LINK} data-page-transition="true">
            the full FAQ
          </Link>
          .
        </p>
      </section>
      </main>
    </>
  );
}
