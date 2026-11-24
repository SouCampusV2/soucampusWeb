import type { ArticleSection } from "@/lib/article-blocks";
import { BASE_RATE } from "@/lib/pricing";

// What's new — новости сайта для посетителя: что появилось и когда.
// Появился 2026-09-15; пункт в навбаре висел серой заглушкой с 14.08.
//
// Почему данные, а не страницы, и почему в коде, а не в базе — ровно по
// тем же доводам, что wiki.ts (решение владельца 15.09): пост — строка,
// страница — один отрисовщик на все строки; публикуется пост коммитом,
// вместе с тем, о чём он рассказывает. Редактор в админке — это таблица,
// RLS и ещё одна запись из браузера, которую потом пришлось бы уводить в
// шлюз (ARCHITECTURE.md § 5.4). Понадобится постить без деплоя — тогда.
//
// ============================================================
// ⚠️ ПРАВИЛА ТЕКСТА — они важнее стиля
//
// 1. ДАТА ПОСТА = день, когда изменение попало в `master`, то есть стало
//    видно посетителю. Не день коммита в `dev`: неделю назад написанное,
//    но не выкаченное для читателя не существует.
//
// 2. Писать только о том, что работает на проде СЕЙЧАС. Пост — обещание,
//    и читатель пойдёт проверять.
//
// 3. Магазин. До 24.11 — без «покупай»: Stripe был в тесте, у карт не было
//    файлов. С 24.11 живые платежи и первая настоящая карта (Hollow
//    Wharf) — звать покупать можно, но только то, что реально лежит на
//    витрине и скачивается.
//
// 4. Замороженное не анонсируется: объяснение «пока закрыто» — тот же
//    анонс. Креаторство было заморожено с 20.08 и открыто снова 27.10 —
//    с 24.11 о нём пишем, честно и с тем, что закрыто (платные цены —
//    только у студии, paid-maps.ts).
//
// 5. Внутренняя кухня — не новость. Шлюзы записи, журнал миграций, тесты
//    — это наша защита, а не то, что человек увидит на экране.
//
// 6. Числа, которые где-то ИСПОЛНЯЮТСЯ, импортируются, а не
//    переписываются (как ставки в статье вики про цену).
//
// 7. Анонс — исключение из правила 2, и только по решению владельца
//    (первый — 11.10, «скоро настоящие карты»). Без дат, без «покупай»,
//    и с честным «что есть сейчас». Обещание с датой — то, что читатель
//    пойдёт проверять в этот день.
// ============================================================
//
// Обложки — фото построек из public/portfolio, пока нет скриншотов самого
// сайта (решение владельца 15.09). Только кадры 16:9: карточка ленты
// держит рамку 16:9, и широкий кадр 2.4:1 в ней потерял бы бока. Широкие
// снимки живут внутри постов блоком image — там рамка берётся из файла.

/** Где на сайте произошло изменение — подпись над заголовком. */
export const UPDATE_AREAS = {
  studio: "Studio",
  marketplace: "Marketplace",
  account: "Account",
  help: "Help",
} as const;

export type UpdateArea = keyof typeof UPDATE_AREAS;

export type UpdatePost = {
  slug: string;
  /** День-ключ «YYYY-MM-DD», печатается formatDayMonthYear (UTC). */
  date: string;
  area: UpdateArea;
  title: string;
  /** Одна фраза — на карточку в ленте и в description страницы. */
  summary: string;
  cover: {
    /** Файл из public/, кадр 16:9 — см. шапку. */
    src: string;
    alt: string;
    /**
     * Какая работа на фото. Подпись под обложкой ведёт на неё: пост про
     * вход через Google с фотографией собора читался бы загадкой, а
     * «на фото — Prismport» превращает украшение в дверь в портфолио.
     * ⚠️ Только слаги, проверенные по сидам: ссылка в 404 хуже её
     * отсутствия.
     */
    pictured?: { name: string; slug: string };
  };
  body: ArticleSection[];
  /** Куда пойти дальше. Одна кнопка, без «купи» (правило 3). */
  link?: { href: string; label: string };
};

// Порядок объявления здесь ничего не решает: ленту сортирует
// getAllUpdates() по дате. Пишем новые сверху — так удобнее читать файл.
export const UPDATES: UpdatePost[] = [
  {
    slug: "the-marketplace-is-open",
    date: "2026-11-24",
    area: "marketplace",
    title: "The marketplace is open: the first real map is here",
    summary:
      "Payments are live, Hollow Wharf is the first map you can buy and download, and creators are back with their own maps.",
    cover: {
      src: "/updates/hollow-wharf.jpg",
      alt: "A sunken duel arena: wooden boardwalks on chains over shallow clear water, a golden centre deck, timber walls and a grassy rim with trees above",
    },
    body: [
      {
        heading: "Real payments, real files",
        blocks: [
          {
            kind: "text",
            text: "Since July the marketplace was a working shop with sample maps and test payments. As of today it takes real money: pay by card, Apple Pay or Google Pay on a secure Stripe page, and the map lands in My purchases the moment the payment goes through, ready to download.",
          },
          {
            kind: "list",
            items: [
              "Buying needs an account, so your purchases never get lost: they live in My purchases, and you can download them again whenever you need.",
              "Before you pay, you agree to get the file straight away, which is why maps are not returned for a change of mind. If a file is broken or not what the page describes, write to us: we fix it, and if we cannot, you get your money back.",
              "The sample maps are coming down, so everything left on the shelf is something you can actually download.",
            ],
          },
        ],
      },
      {
        heading: "Hollow Wharf, the first map",
        blocks: [
          {
            kind: "text",
            text: "The first real map is Hollow Wharf, a 50 by 50 duel arena sunk into a hillside: boardwalks hung on chains over shallow, clear water, a golden deck in the middle to fight for, and a wild, overgrown rim around it all. It is small on purpose. A shop has to start somewhere, and I would rather start with one finished map than ten promises.",
          },
        ],
      },
      {
        heading: "Creators are back",
        blocks: [
          {
            kind: "text",
            text: "Other builders can publish their own maps here again, and I keep working on everything around it.",
          },
          {
            kind: "list",
            items: [
              "Apply to become a creator from your account, then upload maps with a cover, a gallery, versions, size and type.",
              "Every map is reviewed by hand before it reaches the marketplace, and every change to its file sends it back for another look.",
              "For now, creators publish their maps for free. Selling through the site comes once I can pay authors their share; until then, a creator can sell the paid version on BuiltByBit and link it in the description.",
              "Every creator has a profile with a banner, links and the reviews buyers left on their maps.",
            ],
          },
        ],
      },
    ],
    link: { href: "/marketplace/hollow-wharf", label: "See Hollow Wharf" },
  },
  {
    slug: "a-flower-of-its-own",
    date: "2026-11-24",
    area: "studio",
    title: "A new look: SouCampus gets its own brand",
    summary:
      "A logo, a new navbar, a fresh look on every page, help under one set of tabs and new scenes on the contact page.",
    cover: {
      src: "/portfolio/dragon-shrine.png",
      alt: "A blue and gold dragon coiled above a temple complex of red pagoda roofs in a misty jungle",
      pictured: { name: "Dragon Shrine", slug: "dragon-shrine" },
    },
    body: [
      {
        heading: "A logo, and a brand around it",
        blocks: [
          {
            kind: "text",
            text: "SouCampus finally has a logo: a pixel flower, with a fan of petals as its second form. It is not a sticker in the corner. The whole site was redrawn around it, so the same flower and the same colours follow you from the home page to the footer.",
          },
          {
            kind: "list",
            items: [
              "Flowers grow in the generated world on the home page, a little different every time it loads.",
              "In How an order works, the fan fills petal by petal as you scroll past the steps.",
              "The About page opens with a big green flower and the teams I build with.",
              "The browser tab, the footer and even the 404 page carry the mark now.",
              "The light and dark switch became a pixel sun and moon.",
            ],
          },
        ],
      },
      {
        heading: "One navbar, two sides",
        blocks: [
          {
            kind: "text",
            text: "The top bar is the same on every page and splits the site in two: Studio, for the builds I make to order, and Marketplace, for maps you can download. Each opens a panel with everything on that side, and on a phone the same groups sit behind one menu button. Your account, messages, notifications and cart are always one click away.",
          },
        ],
      },
      {
        heading: "Help in one place",
        blocks: [
          {
            kind: "list",
            items: [
              "FAQ, Wiki, Terms and Privacy now sit under one set of tabs with one header, so moving between them no longer feels like changing sites.",
              "The FAQ has a section about the shop, including how refunds work.",
              "The Wiki has a new Schematics section: where to get WorldEdit or FAWE safely, and how to build a schematic in survival with Litematica.",
            ],
          },
        ],
      },
      {
        heading: "Contact, home and reviews",
        blocks: [
          {
            kind: "list",
            items: [
              "The contact page got new scenes, and How an order works now sits there too, ending with a sixth step that brings you straight back to the form.",
              "Recent projects on the home page are now simply the three newest works.",
              "Each review opens on its own page, laid out like a portfolio work.",
              "Two new reviews, from Jorge of Keystone Games and from Zhyrr.",
            ],
          },
        ],
      },
    ],
    link: { href: "/contact", label: "See the new contact page" },
  },
  {
    slug: "real-maps-are-coming",
    date: "2026-10-11",
    area: "marketplace",
    title: "Real maps are coming to the marketplace",
    summary:
      "The first maps built to be downloaded are in the works — they will start appearing on the storefront soon.",
    cover: {
      src: "/portfolio/pirate-rpg.jpeg",
      alt: "A massive pirate RPG map of dozens of detailed buildings",
      pictured: { name: "Pirate RPG Map", slug: "pirate-rpg" },
    },
    body: [
      {
        heading: "What the marketplace has been until now",
        blocks: [
          {
            kind: "text",
            text: "Since July the marketplace has been a working shop with sample maps in it: real pages, search, filters, collections and a checkout — but no files behind the listings. It let me build and test every part of the shop before putting anything real on the shelf.",
          },
        ],
      },
      {
        heading: "What changes next",
        blocks: [
          {
            kind: "text",
            text: "I am finishing the first maps built specifically to be downloaded and used on your own world or server. They will start appearing on the storefront one by one, and the sample maps will come down as the real ones go up.",
          },
          {
            kind: "list",
            items: [
              "Every map page lists the Minecraft versions, file formats, size and type, so you know whether it fits before you open it.",
              "Screenshots show the map itself — no mock-ups.",
              "The download is a ready-to-use file, and the wiki explains what is inside it and how to put it on a server.",
            ],
          },
        ],
      },
      {
        heading: "When",
        blocks: [
          {
            kind: "text",
            text: "Soon — but I would rather post here the day a map is actually there than promise a date. A post will say so the moment the first one can be bought and downloaded. The quickest way to hear about it is the Discord server.",
          },
        ],
      },
    ],
    link: { href: "/wiki/whats-in-the-download", label: "What's in a download" },
  },
  {
    slug: "who-is-soucampus",
    date: "2026-10-10",
    area: "studio",
    title: "Meet the builder behind the maps",
    summary:
      "The home page now says who builds the maps, the About page opens up to full width, and the contact page shows how an order works.",
    cover: {
      src: "/portfolio/corsair-isle.jpg",
      alt: "A tropical volcano island with a palm-covered pirate village and a galleon at anchor",
      pictured: { name: "Corsair Isle", slug: "corsair-isle" },
    },
    body: [
      {
        heading: "Who is SouCampus",
        blocks: [
          {
            kind: "text",
            text: "A new section on the home page, right before the latest work, answers the first question a new visitor has: who actually builds these maps. In short — my skin, how it started, fifteen years in Minecraft, around ten regular clients and the places where new builds appear first.",
          },
        ],
      },
      {
        heading: "About, wider",
        blocks: [
          {
            kind: "text",
            text: "The About page used to sit in a narrow column. Now the story stays beside you on the left while the tree of achievements scrolls on the right, and the skin wears a floating name tag, just like in the game.",
          },
        ],
      },
      {
        heading: "How an order works, where you order",
        blocks: [
          {
            kind: "text",
            text: "The five steps of a commission — from the first message to the finished world — now sit on the contact page too, right under the price calculator, each with its own icon.",
          },
        ],
      },
    ],
    link: { href: "/about", label: "Read my story" },
  },
  {
    slug: "links-that-show-the-build",
    date: "2026-10-04",
    area: "studio",
    title: "Links that show the build",
    summary:
      "Share a work or a post in Discord and it unfolds into a card with the screenshots — and every such page has a Copy link button.",
    cover: {
      src: "/portfolio/yuletide-isle.png",
      alt: "A floating snow island holding a festive village of red-roofed cabins",
      pictured: { name: "Yuletide Isle", slug: "yuletide-isle" },
    },
    body: [
      {
        heading: "A card instead of a bare address",
        blocks: [
          {
            kind: "text",
            text: "Paste the address of a work from the portfolio or of a post from this page into Discord, and it turns into a card: the title, a short description, up to four screenshots and an orange stripe down the side. The same card shows up in Telegram, X and Slack.",
          },
        ],
      },
      {
        heading: "Copy link",
        blocks: [
          {
            kind: "text",
            text: "Every work and every post now has a Copy link button, so sending a build to a friend — or to a client who asked “what have you made before?” — takes one tap.",
          },
        ],
      },
    ],
    link: { href: "/portfolio", label: "Browse the portfolio" },
  },
  {
    slug: "an-faq-and-a-lighter-home-page",
    date: "2026-09-25",
    area: "help",
    title: "An FAQ, and a home page that arrives faster",
    summary:
      "Twenty-five answers about commissions, shop maps and Minecraft in one place — and a lighter home page.",
    cover: {
      src: "/portfolio/ironholt.png",
      alt: "A sprawling RPG city of stone walls, towers and red roofs",
      pictured: { name: "Ironholt", slug: "ironholt" },
    },
    body: [
      {
        heading: "A page for the questions people ask first",
        blocks: [
          {
            kind: "text",
            text: "Most conversations in Discord start with the same handful of questions: who actually builds the maps, how a commission starts, how payment works, whether a map will run on a particular server. The answers now live on one page.",
          },
          {
            kind: "list",
            items: [
              "How I work — from collecting the details to the layout we agree on before a single block is placed, and how you can follow the build.",
              "Ordering and payment — where to order, how the price is worked out, the two ways to pay, revisions and refunds.",
              "Shop maps and commissions — what you can do with a map you bought, and why a commissioned map is fully yours.",
              "Minecraft maps in general — Java versions, what a schematic is, and how to get a map onto your own server.",
            ],
          },
          {
            kind: "text",
            text: "Where the wiki already has a step-by-step guide, the answer is short and links to it. More questions will keep arriving — if yours is missing, ask it in Discord and it may well end up on the page.",
          },
        ],
      },
      {
        heading: "The home page got lighter",
        blocks: [
          {
            kind: "text",
            text: "The home page was downloading code it never used — the part of the site that handles accounts, even though the studio side shows no account at all. It now loads only where it is needed, which takes about a fifth off the home page's scripts, and the first screen's text no longer waits for them to show up.",
          },
        ],
      },
    ],
    link: { href: "/faq", label: "Read the FAQ" },
  },
  {
    slug: "reviews-with-faces",
    date: "2026-09-24",
    area: "studio",
    title: "Reviews with faces, and work pages worth lingering on",
    summary:
      "Client reviews now show who wrote them, and every portfolio page tells you what the build actually was.",
    cover: {
      src: "/portfolio/hollowpeak-hold.png",
      alt: "A fortified medieval stronghold carved into a snowy mountain",
      pictured: { name: "Hollowpeak Hold", slug: "hollowpeak-hold" },
    },
    body: [
      {
        heading: "Reviews",
        blocks: [
          {
            kind: "text",
            text: "Every review now carries the client's own avatar, and its page takes on the colour of its card. At the bottom you can move straight on to the next review instead of going back to the list.",
          },
        ],
      },
      {
        heading: "Work pages",
        blocks: [
          {
            kind: "text",
            text: "A portfolio page now opens with a large cover and three quick facts about the build: its size, how long it took, and what it cost — or, for a personal project, what kind of build it is. The size is also given in football pitches — 200×200 blocks means little if you have never played Minecraft, a few pitches means a lot.",
          },
          {
            kind: "text",
            text: "Below the description, the neighbouring works follow as cards, and a short note points to the Contact page if you want something similar.",
          },
        ],
      },
      {
        heading: "Back takes you back",
        blocks: [
          {
            kind: "text",
            text: "The Back link on a review or a work page used to drop you at the top of the page you came from. It now returns you to the card you clicked, and highlights it for a moment so you can see where you were.",
          },
        ],
      },
    ],
    link: { href: "/portfolio", label: "Browse the portfolio" },
  },
  {
    slug: "a-world-on-the-home-page",
    date: "2026-09-24",
    area: "studio",
    title: "The home page grows its own world",
    summary:
      "The first screen is now a Minecraft-style world generated from a single number — a different one on every visit.",
    cover: {
      src: "/portfolio/amberhive-hollow.png",
      alt: "A fantasy garden sanctuary of giant flowers and winding paths",
      pictured: { name: "Amberhive Hollow", slug: "amberhive-hollow" },
    },
    body: [
      {
        heading: "What you are looking at",
        blocks: [
          {
            kind: "text",
            text: "The map behind the first screen is not a picture. It grows from one number, the world seed, much the way a Minecraft world does: a height field decides where the water, beaches, forests, meadows, rock and snow go, a second field adds climate, and a third one brings the clouds. Every block is one square, drawn without smoothing.",
          },
          {
            kind: "text",
            text: "Each visit starts from a new seed, so the world you see is almost certainly one nobody else has seen. The land drifts slowly one way, the clouds faster the other, and the clouds gather one by one after the world appears.",
          },
        ],
      },
      {
        heading: "Make a new one",
        blocks: [
          {
            kind: "text",
            text: "The seed is shown in the corner. Press New world next to it and a fresh one fades in without stopping the drift.",
          },
        ],
      },
    ],
    link: { href: "/", label: "See it on the home page" },
  },
  {
    slug: "a-faster-storefront",
    date: "2026-09-07",
    area: "marketplace",
    title: "The storefront loads faster — and holds still",
    summary:
      "Maps now arrive together with the page, so nothing jumps around while you read.",
    cover: {
      src: "/portfolio/skyward-armada.jpg",
      alt: "Lush sky islands crowned with a red-roofed keep, circled by a fleet of airships",
      pictured: { name: "Skyward Armada", slug: "skyward-armada" },
    },
    body: [
      {
        heading: "What you'll notice",
        blocks: [
          {
            kind: "text",
            text: "Until this week the marketplace reached your browser as an empty frame, and the maps were filled in a moment later. On a phone that moment was long enough to feel: the catalogue appeared, the banner at the bottom slid half a screen down, and whatever you were about to tap moved out from under your finger.",
          },
          {
            kind: "text",
            text: "Now the storefront arrives already filled in. The maps are there from the very first frame, and nothing on the page moves after it.",
          },
        ],
      },
      {
        heading: "The numbers",
        blocks: [
          {
            kind: "list",
            items: [
              "Layout shift on the storefront: from 0.45 to 0. The page no longer moves at all while it loads.",
              "Mobile PageSpeed score for the storefront: from about 65 to over 80.",
            ],
          },
        ],
      },
      {
        heading: "Why it matters beyond speed",
        blocks: [
          {
            kind: "text",
            text: "Search engines read that first frame too. Before the fix they saw a shop with no maps in it; now they see the same catalogue you do — which is what lets a map be found by someone searching for it.",
          },
        ],
      },
    ],
    link: { href: "/marketplace", label: "Open the marketplace" },
  },
  {
    slug: "the-wiki",
    date: "2026-09-06",
    area: "help",
    title: "The Wiki: answers without waiting for Discord",
    summary:
      "Nineteen articles on installing maps, running them on a server, fixing what looks wrong, and how commissions work.",
    cover: {
      src: "/portfolio/pink-village.png",
      alt: "A pastel medieval-fantasy village wrapped in cherry blossoms on a small island",
      pictured: { name: "Pink Village", slug: "pink-village" },
    },
    body: [
      {
        heading: "Written down, once",
        blocks: [
          {
            kind: "text",
            text: "Some questions come up in Discord every week: where does a downloaded world go, why are some blocks missing, can I put this on my server. They all have good answers, and until now every one of those answers lived in a chat thread that scrolled away. The Wiki keeps them in one place, in plain steps, for anyone who needs them — at three in the morning, without waiting for a reply.",
          },
        ],
      },
      {
        heading: "What's inside",
        blocks: [
          {
            kind: "list",
            items: [
              "Maps — installing a download, putting a world on a server, what's inside the archive, and which Minecraft versions a map will open in.",
              "Commissions — how a custom build is ordered, how the price is worked out, and how long it takes.",
              "Troubleshooting — symptom, cause, fix: missing blocks, a world that won't open, and the other surprises.",
              "Account & support — purchases, downloads, and how to reach a person.",
            ],
          },
        ],
      },
      {
        heading: "And a proper 404",
        blocks: [
          {
            kind: "text",
            text: "Mistype an address and you now land on a page of our own: one very large 404. Click it and it takes you home.",
          },
        ],
      },
    ],
    link: { href: "/wiki", label: "Open the Wiki" },
  },
  {
    slug: "a-storefront-you-can-search",
    date: "2026-08-26",
    area: "marketplace",
    title: "A storefront you can actually search",
    summary:
      "Collections up front, one panel with every filter, and your account menu back on phones.",
    cover: {
      src: "/portfolio/mistgrove-fairground.png",
      alt: "A fog-wrapped amusement park with a ferris wheel and a grand entrance gate",
      pictured: { name: "Mistgrove Fairground", slug: "mistgrove-fairground" },
    },
    body: [
      {
        heading: "Collections first",
        blocks: [
          {
            kind: "text",
            text: "The marketplace now opens on rows of collections — Most popular, Recently added, Top rated — each with its own View all page. Choose a collection or a category and you get one clean list with a heading; the Collections pill takes you back to the rows.",
          },
        ],
      },
      {
        heading: "Every filter in one panel",
        blocks: [
          {
            kind: "text",
            text: "Filters live in a single panel next to search, so they never push the maps down the page. The button shows how many you've applied.",
          },
          {
            kind: "list",
            items: [
              "Price, from and to — both ends included.",
              "Minecraft version, file format, map type and game mode.",
              "Size and theme.",
              "Sorting: newest, oldest, price either way, name, or best rated.",
            ],
          },
          {
            kind: "note",
            text: "Inside one filter any match counts: pick 1.20 and 1.21 and you'll see maps made for either. Different filters narrow each other down.",
          },
        ],
      },
      {
        heading: "Looking for something custom?",
        blocks: [
          {
            kind: "text",
            text: "Every storefront page now ends with a way to order a map of your own, straight in our Discord — with an offer on your first commission. If the map you're after doesn't exist yet, that's where it starts.",
          },
        ],
      },
      {
        heading: "Your account, on a phone",
        blocks: [
          {
            kind: "text",
            text: "On narrow screens your profile, settings, purchases and log out were hidden behind a menu that only opened on hover — and a phone never hovers. They now sit in the main menu, under a line of their own.",
          },
        ],
      },
    ],
    link: { href: "/marketplace", label: "Browse the maps" },
  },
  {
    slug: "sign-in-with-google",
    date: "2026-08-25",
    area: "account",
    title: "Sign in with Google",
    summary:
      "One click to an account — and a privacy policy that says plainly what the site keeps.",
    cover: {
      src: "/portfolio/prismport.png",
      alt: "A rainbow-coloured island city with glowing towers and a small harbour",
      pictured: { name: "Prismport", slug: "prismport" },
    },
    body: [
      {
        heading: "No new password to remember",
        blocks: [
          {
            kind: "text",
            text: "You can now create an account, or sign in to the one you have, with your Google account. The first time, you'll pick the name people will see on your profile and under your comments — Google doesn't choose it for you, and that first pick is free to change.",
          },
          {
            kind: "text",
            text: "Your Google profile photo stays with Google. We don't copy it onto your public profile, so visitors to your page never load an image from someone else's server.",
          },
        ],
      },
      {
        heading: "A privacy policy in plain words",
        blocks: [
          {
            kind: "text",
            text: "There's now a Privacy page. It lists what the site collects, why, and who else is involved — payments, email, hosting — and it describes what the site actually does, not a template of what sites usually do.",
          },
        ],
      },
    ],
    link: { href: "/privacy", label: "Read the privacy policy" },
  },
  {
    slug: "map-pages-say-more",
    date: "2026-08-22",
    area: "marketplace",
    title: "Every map page got more to say",
    summary:
      "Comments from owners, a reaction for everyone, a spec sheet, similar maps underneath, and a short address for your profile.",
    cover: {
      src: "/portfolio/solace-spires.png",
      alt: "Sleek white towers rising out of a misty palm jungle",
      pictured: { name: "Solace Spires", slug: "solace-spires" },
    },
    body: [
      {
        heading: "Comments from people who own the map",
        blocks: [
          {
            kind: "text",
            text: "Only someone who has a map can comment on it. What you read under a map comes from people who actually opened it in their game.",
          },
        ],
      },
      {
        heading: "One reaction, open to everyone",
        blocks: [
          {
            kind: "text",
            text: "Each map has a single reaction, chosen by whoever made it. Anyone signed in can add theirs — no purchase needed. A reaction means “this looks great”, and that is usually decided before buying, not after.",
          },
        ],
      },
      {
        heading: "The spec sheet",
        blocks: [
          {
            kind: "text",
            text: "Every map page now has the same column of facts, so maps can be compared at a glance:",
          },
          {
            kind: "list",
            items: [
              "Minecraft versions the map was made for",
              "Map type, game modes and theme",
              "Size, file format and file size",
            ],
          },
        ],
      },
      {
        heading: "Similar maps",
        blocks: [
          {
            kind: "text",
            text: "Under each map, a row of the maps that have the most in common with it — category, type, modes, theme. When nothing is close enough, the row simply isn't there: an empty row filled with unrelated maps would only waste your time.",
          },
        ],
      },
      {
        heading: "Small things",
        blocks: [
          {
            kind: "list",
            items: [
              "Every account has a public profile at a short address: soucampus.online/@yourname.",
              "Dates and times show in your own time zone, not the server's.",
            ],
          },
        ],
      },
    ],
  },
  {
    slug: "notifications-arrive-on-their-own",
    date: "2026-08-15",
    area: "account",
    title: "Notifications arrive on their own",
    summary:
      "The bell updates the moment something happens — no refresh, and nothing lost while the tab was closed.",
    cover: {
      src: "/portfolio/voidframe-enclave.jpg",
      alt: "A compact futuristic city sealed inside a glowing wireframe dome",
      pictured: { name: "Voidframe Enclave", slug: "voidframe-enclave" },
    },
    body: [
      {
        heading: "The bell",
        blocks: [
          {
            kind: "text",
            text: "The bell in the marketplace bar tells you when a purchase goes through and when the studio has news to share. From today it updates by itself: a new notification appears the moment it's sent, without reloading the page.",
          },
          {
            kind: "text",
            text: "Close the tab and you miss nothing — everything waits for you in Notifications until you come back.",
          },
        ],
      },
      {
        heading: "Read means read",
        blocks: [
          {
            kind: "text",
            text: "A notification is marked as read only when you say so: open it, tick it, or press Mark all as read. Having the tab open in the background doesn't count as reading.",
          },
        ],
      },
    ],
  },
  {
    slug: "forgot-your-password",
    date: "2026-08-01",
    area: "account",
    title: "Forgot your password? There's a way back now",
    summary:
      "Password reset by email, and account pages that are named after what's actually on them.",
    cover: {
      src: "/portfolio/pinecliff-haven.png",
      alt: "A sunlit island town of terracotta roofs and pinewoods, linked to lookout towers by rope bridges",
      pictured: { name: "Pinecliff Haven", slug: "pinecliff-haven" },
    },
    body: [
      {
        heading: "Password reset",
        blocks: [
          {
            kind: "text",
            text: "Until now a forgotten password meant a locked account. The sign-in page now has a Forgot password link: enter your email, follow the link we send, and choose a new password.",
          },
          {
            kind: "note",
            text: "The reply is the same whether or not an address has an account here. That's deliberate — otherwise the form could be used to find out who is registered.",
          },
        ],
      },
      {
        heading: "Account pages that match their names",
        blocks: [
          {
            kind: "text",
            text: "Settings opens your settings, My purchases opens your purchases — each on a page of its own, instead of one page that tried to be all of them. Old links still work and take you to the right place.",
          },
        ],
      },
    ],
  },
  {
    slug: "eleven-new-builds",
    date: "2026-07-27",
    area: "studio",
    title: "Eleven new builds in the portfolio",
    summary:
      "From a dragon-crowned cathedral to a snowed-in holiday island — plus more photos of builds already there.",
    cover: {
      src: "/portfolio/sakura-hollow.png",
      alt: "Tiered pagodas and shrines among cherry blossoms, reflected in still turquoise water",
      pictured: { name: "Sakura Hollow", slug: "sakura-hollow" },
    },
    body: [
      {
        heading: "What's new",
        blocks: [
          {
            kind: "text",
            text: "Eleven builds joined the portfolio — commissions and personal projects from the last couple of years that had never been shown here. Each has its own page with size, time taken and price.",
          },
          {
            kind: "list",
            items: [
              "Dragon Cathedral — gothic spires with a fire-orange dragon coiled across the roof",
              "Corsair Isle — a volcano island with a pirate village and a galleon at anchor",
              "Sakura Hollow — pagodas and shrines on a quiet cherry-blossom island",
              "Yuletide Isle — a floating snow island with a Christmas village",
              "Arena Atoll — a compact PvP arena ringed by tree-topped pillars",
              "Pinecliff Haven, Duskspire Quarter, Skyward Armada, Driftstone Isles, Emberpeak Village and Solace Spires",
            ],
          },
          {
            kind: "image",
            src: "/portfolio/dragon-cathedral.jpg",
            alt: "A pale gothic cathedral with a massive orange dragon draped across its nave",
            width: 1680,
            height: 708,
            caption: "Dragon Cathedral — 600×600 blocks, built in a week.",
          },
          {
            kind: "image",
            src: "/portfolio/corsair-isle.jpg",
            alt: "A tropical volcano island with golden-roofed huts, a dockside market and a moored galleon",
            width: 1680,
            height: 945,
            caption: "Corsair Isle — 250×250 blocks.",
          },
          {
            kind: "image",
            src: "/portfolio/driftstone-isles.png",
            alt: "A row of standalone biome islands: forest, red canyon, snowy peak and more",
            width: 1680,
            height: 719,
            caption:
              "Driftstone Isles — a set of 150×150 biome islands, each ready to drop into a world.",
          },
        ],
      },
      {
        heading: "More photos of older builds",
        blocks: [
          {
            kind: "text",
            text: "Hollowpeak Hold, Pirate RPG and Yuletide Isle got extra shots in their galleries, so you can see more than a single angle.",
          },
        ],
      },
    ],
    link: { href: "/portfolio", label: "See the portfolio" },
  },
  {
    slug: "meet-the-marketplace",
    date: "2026-07-27",
    area: "marketplace",
    title: "Meet the Marketplace",
    summary:
      "Ready-made maps next to the commissions: screenshot galleries, ratings from owners, and a profile for whoever made each map.",
    cover: {
      src: "/portfolio/skyhold-sanctuary.png",
      alt: "Pine-covered floating islands joined by bridges, crowned with a stone-and-timber keep",
      pictured: { name: "Skyhold Sanctuary", slug: "skyhold-sanctuary" },
    },
    body: [
      {
        heading: "The other half of the studio",
        blocks: [
          {
            kind: "text",
            text: "SouCampus has always built maps to order. The marketplace is the other half: finished maps you can look through at your own pace, with no brief to write and no wait.",
          },
          {
            kind: "list",
            items: [
              "A gallery of screenshots for every map, with a full-screen view.",
              "A proper description, laid out like a page rather than a paragraph.",
              "Star ratings — and only people who own a map can rate it.",
              "A public profile for whoever made the map, with everything else they've published.",
              "A cart, so several maps go through in one checkout.",
            ],
          },
        ],
      },
      {
        heading: "Still stocking the shelves",
        blocks: [
          {
            kind: "note",
            text: "Payments are in test mode while the first maps get their final files. When real purchases open, it will be announced right here.",
          },
        ],
      },
    ],
    link: { href: "/marketplace", label: "Look around" },
  },
  {
    slug: "price-your-map",
    date: "2026-07-18",
    area: "studio",
    title: "Price your map before you ask",
    summary:
      "A calculator on the Contact page turns a map's size into a price and a timeline — in your currency.",
    cover: {
      src: "/portfolio/duskspire-quarter.png",
      alt: "An ornate fantasy palace above a winding river, in soft pink dusk light",
      pictured: { name: "Duskspire Quarter", slug: "duskspire-quarter" },
    },
    body: [
      {
        heading: "Size in, estimate out",
        blocks: [
          {
            kind: "text",
            text: "Enter your map's width and height in blocks, and the calculator on the Contact page shows what it would cost and how long it usually takes. The timeline is a range on purpose: a real build depends on detail as well as size, and a single exact number would be a promise nobody can keep.",
          },
        ],
      },
      {
        heading: "The same formula as a real quote",
        blocks: [
          {
            kind: "list",
            items: [
              `${BASE_RATE}€ per block of the map's side — a 100×100 map comes to ${100 * BASE_RATE}€.`,
              "The rate is the same for every size — a large map is not charged extra per block.",
              "A rectangular map is priced as the square of the same area, so neither side is overcharged.",
            ],
          },
          {
            kind: "text",
            text: "Prices convert to your currency at the day's European Central Bank rate.",
          },
        ],
      },
    ],
    link: { href: "/contact", label: "Try the calculator" },
  },
  {
    slug: "dark-theme",
    date: "2026-07-17",
    area: "studio",
    title: "Lights off: a dark theme",
    summary:
      "A switch in the footer, remembered on your next visit — without a flash of white on the way in.",
    cover: {
      src: "/portfolio/nova-ringport.png",
      alt: "A neon space station ringed by a glowing pink planetary ring",
      pictured: { name: "Nova Ringport", slug: "nova-ringport" },
    },
    body: [
      {
        heading: "One switch",
        blocks: [
          {
            kind: "text",
            text: "The sun-and-moon button next to the logo in the footer switches the whole site between light and dark. Your choice is remembered, and the page opens straight in it — no bright flash before the dark theme kicks in.",
          },
        ],
      },
    ],
  },
  {
    slug: "soucampus-online-is-live",
    date: "2026-07-14",
    area: "studio",
    title: "soucampus.online is live",
    summary:
      "Sixteen builds, reviews from real clients, and a way to start a commission — the studio has a home of its own.",
    cover: {
      src: "/portfolio/sky-cathedral.png",
      alt: "A detailed church on floating islands surrounded by sakura trees",
      pictured: { name: "Sky Cathedral", slug: "sky-cathedral" },
    },
    body: [
      {
        heading: "A home for the work",
        blocks: [
          {
            kind: "text",
            text: "Until today, the builds lived in Discord threads and scattered screenshots. Now they have an address.",
          },
          {
            kind: "list",
            items: [
              "A portfolio of sixteen builds, each with its own page: photos, size, time taken and price.",
              "Reviews from seven clients, in their own words.",
              "Pricing and a straight line to ordering a map of your own.",
            ],
          },
        ],
      },
    ],
    link: { href: "/portfolio", label: "See the portfolio" },
  },
];

/** Лента: новые сверху. Сортировка стабильна — посты одного дня идут в
 * порядке объявления. Строки «YYYY-MM-DD» сравниваются как даты. */
export function getAllUpdates(): UpdatePost[] {
  return [...UPDATES].sort((a, b) => b.date.localeCompare(a.date));
}

/** Пост по адресу. null — значит 404, решает страница. */
export function getUpdate(slug: string): UpdatePost | null {
  return UPDATES.find((post) => post.slug === slug) ?? null;
}
