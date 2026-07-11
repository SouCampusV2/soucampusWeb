import type { Metadata } from "next";
import { Button } from "@/components/Button";
import { Skeleton } from "@/components/Skeleton";

export const metadata: Metadata = {
  title: "Contact — SouCampus builds",
};

// TODO: replace "#" with the real Discord server invite link
const DISCORD_INVITE = "#";

const FAQ = [
  {
    question: "How much does a map cost?",
    answer: "Placeholder — price depends on scale and timeline, discussed on Discord.",
  },
  {
    question: "How long does an order take?",
    answer: "Placeholder — timeline depends on the project's complexity.",
  },
  {
    question: "How does payment work?",
    answer: "Placeholder — payment details are discussed individually in a ticket.",
  },
  {
    question: "Can I request changes after delivery?",
    answer: "Placeholder — revision terms will be described here.",
  },
  {
    question: "Which Minecraft versions do you build on?",
    answer: "Placeholder — list of supported versions.",
  },
  {
    question: "Do you work with existing servers or only from scratch?",
    answer: "Placeholder — both, discussed individually.",
  },
  {
    question: "Can I order a map for a specific mode (PvP, RPG, parkour)?",
    answer: "Placeholder — yes, describe your idea on Discord and I'll suggest options.",
  },
  {
    question: "What if I don't like the result?",
    answer: "Placeholder — revision and refund terms will be described here.",
  },
];

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-6xl flex-1 px-6 py-28">
      {/* Hero */}
      <section className="overflow-hidden rounded-3xl bg-orange-50 px-8 py-16 text-white sm:px-16">
        <div className="grid items-center gap-10 sm:grid-cols-2">
          <div>
            <span className="text-sm font-medium text-zinc-700">
              Get in touch
            </span>
            <h1 className="mt-2 text-4xl font-extrabold tracking-tight sm:text-5xl text-zinc-900">
              I&apos;m here, always on Discord
            </h1>
            <p className="mt-4 max-w-md text-zinc-700">
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
              >
                Join Discord →
              </Button>
            </div>
          </div>

          {/* TODO: replace with a real screenshot/photo */}
          <div className="relative hidden aspect-square overflow-hidden rounded-2xl sm:block">
            <Skeleton className="h-full w-full !bg-zinc-200" />
          </div>
        </div>
      </section>

      {/* Chat to us directly */}
      <section className="grid items-center gap-10 border-t border-zinc-200 py-20 sm:grid-cols-2">
        {/* TODO: replace with a real Discord conversation screenshot */}
        <div className="relative aspect-video overflow-hidden rounded-2xl">
          <Skeleton className="h-full w-full" />
        </div>
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
            Chat to us directly
          </h2>
          <p className="mt-3 text-zinc-600">
            Describe your map idea in a Discord ticket — I&apos;ll reply
            personally and we&apos;ll work out the details and timeline.
          </p>
          <div className="mt-6">
            <Button
              href={DISCORD_INVITE}
              target="_blank"
              rel="noopener noreferrer"
              variant="secondary"
              size="md"
            >
              Open Discord
            </Button>
          </div>
        </div>
      </section>

      {/* Ready-to-go answers */}
      <section className="grid items-center gap-10 border-t border-zinc-200 py-20 sm:grid-cols-2">
        <div className="sm:order-1">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
            Ready-to-go answers
          </h2>
          <p className="mt-3 text-zinc-600">
            Common questions about ordering, timelines and payment — below,
            no need to message on Discord.
          </p>
          <div className="mt-6">
            <Button href="#faq" variant="secondary" size="md">
              See the questions
            </Button>
          </div>
        </div>
        {/* TODO: replace with a real illustration/photo */}
        <div className="relative order-first aspect-video overflow-hidden rounded-2xl sm:order-2">
          <Skeleton className="h-full w-full" />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-zinc-200 py-20">
        <div className="mx-auto max-w-2xl">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-950 sm:text-4xl">
            Frequently asked questions
          </h2>

          <div className="mt-6 divide-y divide-zinc-200 rounded-2xl border border-zinc-200">
            {FAQ.map((item) => (
              <details key={item.question} className="group px-6 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between font-medium text-zinc-900 marker:content-none [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span className="ml-4 shrink-0 text-xl leading-none text-zinc-400 transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  {item.answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
