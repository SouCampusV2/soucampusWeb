import type { ArticleBlock, ArticleSection } from "@/lib/article-blocks";
import { BASE_RATE } from "@/lib/pricing";
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
    id: "troubleshooting",
    title: "Troubleshooting",
    description:
      "The map is installed and something looks wrong. Symptom, cause, fix.",
  },
  {
    id: "account",
    title: "Account & support",
    description: "Purchases, downloads, and getting hold of a human.",
  },
] as const;

export type WikiSectionId = (typeof WIKI_SECTIONS)[number]["id"];

/**
 * Кусок статьи. С 2026-09-15 тип общий с постами What's new и живёт в
 * article-blocks.ts — там же объяснено, почему блоки, а не HTML.
 */
export type WikiBlock = ArticleBlock;

export type WikiArticle = {
  slug: string;
  title: string;
  section: WikiSectionId;
  /** Одна фраза — на карточку в оглавлении и в description страницы. */
  summary: string;
  body: ArticleSection[];
};

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
    slug: "upload-a-world-to-a-server",
    title: "Upload a world to a server",
    section: "maps",
    summary:
      "Stop the server, swap the world folder, match the name in server.properties, start it again.",
    body: [
      {
        heading: "Before you upload anything",
        blocks: [
          {
            kind: "text",
            text: "A server keeps its world as a folder next to the server jar, and it holds that folder open the whole time it is running. Replacing it under a live server is the single most common way people lose a world, so the first step is not optional.",
          },
          {
            kind: "steps",
            items: [
              "Stop the server properly — the stop command in the console, or the Stop button in your host's panel. Not a kill or a force restart: those skip the final save.",
              "Take a backup of the world that is there now, even if you are sure you no longer want it. A copy costs nothing today and answers every question you might have tomorrow.",
              "Check which version the server runs. A world made in a newer version will not open on an older server, and there is no way round that.",
            ],
          },
        ],
      },
      {
        heading: "Uploading",
        blocks: [
          {
            kind: "steps",
            items: [
              "Unpack the .zip on your own computer first. You want the folder that directly contains level.dat — that folder is the world.",
              "Open server.properties and read the level-name line. Whatever it says is the folder name the server will look for; on a fresh server it says world.",
              "Delete or rename the old folder of that name, then upload the new one and give it exactly that name. Names are case sensitive on Linux hosts, which is where most servers live.",
              "Upload over SFTP or your panel's file manager. If the panel offers a zip upload with unpack-on-server, use it — uploading thousands of small region files one by one is slow and drops connections.",
              "Start the server and watch the console as it boots. It prints the world it loaded and complains loudly if it could not.",
            ],
          },
          {
            kind: "note",
            text: "On Spigot, Paper and most forks the nether and the end live in separate folders next to the main one — world_nether and world_the_end. If the map uses them, they have to come across too, with matching names.",
          },
        ],
      },
      {
        heading: "If players spawn in the wrong place",
        blocks: [
          {
            kind: "text",
            text: "The server does not read the world's spawn point from the map in every case, and a fresh server.properties has no idea where the build is. Stand where players should arrive and run /setworldspawn. There is a fuller explanation in the article on setting the world spawn.",
          },
        ],
      },
    ],
  },
  {
    slug: "upload-a-schematic-to-a-server",
    title: "Upload a schematic to a server",
    section: "maps",
    summary:
      "A schematic is a building, not a world — it needs WorldEdit and a place to paste it.",
    body: [
      {
        heading: "What a schematic actually is",
        blocks: [
          {
            kind: "text",
            text: "A .schem or .schematic file holds one structure: the blocks, and nothing else. There is no terrain around it, no spawn point, no player data. You cannot open it as a world, and no amount of putting it in the saves folder will make it appear in your singleplayer list. It has to be pasted into a world that already exists, and the thing that does the pasting is WorldEdit.",
          },
        ],
      },
      {
        heading: "Pasting it",
        blocks: [
          {
            kind: "steps",
            items: [
              "Install WorldEdit on the server — FastAsyncWorldEdit is the usual choice on Paper, and it handles large pastes far better.",
              "Put the file in the plugins/WorldEdit/schematics folder. Some setups use plugins/FastAsyncWorldEdit/schematics instead; the plugin's own config says which.",
              "In game, run //schem load followed by the file name, without the extension.",
              "Stand where you want the build and run //paste. The structure appears relative to where you are standing, which is why the next step matters.",
              "Not happy with the position? //undo puts it back, every time. Reposition and paste again.",
            ],
          },
          {
            kind: "note",
            text: "//paste puts the build where the original creator's marker was relative to you, so the first paste often lands slightly off from where you expected. //paste -o ignores that and pastes at the exact original coordinates instead, which is what you want when the build has to line up with something.",
          },
        ],
      },
      {
        heading: "Large builds",
        blocks: [
          {
            kind: "text",
            text: "A big schematic pasted in one go can hang or crash a server outright. If the build is large, paste it with FastAsyncWorldEdit rather than plain WorldEdit, and give the server a moment afterwards to save and light the area. There is a separate article on servers crashing during a paste.",
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
            text: `Price follows the size of the build: ${BASE_RATE}€ per unit of the map's side, one rate at every size. A 100×100 map comes to ${100 * BASE_RATE}€; a 400×400 one to ${400 * BASE_RATE}€.`,
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
  {
    slug: "missing-blocks",
    title: "Missing blocks after pasting",
    section: "troubleshooting",
    summary:
      "Holes in a build almost always mean the file and the game disagree about what a block is.",
    body: [
      {
        heading: "What you are looking at",
        blocks: [
          {
            kind: "text",
            text: "Parts of the build are simply not there — a wall with gaps in it, missing stairs, a roof with holes. The rest of the structure is fine. This is not a corrupted download; it is the game deciding it does not know what those blocks are and leaving air instead.",
          },
        ],
      },
      {
        heading: "Why it happens",
        blocks: [
          {
            kind: "list",
            items: [
              "The game version is older than the build. A block added in a later update does not exist in your version, so there is nothing to place. This is by far the most common cause.",
              "The schematic was saved in an old format. Files from the 1.12 era store blocks as numeric IDs, and modern WorldEdit has to guess at them. Some guesses come out as air.",
              "The build uses blocks from a mod or a plugin that you do not have installed.",
              "The paste hit the world height limit. Anything above the ceiling is discarded silently.",
            ],
          },
        ],
      },
      {
        heading: "What to do",
        blocks: [
          {
            kind: "steps",
            items: [
              "Check the map's page for the versions it lists, and open the world on one of them. Matching the version fixes this outright in most cases.",
              "If you are pasting a schematic, make sure WorldEdit is current. Old conversion code is a common source of gaps.",
              "Paste at a lower Y level if the build is tall and you were near the ceiling.",
              "Still missing blocks on the right version? Write to us with the map name and a screenshot — that is a problem with the file, and we will fix or replace it.",
            ],
          },
          {
            kind: "note",
            text: "Going the other way — opening a build in a version older than it was made for — cannot be fixed by any tool. Minecraft converts worlds forwards only.",
          },
        ],
      },
    ],
  },
  {
    slug: "invisible-blocks",
    title: "Invisible or black blocks",
    section: "troubleshooting",
    summary:
      "The blocks are there — you can walk into them. It is lighting or chunk rendering, not the build.",
    body: [
      {
        heading: "How to tell it apart from missing blocks",
        blocks: [
          {
            kind: "text",
            text: "Walk into the gap. If something solid stops you, the block exists and is simply not being drawn — that is this article. If you walk straight through, the block is genuinely gone and you want the article on missing blocks instead.",
          },
        ],
      },
      {
        heading: "Why it happens",
        blocks: [
          {
            kind: "list",
            items: [
              "Lighting was never calculated for the area. A pasted build arrives with no light data, and until the game recomputes it, interiors render pitch black.",
              "The chunk was drawn before the paste finished. The renderer is showing you a stale copy.",
              "The build genuinely uses barrier or light blocks, which are invisible on purpose.",
              "A resource pack is loaded that does not have textures for those blocks.",
            ],
          },
        ],
      },
      {
        heading: "What to do",
        blocks: [
          {
            kind: "steps",
            items: [
              "Press F3+A. That forces every loaded chunk to redraw and fixes it most of the time, instantly and with no side effects.",
              "Walk far enough away that the chunks unload, then come back. This forces a full reload rather than a redraw.",
              "On a server, run /reload or restart it — some lighting is only recalculated on load.",
              "Turn off any resource pack and look again. If the blocks appear, the pack is the problem, not the map.",
            ],
          },
          {
            kind: "note",
            text: "Large pasted builds can take a while to light properly on a busy server. Give it a minute before assuming something is broken.",
          },
        ],
      },
    ],
  },
  {
    slug: "dead-plants",
    title: "Dead or missing plants",
    section: "troubleshooting",
    summary:
      "Grass, flowers and leaves vanish or turn grey when the ground underneath does not agree with them.",
    body: [
      {
        heading: "What you are looking at",
        blocks: [
          {
            kind: "text",
            text: "The build pastes correctly, and then plants start disappearing — flowers pop off, saplings break, grass turns to dirt, leaves decay away over the next few minutes. Sometimes the greenery is all there but the wrong colour: grey, brown, or a green that does not match the screenshots.",
          },
        ],
      },
      {
        heading: "Why it happens",
        blocks: [
          {
            kind: "list",
            items: [
              "Plants check what is under them the moment they get a block update, and break if it is wrong. A flower that arrived on grass but landed on stone removes itself.",
              "Leaves that are not connected to a log within six blocks decay on their own. Pasting can separate a canopy from its trunk.",
              "Grass and leaf colour comes from the biome, not from the block. The same build looks lush in a plains biome and dead grey in a desert or a snowy one — nothing is broken, the game is tinting it.",
              "Light level matters too: plants in an unlit interior break as soon as they are updated.",
            ],
          },
        ],
      },
      {
        heading: "What to do",
        blocks: [
          {
            kind: "steps",
            items: [
              "For colour, change the biome rather than the blocks. On a server with WorldEdit, select the area and use //setbiome with the biome the build was made for — the map's page or its read-me usually says which.",
              "For plants that keep breaking, check what they are standing on and fix the ground first.",
              "For decaying leaves, make sure the trunk came across with the canopy, or replace the leaves with the persistent variant so they stop checking.",
              "Paste with updates suppressed where your tool supports it — that stops the chain of breaks starting in the first place.",
            ],
          },
          {
            kind: "note",
            text: "Biome tinting catches people out constantly, because nothing about it looks like a setting. If the shape of the build is right and only the colour is wrong, it is the biome every time.",
          },
        ],
      },
    ],
  },
  {
    slug: "falling-blocks",
    title: "Falling sand, gravel and concrete powder",
    section: "troubleshooting",
    summary:
      "Gravity blocks collapse the moment they are updated. Paste without updates, or support them.",
    body: [
      {
        heading: "What you are looking at",
        blocks: [
          {
            kind: "text",
            text: "The build pastes fine, and then sand, gravel, concrete powder, anvils or dragon eggs start raining down. Sometimes it happens immediately, sometimes only when a player walks near and the chunk gets updated. Beaches slump, desert builds lose their walls, and anything decorative made of sand ends up in a pile.",
          },
        ],
      },
      {
        heading: "Why it happens",
        blocks: [
          {
            kind: "text",
            text: "These blocks fall whenever there is air beneath them and something tells them to check. Pasting places them in an order the game did not choose, so a block can exist for a moment before its support does — and that moment is enough. It is not a fault in the file: the same build sitting in the original world is perfectly stable, because it was never asked to re-check.",
          },
        ],
      },
      {
        heading: "What to do",
        blocks: [
          {
            kind: "steps",
            items: [
              "Paste without block updates. In WorldEdit this is //fast or the no-update paste flag, depending on your version; FastAsyncWorldEdit does it by default. This is the real fix and it prevents the problem instead of repairing it.",
              "If it has already collapsed, //undo, then paste again with updates off. Undo is reliable here — do not start rebuilding by hand.",
              "For a build that genuinely has floating sand by design, replace the hidden support with a solid block, or swap the sand for its non-falling equivalent where the look allows it.",
            ],
          },
          {
            kind: "note",
            text: "Suppressing updates has a cost: redstone, water and anything else that relies on being told the world changed will also not update. On a decorative build that is exactly what you want. On a working contraption, paste normally and fix the sand afterwards.",
          },
        ],
      },
    ],
  },
  {
    slug: "errors-while-loading-a-map",
    title: "Errors while loading a map",
    section: "troubleshooting",
    summary:
      "The world will not open at all. Usually a version it cannot read, occasionally an unpacking mistake.",
    body: [
      {
        heading: "Check the obvious one first",
        blocks: [
          {
            kind: "text",
            text: "Open the saves folder and look at the world folder. Inside it there must be a file called level.dat. If instead you see another folder with the same name as the first, you unpacked one level too deep — move the inner folder up and the world appears. If level.dat is sitting loose in saves next to your other worlds, you unpacked one level too shallow.",
          },
        ],
      },
      {
        heading: "The other causes",
        blocks: [
          {
            kind: "list",
            items: [
              "The world was made in a newer version than the one you are running. Minecraft refuses rather than guessing, and it is right to. Launch the version the map's page lists.",
              "The download did not finish. A truncated .zip often unpacks far enough to look complete and then fails on load.",
              "level.dat is corrupted. Minecraft keeps a spare called level.dat_old in the same folder — rename it to level.dat and try again.",
              "The world needs a mod loader or a specific modpack, and you opened it in vanilla.",
            ],
          },
        ],
      },
      {
        heading: "What to do",
        blocks: [
          {
            kind: "steps",
            items: [
              "Match the version first — it costs a minute and explains most of these.",
              "Download the file again from My purchases and unpack the fresh copy, in case the first one was cut short.",
              "Try the level.dat_old trick if the game names that file in its error.",
              "Send us the error text and the map name if none of it helps. A message with the actual error in it gets a real answer straight away; a message saying it does not work needs three rounds of questions first.",
            ],
          },
          {
            kind: "note",
            text: "A world converted to a newer version cannot be converted back. If you want to keep playing on the old version, keep a copy of the folder before you open it on the new one — the upgrade happens on first load, without asking.",
          },
        ],
      },
    ],
  },
  {
    slug: "server-crashing-after-a-schematic",
    title: "Server crashing after a schematic",
    section: "troubleshooting",
    summary:
      "Big pastes hang or kill a server. Split them, use FastAsyncWorldEdit, and give the server room.",
    body: [
      {
        heading: "What you are looking at",
        blocks: [
          {
            kind: "text",
            text: "You run the paste and the server stops responding — players time out, the console goes quiet, and either it recovers after a long pause or the watchdog kills it. The log often mentions a tick taking too long, or memory.",
          },
        ],
      },
      {
        heading: "Why it happens",
        blocks: [
          {
            kind: "text",
            text: "Plain WorldEdit does the whole paste inside a single server tick. A tick is meant to last fifty milliseconds; placing a few million blocks takes far longer, and the server's own watchdog decides the server has frozen and shuts it down. Nothing is broken — it was simply asked to do a week's work between two heartbeats.",
          },
        ],
      },
      {
        heading: "What to do",
        blocks: [
          {
            kind: "steps",
            items: [
              "Install FastAsyncWorldEdit and paste with that instead. It spreads the work across many ticks and is the single biggest improvement you can make.",
              "Give the server more memory before a large paste, and make sure it is not already close to its limit.",
              "Raise or disable the watchdog timeout in server.properties while you do the paste, then put it back. Leaving it off permanently hides real freezes later.",
              "Paste with no players online. Every player online is more work per tick and less headroom.",
              "For a genuinely huge build, paste it in sections rather than in one command.",
            ],
          },
          {
            kind: "note",
            text: "Entities are heavier than blocks. A build carrying hundreds of item frames, armour stands or paintings can crash a server that would have handled the same volume of plain blocks without noticing.",
          },
        ],
      },
    ],
  },
  {
    slug: "setting-the-world-spawn",
    title: "Setting the world spawn",
    section: "troubleshooting",
    summary:
      "Players arriving in an empty field means the server never learned where the build is.",
    body: [
      {
        heading: "What you are looking at",
        blocks: [
          {
            kind: "text",
            text: "The map is installed and correct, but joining puts everyone in random terrain somewhere else, sometimes hundreds of blocks away. New players in particular arrive nowhere near the build.",
          },
        ],
      },
      {
        heading: "Why it happens",
        blocks: [
          {
            kind: "text",
            text: "The spawn point is stored in the world, but a server can override it, and a freshly configured server usually does — it picks a point of its own before anyone thinks to check. Pasted schematics have no spawn point at all, because a schematic stores blocks and nothing else.",
          },
        ],
      },
      {
        heading: "What to do",
        blocks: [
          {
            kind: "steps",
            items: [
              "Stand exactly where players should arrive, facing the direction they should face.",
              "Run /setworldspawn. With no coordinates it uses where you are standing, which is why standing in the right place first matters.",
              "Set spawn-protection in server.properties to 0 if players need to build near spawn, or leave it if you want the area protected.",
              "Test by joining on a fresh account, or by running /kill on yourself and letting the respawn happen.",
            ],
          },
          {
            kind: "note",
            text: "Everyone spawning on the exact same block gets crowded on a busy server. spawn-radius in server.properties spreads arrivals over an area around the point you set.",
          },
        ],
      },
    ],
  },
  {
    slug: "schematic-in-singleplayer",
    title: "Using a schematic in singleplayer",
    section: "troubleshooting",
    summary:
      "A schematic is not a world and will never show up in your saves list. You need WorldEdit.",
    body: [
      {
        heading: "Why it is not in your world list",
        blocks: [
          {
            kind: "text",
            text: "This is the single most common misunderstanding about schematics, and it is not your mistake — the two files arrive the same way and nothing explains the difference. A world is a folder with terrain, a spawn point and player data. A schematic is one file holding one structure and nothing around it. Putting it in the saves folder does nothing at all, because there is no world in it to open.",
          },
        ],
      },
      {
        heading: "Pasting it in singleplayer",
        blocks: [
          {
            kind: "steps",
            items: [
              "Install a mod loader — Fabric or Forge — for the version you want to build in.",
              "Install the WorldEdit mod for that loader. It is the same tool as the server plugin, in mod form.",
              "Put the .schem file in the schematics folder inside your Minecraft directory. WorldEdit creates that folder the first time it runs.",
              "Open the world you want to build in, run //schem load with the file name, stand where you want it and run //paste.",
              "Use //undo if the position is wrong. It works as reliably in singleplayer as it does on a server.",
            ],
          },
        ],
      },
      {
        heading: "Without mods",
        blocks: [
          {
            kind: "text",
            text: "There is a mod-free route, but it is more work: open the world to LAN, or run a local server with the WorldEdit plugin and connect to it. Some people prefer that to installing a loader. There is no way to use a schematic in pure vanilla singleplayer with nothing added — the format is not something the game itself reads.",
          },
          {
            kind: "note",
            text: "If you would rather not deal with any of this, check the map's page before buying: builds delivered as a world folder need none of it, and the specs column says which formats a map ships in.",
          },
        ],
      },
    ],
  },
  {
    slug: "telling-a-version-problem-apart",
    title: "Telling a version problem apart",
    section: "troubleshooting",
    summary:
      "Most reported faults are one thing wearing different clothes. Here is how to recognise it.",
    body: [
      {
        heading: "Why this article exists",
        blocks: [
          {
            kind: "text",
            text: "Missing blocks, wrong colours, a world that will not open and a build that looks subtly off are four different symptoms with one cause behind them more often than not. Recognising it saves an afternoon of chasing the wrong fix.",
          },
        ],
      },
      {
        heading: "The signs",
        blocks: [
          {
            kind: "list",
            items: [
              "Gaps where specific block types should be, while everything else is intact — you are on a version older than the build.",
              "The world refuses to open with an error naming a version or a data format — same cause, further along.",
              "Blocks are present but behave oddly: stairs facing wrong, walls not connecting, slabs merged — the block data was converted between formats and lost detail.",
              "Everything is right but the greenery is the wrong colour — that is biome tinting, not a version problem. See the article on dead plants.",
              "The build looks correct in singleplayer and broken on the server — the two are running different versions.",
            ],
          },
        ],
      },
      {
        heading: "What to do",
        blocks: [
          {
            kind: "steps",
            items: [
              "Read the versions listed on the map's page, in the specs column beside the description. That is what the build was made for.",
              "Check what you are actually running — the launcher for singleplayer, the console output for a server. People are often not on the version they think.",
              "Open the map on a matching version before changing anything else. If the symptom disappears, you have your answer.",
              "Copy the world folder before opening it on a newer version, if you might want the old one back. The upgrade happens on first load and cannot be undone.",
            ],
          },
          {
            kind: "note",
            text: "Versions on a map's page are stated by whoever made the build. They are the versions it was tested on, not a promise about every future update — Minecraft can change block behaviour in a way nobody predicted.",
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
