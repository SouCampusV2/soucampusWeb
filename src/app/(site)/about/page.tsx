import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import {
  Selection,
  Target,
  MagicWand,
  PaintBrush,
  PaintRoller,
  Cube,
  Lightning,
  ChatsCircle,
  MapTrifold,
  FrameCorners,
  PaintBrushHousehold,
  Mountains,
  Buildings,
  Armchair,
  House,
} from "@phosphor-icons/react/dist/ssr";
import { AuthorCta } from "@/components/AuthorCta";
import { JsonLd } from "@/components/JsonLd";
import { SITE_SAMEAS, SITE_TAGLINE, SITE_URL } from "@/lib/site";

// Person-разметка автора: имя, род занятий, описание. Связана с Organization
// с главной (worksFor по тому же @id), чтобы поиск видел, что сайт и человек —
// одна сущность «SouCampus».
const ABOUT_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "SouCampus",
  jobTitle: "Minecraft Builder",
  description: SITE_TAGLINE,
  url: `${SITE_URL}/about`,
  sameAs: SITE_SAMEAS,
  worksFor: { "@id": `${SITE_URL}/#organization` },
};

// Same display font as the homepage Hero — rhymes the site's hero headings.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "About me",
  description:
    "Who is SouCampus — a professional Minecraft builder with years of experience across servers and studios, building custom maps and worlds on order.",
  alternates: { canonical: "/about" },
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
    title: "Cristalix Server",
    text: "I joined Cristalix — a large minigames server with a peak online of 20,000+ players. There I built almost entirely by hand on creative mode: access to WorldEdit was limited to basic commands — //set, //copy, //rotate, //walls, with no brushes or other tools for complex terrain. Even so, I completed my first serious project — a 100×100 block town — and earned the rank of Member.",
  },
  {
    age: "Age 11–12",
    title: "Growing within the server",
    text: "A year later I earned the rank of Novice, and six months after that, Master. With the Master rank came access to brushes — a tool without which working with terrain and large forms is far harder. At 12 I officially became a builder for Cristalix: I built dozens of maps in different styles and started earning my first money from building.",
  },
  {
    age: "Before 15",
    title: "Developing myself",
    text: "I left Cristalix and spent a few years building for myself on different servers — not for money, just because I loved the process. I tried new styles, experimented with commands and plugins, and kept sharpening my skills. That time gave me freedom — I built whatever I wanted, purely for myself.",
  },
  {
    age: "Age 15",
    title: "First commissions",
    text: "With my old friend, we started looking for work on international platforms and in Discord studios. Our first client was a streamer — we built a small town for him. That experience pulled us seriously into commercial building. Since then, we started looking for more clients and commissions, and I began to build a reputation as a professional builder.",
  },
  {
    age: "Age 17–18",
    title: "Working in studios",
    text: "I built with several well-known teams: HoneyFrost, BreadBuilds, Odyssey. The experience at HoneyFrost was especially valuable — a studio whose builds are featured in the official Minecraft Marketplace. That's when building stopped being just a set of commands and became a language I think in: I started noticing how a shade of stone shifts the mood of a build, and how empty space between structures can speak louder than the architecture itself. Working alongside strong builders taught me composition as balance — knowing where to leave air, and where to add detail, so the eye always knows where to go.",
  },
  {
    age: "Age 21",
    title: "The journey continues",
    text: "Today, 15 years into Minecraft, 8 years of professional building, I've come a long way — from building with my father as a kid to working as a really great builder. I currently work with about ten regular clients, building across a wide range of styles, from rugged medieval fortresses to light, fantasy-inspired cities. My toolkit includes WorldEdit, Axiom, Arceon, EzEdit, VoxelSniper, GoBrush, GoPaint and other plugins, which I use easily and pick based on the task at hand.",
  },
];

// Skills & toolkit — building tools first (in the rough order I picked them
// up), then the softer/creative skills that actually decide what a build
// looks like. Icon per skill (same "labelled pill" shape as a typical
// UI/UX skills row, adapted to Minecraft building instead of design tools):
// - WorldEdit: selection-based editing (//set, //copy, //walls) → Selection.
// - VoxelSniper: brush that "shoots" terrain from a distance → Target.
// - Axiom / Arceon: modern sculpting mods (freeform shaping) → MagicWand / Cube.
// - GoBrush / GoPaint: brush vs. fill-style painting plugins → PaintBrush / PaintRoller.
// - EzEdit: fast in-game quick-edit tool → Lightning.
// - Communication with client: the non-building skill that actually
//   decides what gets built → ChatsCircle.
// - Level design: laying out a map's flow/space → MapTrifold.
// - Composition: framing/balance → FrameCorners.
// - Texturing: block-palette/material choice → PaintBrushHousehold.
// - Landscape / Architecture / Interior / Exterior: the four "genres" of a
//   build → Mountains / Buildings / Armchair / House.
//
// Two groups since 24.09 (split taken from the lab): plugins are one kind
// of skill, craft is another, and a single pile of fifteen pills hid that.
const SKILL_GROUPS = [
  {
    title: "Tools",
    skills: [
      { label: "WorldEdit", icon: Selection },
      { label: "VoxelSniper", icon: Target },
      { label: "Axiom", icon: MagicWand },
      { label: "Arceon", icon: Cube },
      { label: "GoBrush", icon: PaintBrush },
      { label: "GoPaint", icon: PaintRoller },
      { label: "EzEdit", icon: Lightning },
    ],
  },
  {
    title: "Craft",
    skills: [
      { label: "Communication with client", icon: ChatsCircle },
      { label: "Level design", icon: MapTrifold },
      { label: "Composition", icon: FrameCorners },
      { label: "Texturing", icon: PaintBrushHousehold },
      { label: "Landscape", icon: Mountains },
      { label: "Architecture", icon: Buildings },
      { label: "Interior", icon: Armchair },
      { label: "Exterior", icon: House },
    ],
  },
];

export default function AboutPage() {
  return (
    <>
      <JsonLd data={ABOUT_JSON_LD} />
      <AuthorCta />

      <main className="w-full mx-auto max-w-6xl flex-1 px-6">
      {/* No top glow here — AuthorCta right above already bleeds one in;
          a second `-top-32` gradient stacked directly under it read as a
          duplicate/second light source. mt-16 puts real breathing room
          between the two sections instead of having them sit flush.
          Since 24.09 everything from here down is one left-aligned column
          at max-w-3xl — the advancement panel's width — so the heading,
          the panel, the paragraphs and the skills share one left edge. */}
      <section className="relative mt-8 pt-20 sm:mt-16">
        <div className="mx-auto max-w-3xl">
          <span className="text-sm font-semibold text-lime-600">
            A Long Journey
          </span>
          <h1
            className={`${displayFont.className} mt-3 text-4xl leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl`}
          >
            Building Worlds Since Childhood
          </h1>
          <p className="mt-6 leading-7 text-zinc-600 dark:text-zinc-400">
            <b>For 8 years I&apos;ve been building in Minecraft professionally</b>
            — from childhood sandcastles to large-scale architectural
            projects for clients. My goal is to turn clients&apos; ideas
            into vivid, detailed worlds and keep growing as a builder.
          </p>
        </div>
      </section>

      {/* Путь — дерево достижений, как экран Advancements в игре (перенесено
          из лаборатории, вариант «Inventory», 24.09, в цвета сайта). Рамки
          соединены линией; фон — пиксельная текстура блока (.pixel-texture
          в globals.css). Последняя рамка, «сегодня», оранжевая: в игре так
          выделено испытание — самое трудное достижение в дереве.
          ⚠️ Углы здесь квадратные намеренно, в отличие от rounded-3xl по
          всему сайту: рамки и тултипы в игре квадратные, скруглённые
          читались бы как обычные карточки сайта. Скруглена только внешняя
          панель — она часть страницы, а не игры. */}
      <ol className="pixel-texture mx-auto mt-10 max-w-3xl overflow-hidden rounded-3xl border border-zinc-950/[0.06] p-4 sm:mt-12 sm:p-8 dark:border-zinc-50/[0.08]">
        {TIMELINE.map((item, i) => {
          const last = i === TIMELINE.length - 1;
          return (
            <li
              key={item.age}
              className="relative grid grid-cols-[3.5rem_minmax(0,1fr)] gap-3 pb-6 last:pb-0 sm:grid-cols-[4rem_minmax(0,1fr)] sm:gap-4 sm:pb-8"
            >
              {/* Линия связи: светлая с тёмной обводкой, как в игре. Идёт от
                  низа рамки до низа пункта — к рамке следующего. */}
              {!last && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-[calc(1.75rem-5px)] top-14 w-[10px] border-x-2 border-zinc-950 bg-zinc-50 sm:left-[calc(2rem-5px)] sm:top-16"
                />
              )}
              <span
                className={`${displayFont.className} relative z-10 grid size-14 place-items-center border-2 border-zinc-950 px-1 text-center text-[11px] leading-tight text-zinc-950 sm:size-16 sm:text-xs ${
                  last
                    ? "bg-orange-400 shadow-[inset_3px_3px_0_var(--color-orange-200),inset_-3px_-3px_0_var(--color-orange-700)]"
                    : "bg-lime-400 shadow-[inset_3px_3px_0_var(--color-lime-200),inset_-3px_-3px_0_var(--color-lime-700)]"
                }`}
              >
                {item.age.replace("Age ", "")}
              </span>
              {/* Тултип достижения. Рамка — градиент синего вместо игрового
                  фиолетового; border-image не дружит со скруглением, отсюда
                  тоже квадратные углы. */}
              <div className="border-2 border-transparent bg-[#fbfbff] px-4 py-3 [border-image:linear-gradient(var(--color-blue-500),var(--color-blue-700))_1] sm:px-5 sm:py-4 dark:bg-zinc-950">
                <p className="text-sm font-semibold text-lime-600 dark:text-lime-400">
                  {item.age}: advancement made!
                </p>
                <h3 className="mt-1 text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                  {item.title}
                </h3>
                <p className="mt-2 leading-7 text-zinc-600 dark:text-zinc-400">{item.text}</p>
              </div>
            </li>
          );
        })}
      </ol>

      {/* Straight after the advancements (moved up 24.09, owner's call):
          the story ends at "today", and "how I work with people" is where
          today leads, before the list of tools. */}
      <div className="mx-auto mt-10 max-w-3xl sm:mt-12">
        <p className="leading-7 text-zinc-600 dark:text-zinc-400">
          And of course, a big part of my work is about people. Every client comes not
          with an exact blueprint, but with an image, a feeling, a
          fragment of an idea — and part of my job is to hear that,
          rather than just execute a technical brief. I try to think
          alongside the client, continuing their idea so the result
          exceeds what they originally imagined. It&apos;s at the
          intersection of someone else&apos;s vision and my own that the
          most memorable projects are born — not because I built what was
          asked, but because I built what was actually needed.
        </p>
        <p className="mt-6 leading-7 text-zinc-600 dark:text-zinc-400">
          But the core of it hasn&apos;t changed since I was six: I still
          love to build. Every new commission is a new map, a new style,
          a new puzzle I want to solve beautifully.
        </p>
      </div>

      {/* Left-aligned, unlike the centred text around it: the section's
          width matches the advancement panel above (max-w-3xl), so their
          left edges line up and the two read as one column. */}
      <section className="mx-auto mt-16 max-w-3xl sm:mt-20">
        <span className="text-sm font-semibold text-lime-600">Skills & toolkit</span>
        <h2
          className={`${displayFont.className} mt-3 text-3xl leading-tight tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl`}
        >
          What I build with
        </h2>
        <p className="mt-4 leading-7 text-zinc-600 dark:text-zinc-400">
          A builder needs more than the right plugin — a wide toolkit and an eye
          for composition and space, built up over 8 years across servers and
          studios:
        </p>

        <div className="mt-8 grid gap-8 sm:grid-cols-2">
          {SKILL_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="font-semibold text-zinc-950 dark:text-zinc-50">{group.title}</h3>
              <ul className="mt-3 flex flex-wrap gap-2">
                {group.skills.map(({ label, icon: Icon }) => (
                  <li
                    key={label}
                    className="flex items-center gap-2 rounded-full bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    <Icon size={18} className="shrink-0 text-lime-600 dark:text-lime-400" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      </main>
    </>
  );
}
