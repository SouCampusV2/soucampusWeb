export type Project = {
  slug: string;
  title: string;
  tag: string;
  summary: string;
  description: string;
  deadline: string;
  size: string;
  price: string;
  image: string;
  /** Extra shots of the same build, shown in the gallery on its subpage. */
  gallery?: string[];
};

export const projects: Project[] = [
  {
    slug: "bluespawn",
    title: "BlueSpawn",
    tag: "Order",
    summary: "A bright and lively spawn built for a marketplace, available for purchase.",
    description:
      "A custom BlueSpawn build made for a marketplace — available for purchase by any player for $8.90. Bright, cozy and lively spawn: tropical vegetation, tidy layout and detailed locations that are a pleasure to explore. Built in a week.",
    deadline: "1 week",
    size: "250×250",
    price: "€150",
    image: "/portfolio/bluespawn.webp",
  },
  {
    slug: "pirate-rpg",
    title: "Pirate RPG Map",
    tag: "RPG map",
    summary: "A massive pirate map with dozens of buildings and detailed exteriors.",
    description:
      "A large-scale commission for a huge pirate-themed RPG map. Dozens of buildings, every location's exterior fully detailed — a lot of effort and care went into it. Bright, rich and genuinely massive map. Built over a month together with other builders.",
    deadline: "1 month",
    size: "2000×2000",
    price: "team project",
    image: "/portfolio/pirate-rpg.jpeg",
  },
  {
    slug: "sky-cathedral",
    title: "Sky Cathedral",
    tag: "Personal project",
    summary: "A detailed church on floating islands — an experiment and a passion project.",
    description:
      "A personal project with no client — built out of inspiration and as an experiment. A detailed church on floating islands surrounded by sakura trees. Built in a week.",
    deadline: "1 week",
    size: "350×350",
    price: "personal project",
    image: "/portfolio/sky-cathedral.png",
  },
  {
    slug: "dragon-shrine",
    title: "Dragon Shrine",
    tag: "Trial work",
    summary: "An atmospheric shrine with an organic dragon carving above a temple complex.",
    description:
      "Trial work for a build studio. An incredibly atmospheric build: an organic, large-scale dragon soaring above a temple complex. Built in 2 weeks.",
    deadline: "2 weeks",
    size: "350×350",
    price: "trial",
    image: "/portfolio/dragon-shrine.png",
  },

  // Batch added from freshly dropped photos in public/portfolio/ — titles,
  // tags, summaries and descriptions are AI guesses from looking at the
  // images (asked for explicitly), and deadline/size/price are placeholder
  // estimates, not real figures. Review and correct all of these before
  // launch, same as the rest of the placeholder content tracked in
  // CLAUDE.md.
  {
    slug: "sakura-pagoda-palace",
    title: "Sakura Pagoda Palace",
    tag: "Trial work",
    summary: "A pastel pagoda palace wrapped in cherry blossoms, floating just above the water.",
    description:
      "A layered pagoda-style palace with blue-tiled roofs and gold trim, built on a small island ringed with cherry blossom trees and pale stone monuments. Soft, dreamy lighting and a tight, detailed footprint make it feel like a postcard.",
    deadline: "1 week",
    size: "150×150",
    price: "trial",
    image: "/portfolio/11.png",
  },
  {
    slug: "riviera",
    title: "Riviera",
    tag: "Personal project",
    summary: "A dense Mediterranean city block of terracotta roofs, plazas and winding roads.",
    description:
      "A full city district built from the ground up: terracotta-roofed townhouses, domed civic buildings, palm-lined boulevards and a network of roads connecting it all. Built as an exercise in large-scale urban layout rather than a single showpiece structure.",
    deadline: "3 weeks",
    size: "600×600",
    price: "personal project",
    image: "/portfolio/34772813742102363211.jpg",
  },
  {
    slug: "frostwick-holiday",
    title: "Frostwick Holiday",
    tag: "Personal project",
    summary: "A snow-covered village built around a towering, glowing Christmas tree.",
    description:
      "A festive village of candy-striped cabins and frosted spires gathered around a massive decorated tree, with Santa's sleigh crossing the night sky overhead. A seasonal passion project built for the holidays.",
    deadline: "2 weeks",
    size: "200×200",
    price: "personal project",
    image: "/portfolio/Christmas.png",
  },
  {
    slug: "skyhold-sanctuary",
    title: "Skyhold Sanctuary",
    tag: "Personal project",
    summary: "A cluster of pine-covered floating islands anchored by a grand stone keep.",
    description:
      "A chain of rugged floating islands connected by bridges and vines, crowned with a large stone-and-timber keep overlooking a green pine forest. A bigger, wilder companion piece to Sky Cathedral.",
    deadline: "3 weeks",
    size: "400×400",
    price: "personal project",
    image: "/portfolio/Islands.png",
  },
  {
    slug: "keystone-spire",
    title: "Keystone Spire",
    tag: "Order",
    summary: "A fortified mountain stronghold with tiered pagoda towers and red war banners.",
    description:
      "A defensible mountain base built into a forested cliffside: layered pagoda-roofed towers, a windmill, and a central courtyard, all flying red banners. Commissioned as a server spawn and stronghold.",
    deadline: "2 weeks",
    size: "300×300",
    price: "€200",
    image: "/portfolio/KeyStone3_1_1_1_1_1.png",
  },
  {
    slug: "laylah-park",
    title: "LaylahPark",
    tag: "Order",
    summary: "A foggy amusement park with a working ferris wheel and a grand entrance gate.",
    description:
      "A full amusement park commission: a fog-wrapped ferris wheel reading \"WOW\", a fountain plaza, and a pair of ornate mansions framed by cherry blossoms. Named after the client's project.",
    deadline: "3 weeks",
    size: "350×350",
    price: "€300",
    image: "/portfolio/LaylahPark.png",
  },
  {
    slug: "honeycomb-bazaar",
    title: "Honeycomb Bazaar",
    tag: "Order",
    summary: "A fantasy marketplace built into a giant hollowed-out honeycomb hive.",
    description:
      "A glowing bazaar built around an oversized beehive, with stalls lit by lanterns and framed by huge stylised flowers. Built as a commissioned marketplace hub for a server.",
    deadline: "1 week",
    size: "150×150",
    price: "€120",
    image: "/portfolio/Marketplace.png",
  },
  {
    slug: "ghostlight-village",
    title: "Ghostlight Village",
    tag: "Order",
    summary: "A misty mountain village of pagoda rooftops, red gates and stone paths.",
    description:
      "A large Asian-inspired village built across a foggy mountainside: multi-tiered pagoda towers, red banners, a central shrine courtyard, and cobbled streets connecting every building. Gallery includes ground-level streets and a dusk-lit town square.",
    deadline: "1 month",
    size: "500×500",
    price: "team project",
    image: "/portfolio/MrGhost1.png",
    gallery: ["/portfolio/MrGhost2.png", "/portfolio/MrGhost3.png"],
  },
  {
    slug: "ember-ruins",
    title: "Ember Ruins",
    tag: "Trial work",
    summary: "A tropical island ruin with terracotta spires and an overgrown market street.",
    description:
      "A trial piece built for a studio: a weathered island settlement with glowing orange rock spires, a covered market street and a small dock, all wrapped in dense jungle.",
    deadline: "1 week",
    size: "200×200",
    price: "trial",
    image: "/portfolio/TrialBreadBuilds.png",
  },
  {
    slug: "nova-ringport",
    title: "Nova Ringport",
    tag: "Personal project",
    summary: "A neon space station encircled by a glowing planetary ring.",
    description:
      "A sci-fi space station built around a massive control spire, wrapped in a luminous pink ring and orbited by drifting asteroids and a passing starship. A personal project exploring neon/glow builds outside the usual fantasy style.",
    deadline: "2 weeks",
    size: "250×250",
    price: "personal project",
    image: "/portfolio/darkhanu_kosmos.png",
  },
  {
    slug: "amethyst-grove",
    title: "Amethyst Grove",
    tag: "Personal project",
    summary: "A glowing violet island shrine surrounded by oversized magic flora.",
    description:
      "A small mystical island centered on a glowing altar, framed by oversized red blossoms and floating platforms. Built as a personal study in purple and violet lighting.",
    deadline: "1 week",
    size: "150×150",
    price: "personal project",
    image: "/portfolio/purplekrisha0000.png",
  },
  {
    slug: "genesis-dome",
    title: "Genesis Dome",
    tag: "Personal project",
    summary: "A city sealed inside a glowing wireframe dome, floating above alien terrain.",
    description:
      "A compact futuristic city enclosed in a glowing geodesic dome, set above a pink alien landscape. A personal showcase build.",
    deadline: "2 weeks",
    size: "200×200",
    price: "personal project",
    image: "/portfolio/seniorsoucampus0000.jpg",
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}
