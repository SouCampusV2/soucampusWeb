import { BASE_RATE } from "@/lib/pricing";

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

/** Дата последней правки текста FAQ — показывается под вкладками. Правишь ответ — меняй. */
export const FAQ_UPDATED = "17 November 2026";

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
          "I do. Right now SouCampus is one builder, not a team: every map is planned and built by me, and the person you talk to in Discord is the person placing the blocks.",
          "If there are ever more orders than I can build myself, I may invite other builders to help under the SouCampus name. Their work would stay in my style, I would check it before it reaches you, and I would personally vouch for its quality.",
        ],
        link: { href: "/about", label: "About me" },
      },
      {
        question: "What tools do you build with?",
        answer: [
          "WorldEdit, VoxelSniper, Axiom, Arceon, GoBrush, GoPaint and EzEdit — terrain brushes for landscapes, selection tools for architecture, and a lot of hand placement for the detail. The tools only speed up the building: the finished map is ordinary Minecraft blocks.",
        ],
        link: { href: "/about", label: "What I build with" },
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
          `Price follows size: ${BASE_RATE}€ per unit of the map's side, the same rate at every size. A 100×100 map comes to ${100 * BASE_RATE}€. Non-square maps are priced off an equivalent side, so a long thin map is not charged as a square of its longest side.`,
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
        // 150×150 — неделя (владелец 17.11). До этого FAQ на /contact
        // обещал «от 2–3 дней», а Terms и вики — неделю.
        question: "How long does a build take?",
        answer: [
          "A 150×150 map takes about a week, 400×400 at least two weeks, 600×600 three to four. Detail matters as much as size — a small map full of interiors can take longer than a large plain one. The estimate on the Contact page gives a range, and the real date is agreed before the build starts.",
        ],
        link: { href: "/wiki/how-long-a-build-takes", label: "Timeline reference points" },
      },
      {
        // «1–2 бесплатные правки, но абсолютно небольшие» (владелец 17.11).
        question: "Can I ask for changes after delivery?",
        answer: [
          "Yes — one or two free rounds of small changes within a week of delivery: adjusting details, swapping blocks, moving a small element. Reworking whole areas or changing the idea is not a small change; that is priced separately and agreed first.",
        ],
      },
      {
        // ⚠️ Возвраты за заказ — со слов владельца 17.11, «очень серьёзно»:
        // после готовой работы возврата нет; возврат только если в ходе
        // стройки не получается и заказчик говорил об этом В ПРОЦЕССЕ.
        // Проценты 45/95 (прежний текст /contact) убраны 17.11 — владелец их
        // не узнал. Сумма — 85% от оплаченного (владелец 17.11: «почти весь,
        // чтобы я не остался ни с чем — время и комиссии переводов»).
        // Меняется только с его слов; тот же текст — на /contact (CONTACT_FAQ)
        // и коротко в /terms#refunds.
        question: "Can I get a refund for a commission?",
        answer: [
          "Once the build is finished, no. You see the progress the whole way through, and that is the time to say if something is wrong — I would much rather fix it then.",
          "A refund is possible only at the start of the build: if we try the direction several times and it still does not work for you at all — and you said so at the time. Then you get 85% of what you paid back; the rest covers the time already spent and transfer fees.",
          "Not liking the finished map — after approving the progress along the way, or without saying anything during the build — is not grounds for a refund or a rebuild.",
        ],
      },
      {
        question: "Is a commissioned map fully mine?",
        answer: [
          "Yes. Once it is paid for and delivered, the map is yours to use, change and publish as you like.",
        ],
      },
    ],
  },
  {
    // Раздел магазина (17.11, владелец: «один FAQ, отдельная секция под
    // магазин»). Сверено с кодом и документами на 17.11: покупка только с
    // аккаунтом (checkout → 401), оплата через Stripe в евро, возвраты —
    // lib/legal.ts и /terms#refunds, скачивание — wiki purchases-and-downloads,
    // форматы — upload-limits.ts, креаторы 18+ — CreatorApplicationForm.
    // ⚠️ «Каждую карту смотрят до витрины» — правда, пока владелец сам
    // проверяет очередь (CLAUDE.md, «Креаторство открыто до сканера»).
    id: "marketplace",
    title: "Marketplace",
    items: [
      {
        question: "What is the marketplace?",
        answer: [
          "A shop of ready-made Minecraft maps — lobbies, spawns, arenas, builds — that you buy and download straight away, instead of commissioning one and waiting for it.",
        ],
        link: { href: "/marketplace", label: "Browse the marketplace" },
      },
      {
        question: "What is the difference between a shop map and a commission?",
        answer: [
          "A commissioned map is made for you and belongs to you completely. A map from the shop is ready now and comes with a licence to use it: you can play it, host it and change it for yourself, but not resell it or pass the files on.",
        ],
      },
      {
        question: "Who makes the maps in the shop?",
        answer: [
          "SouCampus and independent creators. Every map page names its creator, and the creator keeps the rights to the map.",
        ],
      },
      {
        question: "Do I need an account to buy?",
        answer: [
          "Yes. A purchase belongs to your account, which is what keeps it in My purchases so you can download it again at any time.",
        ],
      },
      {
        question: "How do I pay for a shop map?",
        answer: [
          "By card, on Stripe's checkout page. Prices are in euros. Your card details go to Stripe and never reach this site.",
        ],
      },
      {
        question: "When do I get the map?",
        answer: [
          "Right after the payment goes through. The download is waiting in My purchases.",
        ],
        link: { href: "/wiki/purchases-and-downloads", label: "Purchases and downloads" },
      },
      {
        // Текст согласия — WAIVER_TEXT из lib/legal.ts; здесь пересказ,
        // точная формулировка и права — на /terms#refunds.
        question: "Can I get a refund for a shop map?",
        answer: [
          "Not because you changed your mind. A map is a digital download that is yours the moment you pay, and before paying you agree to instant delivery and give up the usual 14-day right to cancel.",
          "If the file is broken, will not open, or is not what the listing describes, write to us: we first try to fix it or send a working file, and if we cannot, you get a full refund.",
        ],
        link: { href: "/terms#refunds", label: "Refunds in the Terms of Service" },
      },
      {
        question: "What can I do with a map I bought in the shop?",
        answer: [
          "Play it alone or with friends, run it on your own server, show it in videos and streams. Editing it for your own use is allowed. Reselling it, sharing the files or uploading them anywhere people can download them is not.",
        ],
        link: { href: "/wiki/using-a-map-you-bought", label: "Using a map you bought" },
      },
      {
        question: "Can I download a shop map again later?",
        answer: [
          "Yes. Every purchase stays in My purchases, and you can download it as many times as you need.",
        ],
        link: { href: "/wiki/purchases-and-downloads", label: "Purchases and downloads" },
      },
      {
        question: "What if a map I bought is taken off the shop?",
        answer: [
          "It stays in My purchases and you can still download it. Taking a map off the shop removes it from the catalogue, not from the people who bought it.",
        ],
      },
      {
        question: "Which versions and formats does a shop map come in?",
        answer: [
          "Each map page lists the Minecraft versions the map was made for and the formats it ships in, in the specs beside the description. The download is one file: a .zip with the world, or a schematic (.schem, .schematic or .litematic).",
        ],
        link: { href: "/wiki/whats-in-the-download", label: "What is inside the download" },
      },
      {
        question: "Are the files safe?",
        answer: [
          "Every map is reviewed before it appears in the shop, and uploaded pictures are rebuilt from their pixels, so nothing but the image itself reaches you.",
        ],
      },
      {
        question: "Can I sell my own maps here?",
        answer: [
          "Yes, if you are 18 or older. Apply as a creator from your account; once you are approved, you upload maps and each one goes live after it has been reviewed.",
        ],
        link: { href: "/resources", label: "Become a creator" },
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

// Вопросы для /contact (17.11, владелец: «самые важные, тематические, и
// ответы одинаковые»). Не своя копия, а выборка из FAQ_SECTIONS по тексту
// вопроса: правишь ответ здесь — он меняется и на /contact. Тест проверяет,
// что каждый вопрос из списка существует.
export const CONTACT_FAQ_QUESTIONS = [
  "How much does a custom map cost?",
  "How long does a build take?",
  "How do I pay?",
  "Can I see the progress while you build?",
  "Can I ask for changes after delivery?",
  "Can I get a refund for a commission?",
  "Which Minecraft versions do you build for?",
  "Can you work on a map I already have?",
] as const;

export const CONTACT_FAQ: FaqItem[] = CONTACT_FAQ_QUESTIONS.flatMap((question) =>
  FAQ_ITEMS.filter((item) => item.question === question)
);
