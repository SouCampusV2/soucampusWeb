import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { Skeleton } from "@/components/Skeleton";

// Same display font as the homepage Hero — rhymes the site's hero headings.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "About me — SouCampus builds",
};

// Milestones of the story, oldest first. Shaped as a flat array (age/title/text)
// the same way ClientReviews holds its data — easy to re-order or extend later.
const TIMELINE = [
  {
    age: "Age 6",
    title: "First steps",
    text: "Minecraft entered my life very early. I built alongside my father — castles, beaches, whole corners of a survival world. Back then it was just a hobby, but that's where I got my first sense of space and composition.",
  },
  {
    age: "Age 10",
    title: "The Kristalix project",
    text: "I joined Kristalix — a large minigames server with a peak online of 20,000+ players. There I built almost entirely by hand: access to WorldEdit was limited to basic commands — //set, //copy, //rotate, //walls, with no brushes or other tools for complex terrain. Even so, I completed my first serious project — a 100×100 block town — and earned the rank of Member.",
  },
  {
    age: "Age 11–12",
    title: "Growing within the team",
    text: "A year later I earned the rank of Novice, and six months after that, Master. With the Master rank came access to brushes — a tool without which working with terrain and large forms is far harder. At 12 I officially became a builder for Kristalix: I built dozens of maps in different styles and started earning my first money from building.",
  },
  {
    age: "Before 15",
    title: "Just playing",
    text: "I left Kristalix and spent a few years building for myself on different servers — not for money, just because I loved the process. I tried new styles, experimented with commands and plugins, and kept sharpening my skills. That time gave me freedom — I built whatever I wanted, purely for myself.",
  },
  {
    age: "Age 15",
    title: "First commissions",
    text: "A friend and I started looking for work on international platforms and in Discord studios. Our first client was a streamer — we built a small town for him. That experience pulled us seriously into commercial building.",
  },
  {
    age: "Age 17–18",
    title: "Working in studios",
    text: "I built with several well-known teams: HoneyFrost, BreadBuilds, Odyssey. The experience at HoneyFrost was especially valuable — a studio whose builds are featured in the official Minecraft Marketplace. That's when building stopped being just a set of commands and became a language I think in: I started noticing how a shade of stone shifts the mood of a build, and how empty space between structures can speak louder than the architecture itself. Working alongside strong builders taught me composition as balance — knowing where to leave air, and where to add detail, so the eye always knows where to go.",
  },
  {
    age: "Age 21",
    title: "The journey continues",
    text: "Today, 15 years into Minecraft, I've come a long way — from building with my father as a kid to working as a professional builder. I currently work with about seven regular clients, building across a wide range of styles, from rugged medieval fortresses to light, fantasy-inspired cities. My toolkit includes WorldEdit, Axiom, Arceon, EzEdit, VoxelSniper, and other plugins, which I use fluently and pick based on the task at hand.",
  },
];

export default function AboutPage() {
  return (
    <main className="w-full mx-auto max-w-6xl flex-1 px-6 pb-28">
      {/* Full-bleed dark section — deliberate exception to the site's light theme,
          scoped to this page only (see DESIGN.md). Breaks out of the max-w-6xl
          <main> to reach the viewport edges, same trick as PricingSection's divider. */}
      <div className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-zinc-950">
        <div className="relative mx-auto max-w-6xl overflow-hidden px-6 pt-20 pb-28">
          <div className="pointer-events-none absolute left-1/2 -top-32 -z-10 h-[36rem] w-full max-w-[90rem] -translate-x-1/2 bg-[radial-gradient(circle_at_50%_0%,rgba(113,185,0,0.22),transparent_70%)]" />

          <div className="mx-auto max-w-2xl text-center">
            <span className="text-sm font-semibold text-lime-400">
              A Long Journey
            </span>
            <h1
              className={`${displayFont.className} mt-3 text-4xl leading-tight tracking-tight text-[#fbfbff] sm:text-5xl`}
            >
              Building Worlds Since Childhood
            </h1>
            <p className="mt-6 leading-7 text-zinc-400">
              Hi! My name is Eugene. For 8 years I&apos;ve been building in
              Minecraft professionally — from childhood sandcastles to
              large-scale architectural projects for clients. My goal is to
              turn clients&apos; ideas into vivid, detailed worlds and keep
              growing as a builder.
            </p>
          </div>

          <div className="mt-24 flex flex-col gap-20">
            {TIMELINE.map((item) => (
              <div key={item.age} className="mx-auto max-w-xl text-center">
                <div
                  className={`${displayFont.className} bg-gradient-to-r from-lime-300 to-lime-600 bg-clip-text text-4xl text-transparent sm:text-5xl`}
                >
                  {item.age}
                </div>
                <h3 className="mt-3 text-lg font-semibold text-[#fbfbff]">
                  {item.title}
                </h3>
                <p className="mt-3 leading-7 text-zinc-400">{item.text}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-24 max-w-xl text-center">
            <p className="leading-7 text-zinc-400">
              A big part of my work is about people. Every client comes not
              with an exact blueprint, but with an image, a feeling, a
              fragment of an idea — and part of my job is to hear that,
              rather than just execute a technical brief. I try to think
              alongside the client, continuing their idea so the result
              exceeds what they originally imagined. It&apos;s at the
              intersection of someone else&apos;s vision and my own that the
              most memorable projects are born — not because I built what was
              asked, but because I built what was actually needed.
            </p>
            <p className="mt-6 leading-7 text-zinc-400">
              But the core of it hasn&apos;t changed since I was six: I still
              love to build. Every new commission is a new map, a new style,
              a new puzzle I want to solve beautifully.
            </p>
          </div>
        </div>
      </div>

      {/* TODO: replace with a real photo */}
      <div className="relative mt-20 aspect-[21/9] w-full overflow-hidden rounded-3xl">
        <Skeleton className="h-full w-full" />
        <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-zinc-400">
          Photo coming soon
        </span>
      </div>
    </main>
  );
}
