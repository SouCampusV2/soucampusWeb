import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/Skeleton";
import { ArrowCircle } from "@/components/ArrowCircle";
import { FaqAccordion } from "@/components/FaqAccordion";
import { BuildEstimator } from "@/components/BuildEstimator";
import { DISCORD_INVITE } from "@/lib/site";

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

const FAQ = [
  {
    question: "How much does a map cost?",
    answer:
      "The base rate is 1.25€ per 1×1 unit. For example, a 100×100 map costs 125€ under this pricing. The exact final price depends on the size and scope of your project — feel free to share your idea in a Discord ticket and I'll calculate the cost for you.",
  },
  {
    question: "How long does an order take?",
    answer:
      "A 150×150 map can be done in as little as 2-3 days at minimum, but the actual timeline mainly depends on the amount of work involved and my personal schedule at the time. Larger or more detailed projects will naturally take longer.",
  },
  {
    question: "How does payment work?",
    answer:
      "Payment is required upfront — either: 50% before starting, and the remaining 50% before I send the schematic or world file, or 100% upfront, in which case you'll get to watch the build process live on my server as it happens.",
  },
  {
    question: "Can I request changes after delivery?",
    answer:
      "A certain number of revisions is included in the price (agreed on in advance — for example, 1-2 free revisions within a week after delivery). Additional revisions beyond the agreed scope are billed separately by arrangement.",
  },
  {
    question: "Which Minecraft versions do you build on?",
    answer:
      "I work across a wide range of versions — both older and current ones. If you have a specific version or modpack in mind, just mention it in the ticket and we'll figure out together whether it's feasible for your idea.",
  },
  {
    question: "Do you improve existing maps?",
    answer:
      "Yes, I do improve/enhance existing maps. How much can be done depends heavily on your specific requests and the overall scope of work needed. Reach out on Discord to discuss the details of your map and what you'd like improved.",
  },
  {
    question: "Can I order a map for a specific mode (PvP, RPG, parkour)?",
    answer:
      "Yes, of course. Describe your idea on Discord and I'll suggest options — suitable mechanics, style, and map structure for the mode you have in mind (PvP arenas, RPG locations with quest structures, parkour courses with checkpoints, and so on).",
  },
  {
    question: "What if I don't like the result?",
    answer:
      "I send you continuous updates throughout the build, so you'll always be able to see and comment on progress as it happens. If everything looked good along the way and you're only unhappy with the final result at the very end, that won't be grounds for a refund or rework. However, if we go through a couple of rounds of rebuilding early on and it's genuinely not working out, I'll refund part of what you paid: 45% back if you paid 50% upfront, or 95% back if you paid the full 100% upfront.",
  },
];

export default function ContactPage() {
  return (
    <>
      {/* Hero — same glow technique as the homepage Hero: a radial gradient
          bled up behind the navbar (-top-32) instead of a flat background,
          so there's no white gap above/behind the floating navbar pill. */}
      <section className="relative pb-8 pt-20 sm:pb-16">
        {/* Fixed height (h-[42rem], same as the homepage Hero.tsx), not
            tied to the section's own height — the gradient is
            transparent past 70% of its radius by design, which read fine
            stretched over the old, shorter hero, but once the calculator
            card made this section much taller, stretching the same glow
            to match created a visible hard edge partway down (the glow's
            own natural falloff, just relocated somewhere more visible).
            A fixed size keeps it doing its original job — lighting up the
            navbar/heading area — without trying to cover the whole,
            now-taller section. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[772px] w-full max-w-[90rem] -translate-x-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.35),transparent_70%)]"
        />
        <div className="mx-auto grid max-w-6xl items-start gap-10 px-6 sm:grid-cols-2">
          <div>
            <span className="text-sm font-semibold text-blue-500">
              Get in touch
            </span>
            <h1
              className={`${displayFont.className} mt-3 text-4xl leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
            >
              I&apos;m here, always on{" "}
              <span className="text-blue-500">Discord</span>
            </h1>
            <p className="mt-4 max-w-md text-zinc-700 dark:text-zinc-300">
              Orders, questions and support — all in one place. We reply on
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
                <ArrowCircle
                  direction="right"
                  variant="bare"
                  className="h-6 w-6 transition-transform duration-300 group-hover:-rotate-45"
                  colorClassName="text-zinc-950"
                />
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

      <main className="w-full mx-auto max-w-6xl flex-1 px-6">
      {/* Chat to us directly */}
      <section className="grid items-center gap-8 py-10 sm:gap-10 sm:py-20 sm:grid-cols-2">
        {/* TODO: replace with a real Discord conversation screenshot */}
        <div className="relative aspect-video overflow-hidden rounded-2xl">
          <Skeleton className="h-full w-full" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl">
            Chat to us directly
          </h2>
          <p className="mt-3 text-zinc-600 dark:text-zinc-400">
            Describe your map idea in a Discord ticket — I&apos;ll reply
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
              <span className="underline decoration-2 underline-offset-4">Open Discord</span>
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
            Common questions about ordering, timelines and payment — below,
            no need to message on Discord.
          </p>
          <div className="mt-6">
            <Button
              href="#faq"
              variant="tertiary"
              size="lg"
              colorClassName="text-blue-500 underline decoration-2 underline-offset-4 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-500"
            >
              See the questions
            </Button>
          </div>
        </div>
        {/* TODO: replace with a real illustration/photo */}
        <div className="relative order-first aspect-video overflow-hidden rounded-2xl sm:order-2">
          <Skeleton className="h-full w-full" />
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
      </section>
      </main>
    </>
  );
}
