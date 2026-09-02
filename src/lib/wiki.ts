import { BASE_RATE, HIGH_RATE, HIGH_RATE_THRESHOLD } from "@/lib/pricing";
import { DISCORD_INVITE, SUPPORT_EMAIL } from "@/lib/site";

// Вики — справочник для покупателей и заказчиков: как поставить
// скачанную карту, что лежит в архиве, как устроен заказ.
//
// Почему данные, а не готовые страницы. Тот же «table-shaped» приём, что
// у projects.ts и reviews.ts: статья — это строка, страница — один
// отрисовщик на все строки. Добавить статью значит дописать объект, а не
// завести файл, — и оглавление, карта сайта и соседние статьи
// подхватывают её сами, забыть про них негде.
//
// Почему НЕ в базе, в отличие от карт и работ. В базе живёт то, что
// правит владелец через админку между деплоями. Справка правится вместе
// с кодом, который она описывает: меняется формула цены — меняется
// статья про заказ, и обе правки обязаны уехать одним коммитом. Захочет
// владелец править её сам — тогда и переедет в базу, но это уже админка
// со своим редактором, а не строка в таблице.
//
// ⚠️ Числа НЕ ПЕРЕПИСАНЫ РУКАМИ: ставка и порог приходят из pricing.ts,
// адреса — из site.ts. Справка, разошедшаяся с тем, что считает
// калькулятор, хуже отсутствующей: человек ей поверит.

/** Раздел оглавления. Порядок здесь = порядок на странице. */
export const WIKI_SECTIONS = [
  {
    id: "maps",
    title: "Maps",
    description:
      "Getting a downloaded map into your game, and keeping it working.",
  },
  {
    id: "commissions",
    title: "Commissions",
    description: "How a custom build is ordered, priced and delivered.",
  },
  {
    id: "account",
    title: "Account & support",
    description: "Purchases, downloads, and getting hold of a human.",
  },
] as const;

export type WikiSectionId = (typeof WIKI_SECTIONS)[number]["id"];

/** Кусок статьи. Разметки внутри текста нет намеренно — см. ниже. */
export type WikiBlock =
  | { kind: "text"; text: string }
  | { kind: "steps"; items: string[] }
  | { kind: "list"; items: string[] }
  | { kind: "note"; text: string };

export type WikiArticle = {
  slug: string;
  title: string;
  section: WikiSectionId;
  /** Одна фраза — на карточку в оглавлении и в description страницы. */
  summary: string;
  body: { heading: string; blocks: WikiBlock[] }[];
};

// Тело статьи — размеченные БЛОКИ, а не строка с HTML.
//
// HTML в данных пришлось бы выводить через dangerouslySetInnerHTML, то
// есть завести второй путь для разметки на сайте, где для описаний карт
// уже есть sanitize.ts. Здесь текст свой и лежит в репозитории, но
// «свой» — это про сегодня: путь остаётся открытым навсегда, а закрывать
// его придётся тому, кто причину уже не помнит. Блоки же превращает в
// разметку отрисовщик, и вставить в них тег физически нечем.
export const WIKI_ARTICLES: WikiArticle[] = [
  {
    slug: "installing-a-map",
    title: "Installing a downloaded map",
    section: "maps",
    summary:
      "Unpack the download into your saves folder and the world shows up in the singleplayer list.",
    body: [
      {
        heading: "Java Edition, singleplayer",
        blocks: [
          {
            kind: "text",
            text: "A Minecraft world is a folder, and installing one means putting that folder where the game looks for saves. There is no installer and nothing to run.",
          },
          {
            kind: "steps",
            items: [
              "Download the .zip from My purchases and unpack it. You should end up with a folder containing a level.dat file — that folder is the world.",
              "Open your saves folder. On Windows press Win+R and enter %appdata%/.minecraft/saves; on macOS use Finder → Go → Go to Folder → ~/Library/Application Support/minecraft/saves; on Linux it is ~/.minecraft/saves.",
              "Move the world folder into saves. Keep it as one folder — if level.dat ends up sitting directly in saves, you unpacked one level too deep.",
              "Start Minecraft on the version the map was made for and open Singleplayer. The world is in the list under its own name.",
            ],
          },
          {
            kind: "note",
            text: "Using a launcher with separate instances (Prism, MultiMC, CurseForge, the Modrinth app)? Each instance keeps its own saves folder. Use the launcher's own folder button instead of the paths above, or the world lands in an instance you are not playing.",
          },
        ],
      },
      {
        heading: "Putting a map on a server",
        blocks: [
          {
            kind: "steps",
            items: [
              "Stop the server first. Copying a world into a running server corrupts it.",
              "Rename or remove the existing world folder. Its name comes from level-name in server.properties, and it is world by default.",
              "Upload the map folder and give it that same name.",
              "Start the server and check the console for the version it loaded.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "whats-in-the-download",
    title: "What is inside the download",
    section: "maps",
    summary:
      "One .zip per map: the world folder, plus whatever extras that particular build needs.",
    body: [
      {
        heading: "One archive per map",
        blocks: [
          {
            kind: "text",
            text: "Every map is delivered as a single .zip file. If a build ships in more than one form — a world folder plus a schematic, say — both sit inside that one archive, and the map's own page says so.",
          },
          {
            kind: "list",
            items: [
              "The world folder — the thing you copy into saves.",
              "Schematic or structure files, when the build is meant to be pasted into a world you already have.",
              "A short read-me, when the build needs anything beyond copying: a required game version, a resource pack, or where the spawn point is.",
            ],
          },
          {
            kind: "note",
            text: "The formats a given map ships in are listed on its page, in the specs column beside the description. Worth checking before buying if you need a particular one.",
          },
        ],
      },
    ],
  },
  {
    slug: "versions-and-compatibility",
    title: "Versions and compatibility",
    section: "maps",
    summary:
      "Every map lists the Minecraft versions it was built for. Newer usually works; older does not.",
    body: [
      {
        heading: "Check the version before you load",
        blocks: [
          {
            kind: "text",
            text: "Each map page lists the Minecraft versions it was made for, and the catalogue can be filtered by them. That list is the versions the build was actually opened and checked in — not a guess.",
          },
          {
            kind: "list",
            items: [
              "Opening a map in a newer version generally works: Minecraft upgrades worlds as it loads them.",
              "Opening it in an older version does not. The upgrade runs one way, and the game will either refuse the world or load it broken.",
              "Once a world has been opened in a newer version it stays upgraded. Keep the original .zip if you might want to go back.",
            ],
          },
          {
            kind: "note",
            text: "Maps here are built for Java Edition. Bedrock stores worlds in a different format and cannot load these folders.",
          },
        ],
      },
    ],
  },
  {
    slug: "using-a-map-you-bought",
    title: "Using a map you bought",
    section: "maps",
    summary:
      "Play it, host it, build on it. Do not resell it or pass the files on.",
    body: [
      {
        heading: "The short version",
        blocks: [
          {
            kind: "list",
            items: [
              "Play the map alone, with friends, or on a server you run — public servers included.",
              "Edit it, build on top of it, use it as the base of your own project.",
              "Show it off: streams, videos, screenshots. A credit and a link back are appreciated, never demanded.",
            ],
          },
          {
            kind: "text",
            text: "What is not on that list: reselling the map, giving the files away, or publishing them anywhere they can be downloaded from — whole or in recognisable pieces. Buying a map buys the use of it, not the right to hand it on.",
          },
          {
            kind: "note",
            text: `This is the plain-language summary, not the contract. Anything unusual — a paid server network, a commercial project, a build you want to redistribute — is worth asking about first: ${SUPPORT_EMAIL}.`,
          },
        ],
      },
    ],
  },
  {
    slug: "ordering-a-custom-build",
    title: "Ordering a custom build",
    section: "commissions",
    summary:
      "Describe the build, get an estimate the same day, agree the scope, then work starts.",
    body: [
      {
        heading: "How it goes",
        blocks: [
          {
            kind: "steps",
            items: [
              "Send the idea, through the Contact page or straight into Discord. Reference images and a rough size help more than a long description.",
              "You get a price and a timeframe back. The estimator on the Contact page gives you the same number instantly if you would rather check first.",
              "Scope and payment are agreed before anything is built.",
              "The build gets made, with progress shots along the way and a round of changes at the end.",
              "You get the world as a .zip — the same way maps from the shop are delivered.",
            ],
          },
        ],
      },
      {
        heading: "What it costs",
        blocks: [
          {
            kind: "text",
            text: `Price follows the size of the build: ${BASE_RATE}€ per unit of the map's side, stepping up to ${HIGH_RATE}€ past a ${HIGH_RATE_THRESHOLD}×${HIGH_RATE_THRESHOLD} footprint, where detail work grows faster than area does. A 100×100 map comes to ${100 * BASE_RATE}€; a ${HIGH_RATE_THRESHOLD}×${HIGH_RATE_THRESHOLD} one to ${HIGH_RATE_THRESHOLD * HIGH_RATE}€.`,
          },
          {
            kind: "text",
            text: "Maps that are not square are priced off an equivalent side — the square root of width times height — so a long thin build is not charged as though it were a square of its longest side.",
          },
          {
            kind: "note",
            text: "The full breakdown, including non-square builds and how timelines are worked out, is on the Terms page under Pricing.",
          },
        ],
      },
    ],
  },
  {
    slug: "how-long-a-build-takes",
    title: "How long a build takes",
    section: "commissions",
    summary:
      "About a week at 150×150, two weeks minimum at 400×400, three to four at 600×600.",
    body: [
      {
        heading: "Reference points, not promises",
        blocks: [
          {
            kind: "list",
            items: [
              "150×150 — about a week.",
              "400×400 — two weeks at the very least.",
              "600×600 — three to four weeks.",
            ],
          },
          {
            kind: "text",
            text: "These are the anchors the estimator works between, and they assume a normal amount of detail. A small build packed with interiors can take longer than a large plain one — which is why the instant estimate shows a range rather than a date.",
          },
          {
            kind: "note",
            text: "The real timeline also depends on what is already in the queue. That gets agreed with you before work starts, not after.",
          },
        ],
      },
    ],
  },
  {
    slug: "purchases-and-downloads",
    title: "Purchases and downloads",
    section: "account",
    summary:
      "Everything you buy stays in My purchases, and you can download it again whenever you need.",
    body: [
      {
        heading: "Where your files live",
        blocks: [
          {
            kind: "text",
            text: "Buying a map ties it to your account, and it stays in My purchases from then on. Download it as many times as you need, on as many machines as you like.",
          },
          {
            kind: "list",
            items: [
              "Bought as a guest, before making an account? Sign up with the same email address and the purchase attaches itself to the new account.",
              "A map taken off the shop stays in your purchases. Delisting removes it from the catalogue, not from you.",
              "Download links themselves are short-lived on purpose. Open the page again and it hands you a fresh one.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "getting-help",
    title: "Getting help",
    section: "account",
    summary:
      "Discord for anything quick, email for anything involving money or an order.",
    body: [
      {
        heading: "Where to write",
        blocks: [
          {
            kind: "list",
            items: [
              "Discord — questions about builds, commissions and maps. Fastest by a distance.",
              `Email, ${SUPPORT_EMAIL} — payments, invoices, account trouble, and anything you would rather not post in a server.`,
            ],
          },
          {
            kind: "text",
            text: "When something is wrong with a download, include the map name and the email you bought it with. That is enough to find the order without any back and forth.",
          },
          {
            kind: "note",
            text: `The Discord invite is ${DISCORD_INVITE} — it is the same one linked from the footer of every page.`,
          },
        ],
      },
    ],
  },
];

/** Статья по адресу. null — значит 404, решает страница. */
export function getWikiArticle(slug: string): WikiArticle | null {
  return WIKI_ARTICLES.find((article) => article.slug === slug) ?? null;
}

/** Статьи раздела, в порядке объявления. */
export function articlesInSection(section: WikiSectionId): WikiArticle[] {
  return WIKI_ARTICLES.filter((article) => article.section === section);
}
