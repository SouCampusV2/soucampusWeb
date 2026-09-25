import { BASE_RATE, HIGH_RATE, HIGH_RATE_THRESHOLD } from "@/lib/pricing";

// FAQ — короткие ответы на вопросы, которые задают перед заказом, и на
// общие вопросы про карты Minecraft. Страница — /faq.
//
// Тот же «table-shaped» приём, что у wiki.ts: вопрос — строка, страница
// и JSON-LD — один отрисовщик на все строки. Добавить вопрос значит
// дописать объект.
//
// Чем отличается от вики. Вики — статья с шагами («как поставить карту
// на сервер»), FAQ — ответ в два-три предложения. Где статья уже есть,
// ответ здесь короткий и ведёт в неё ссылкой, а не пересказывает: две
// копии одной инструкции однажды разойдутся.
//
// ⚠️ Ответы пишутся со слов владельца, а не придумываются под поиск.
// Раздел «How I work» — его ответы 25.09; общие вопросы про Minecraft —
// то, что уже написано в вики, плюс общеизвестное. Новый ответ, в
// котором есть обещание (срок, деньги, права), — сначала владельцу.
//
// ⚠️ Ставка и порог приходят из pricing.ts, как и в вики: ответ,
// разошедшийся с калькулятором, хуже отсутствующего.

export type FaqItem = {
  question: string;
  /** Абзацы ответа. Обычный текст: HTML здесь не печатается. */
  answer: string[];
  /** Куда читать дальше — статья вики или раздел сайта. */
  link?: { href: string; label: string };
};

export type FaqSection = {
  id: string;
  title: string;
  items: FaqItem[];
};

export const FAQ_SECTIONS: FaqSection[] = [
  {
    id: "how-i-work",
    title: "How I work",
    items: [
      {
        question: "Who actually builds the maps?",
        answer: [
          "I do. SouCampus is one builder, not a team: every map is planned and built by me, and the person you talk to in Discord is the person placing the blocks.",
        ],
        link: { href: "/about", label: "About me" },
      },
      {
        question: "What tools do you build with?",
        answer: [
          "WorldEdit, VoxelSniper, Axiom, Arceon, GoBrush, GoPaint and EzEdit — terrain brushes for landscapes, selection tools for architecture, and a lot of hand placement for the detail. The tools only speed up the building: the finished map is ordinary Minecraft blocks.",
        ],
        link: { href: "/about", label: "Skills and toolkit" },
      },
      {
        question: "How does a commission start?",
        answer: [
          "With the details. I ask about the size, your budget, the deadline, the theme, reference images, and any special spots the map needs — a spawn, an arena, a boss room, a place for a shop. The clearer this part is, the fewer surprises later.",
        ],
      },
      {
        question: "What happens once the order is paid?",
        answer: [
          "Before building anything I put together a layout: where each area goes and how they connect. We go over it together, and the build starts only once the plan works for you. Moving a district on a sketch costs nothing; moving it after it is built costs days.",
        ],
      },
      {
        question: "Can I see the progress while you build?",
        answer: [
          "Yes. With 50% paid upfront you get progress updates as screenshots. With 100% paid upfront you can also join me on my build server whenever I am online and walk around the map as it grows — plus the same screenshot updates.",
        ],
      },
      {
        question: "Can you work on a map I already have?",
        answer: [
          "Yes — send the world or the map file along with the rest of the details, and describe what should change. Expanding, reworking or detailing an existing map is priced by the work involved.",
        ],
      },
    ],
  },
  {
    id: "ordering",
    title: "Ordering and payment",
    items: [
      {
        question: "Where do I order?",
        answer: [
          "In Discord: open a ticket and describe the idea. The Contact page has the invite and an instant estimate if you want a number before writing.",
        ],
        link: { href: "/contact", label: "Contact and price estimate" },
      },
      {
        question: "How much does a custom map cost?",
        answer: [
          `Price follows size: ${BASE_RATE}€ per unit of the map's side, ${HIGH_RATE}€ past ${HIGH_RATE_THRESHOLD}×${HIGH_RATE_THRESHOLD}. A 100×100 map comes to ${100 * BASE_RATE}€. Non-square maps are priced off an equivalent side, so a long thin map is not charged as a square of its longest side.`,
        ],
        link: { href: "/terms#pricing", label: "Full pricing breakdown" },
      },
      {
        question: "How do I pay?",
        answer: [
          "Upfront, one of two ways: 50% before the build starts and 50% before the files are delivered, or 100% before the build starts — which also gets you access to the build server while I work.",
        ],
      },
      {
        question: "How long does a build take?",
        answer: [
          "It depends on the size and on how much detail goes in — a small map full of interiors can take longer than a large plain one. The estimate on the Contact page gives a range, and the real date is agreed before the build starts.",
        ],
        link: { href: "/wiki/how-long-a-build-takes", label: "Timeline reference points" },
      },
      {
        question: "Can I ask for changes after delivery?",
        answer: [
          "A number of revisions is included and agreed in advance — for example, one or two free rounds within a week of delivery. Changes beyond that are priced separately.",
        ],
      },
      {
        question: "What if the build is not working out?",
        answer: [
          "You see the progress the whole way through, so problems surface early. If a couple of early rounds of rebuilding still do not get it right, part of the payment is refunded. Being unhappy only at the very end, after approving everything along the way, is not grounds for a refund.",
        ],
        link: { href: "/contact#faq", label: "Refund details" },
      },
    ],
  },
  {
    id: "shop-vs-commission",
    title: "Shop maps and commissions",
    items: [
      {
        question: "What is the difference between a shop map and a commission?",
        answer: [
          "A commissioned map is made for you and belongs to you completely. A map from the shop is a licence to use it: you can play it and host it, but not resell it or pass the files on.",
        ],
      },
      {
        question: "What can I do with a map I bought in the shop?",
        answer: [
          "Play it alone or with friends, run it on your own server, show it in videos and streams. Editing it for your own use is allowed. Reselling it, sharing the files or uploading them anywhere people can download them is not.",
        ],
        link: { href: "/wiki/using-a-map-you-bought", label: "Using a map you bought" },
      },
      {
        question: "Is a commissioned map fully mine?",
        answer: [
          "Yes. Once it is paid for and delivered, the map is yours to use, change and publish as you like.",
        ],
      },
      {
        question: "Can I download a shop map again later?",
        answer: [
          "Yes. Every purchase stays in My purchases, and you can download it as many times as you need.",
        ],
        link: { href: "/wiki/purchases-and-downloads", label: "Purchases and downloads" },
      },
    ],
  },
  {
    id: "minecraft-maps",
    title: "Minecraft maps in general",
    items: [
      {
        question: "Java Edition or Bedrock?",
        answer: [
          "Java Edition. Bedrock stores worlds in a different format and cannot open Java world folders directly.",
        ],
      },
      {
        question: "Which Minecraft versions do you build for?",
        answer: [
          "Java Edition 1.8 and every version after it. Tell me the version your server runs before the build starts: a world opened in a newer version upgrades itself, but it will not load in an older one.",
        ],
        link: { href: "/wiki/versions-and-compatibility", label: "Versions and compatibility" },
      },
      {
        question: "What is a schematic?",
        answer: [
          "A file that holds one structure — just the blocks, without terrain, spawn point or player data. You cannot open it as a world; it is pasted into a world you already have, usually with WorldEdit.",
          "The common formats: .schem is what WorldEdit uses from 1.13 on, .schematic is the older format from before 1.13, and .litematic belongs to the Litematica mod.",
        ],
        link: { href: "/wiki/upload-a-schematic-to-a-server", label: "Pasting a schematic" },
      },
      {
        question: "Should I get a world or a schematic?",
        answer: [
          "A world if the map stands on its own — a lobby, a spawn, an arena you load as it is. A schematic if the build has to go into a world you already run, next to things that are there.",
        ],
      },
      {
        question: "How do I install a map in singleplayer?",
        answer: [
          "Unpack the download and move the world folder into your saves folder. It then shows up in the Singleplayer list under its own name.",
        ],
        link: { href: "/wiki/installing-a-map", label: "Installing a downloaded map" },
      },
      {
        question: "How do I put a map on my server or hosting?",
        answer: [
          "Stop the server, replace the world folder with the map, keep the folder name the server expects (level-name in server.properties), and start it again. Hosting panels usually have a Worlds or Files page with an upload button that does the same thing.",
        ],
        link: { href: "/wiki/upload-a-world-to-a-server", label: "Upload a world to a server" },
      },
      {
        question: "Can I paste a schematic on a hosted server?",
        answer: [
          "Yes, if the server can run WorldEdit: a plugin server such as Paper or Spigot, or a modded one with WorldEdit installed. On a plain vanilla server there is nothing to paste it with.",
        ],
        link: { href: "/wiki/upload-a-schematic-to-a-server", label: "Pasting a schematic" },
      },
      {
        question: "Do the maps need mods?",
        answer: [
          "No. The building tools are only for building — what you receive is made of ordinary blocks. If a particular map needs anything extra, such as a resource pack, its read-me says so.",
        ],
        link: { href: "/wiki/whats-in-the-download", label: "What is inside the download" },
      },
      {
        question: "Blocks are missing after pasting — why?",
        answer: [
          "Almost always because the file and the game disagree about what a block is — typically a build from a newer version pasted into an older one. The game leaves air where it does not recognise a block. The download is not broken.",
        ],
        link: { href: "/wiki/missing-blocks", label: "Missing blocks after pasting" },
      },
    ],
  },
];

/** Все вопросы подряд — для JSON-LD и тестов. */
export const FAQ_ITEMS: FaqItem[] = FAQ_SECTIONS.flatMap((section) => section.items);
