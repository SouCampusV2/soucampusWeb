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
    slug: "pink-village",
    title: "Pink Village",
    tag: "Order",
    summary: "A pastel medieval-fantasy village wrapped in cherry blossoms, floating just above the water.",
    description:
      "A cluster of layered medieval-fantasy houses in blue and pink, built on a small island ringed with cherry blossom trees and pale stone cliffs. Soft, dreamy lighting and a tight, detailed footprint make it feel like a postcard. Built in a week.",
    deadline: "1 week",
    size: "150×150",
    price: "€187.5",
    image: "/portfolio/pink-village.png",
  },
  {
    slug: "porto-fiorenza",
    title: "Porto Fiorenza",
    tag: "Team project",
    summary: "A dense Italian coastal city of terracotta roofs, plazas and winding roads.",
    description:
      "A full Italian city district built from the ground up: terracotta-roofed townhouses, domed civic buildings, palm-lined boulevards and a network of roads connecting it all, wrapped around a turquoise bay. Built together with other builders over a month.",
    deadline: "1 month",
    size: "750×750",
    price: "team project",
    image: "/portfolio/porto-fiorenza.jpg",
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
    price: "€300",
    image: "/portfolio/frostwick-holiday.png",
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
    image: "/portfolio/skyhold-sanctuary.png",
  },
  {
    slug: "hollowpeak-hold",
    title: "Hollowpeak Hold",
    tag: "Order",
    summary: "A fortified medieval mountain stronghold with tiered towers and red war banners.",
    description:
      "A defensible medieval mountain base built into a forested cliffside: layered stone-and-timber towers, a windmill, and a central courtyard, all flying red banners. Commissioned as a server spawn and stronghold.",
    deadline: "2 weeks",
    size: "300×300",
    price: "€200",
    image: "/portfolio/hollowpeak-hold.png",
  },
  {
    slug: "mistgrove-fairground",
    title: "Mistgrove Fairground",
    tag: "Order",
    summary: "A foggy amusement park with a working ferris wheel and a grand entrance gate.",
    description:
      "A full amusement park commission: a fog-wrapped ferris wheel, a fountain plaza, and a pair of ornate mansions framed by cherry blossoms.",
    deadline: "3 weeks",
    size: "350×350",
    price: "€300",
    image: "/portfolio/mistgrove-fairground.png",
  },
  {
    slug: "amberhive-hollow",
    title: "Amberhive Hollow",
    tag: "Order",
    summary: "A fantasy garden sanctuary built into a giant hollowed-out honeycomb hive.",
    description:
      "A glowing hollow built around an oversized beehive, with lantern-lit paths framed by huge stylised flowers and crystal formations. Built as a commissioned sanctuary hub for a server.",
    deadline: "1 week",
    size: "150×150",
    price: "€120",
    image: "/portfolio/amberhive-hollow.png",
  },
  {
    slug: "ironholt",
    title: "Ironholt",
    tag: "Order",
    summary: "A sprawling RPG city blending medieval, Japanese and grand European quarters.",
    description:
      "A massive multi-district RPG city built for a fantasy server: a rugged medieval quarter, a Japanese-inspired district, and a grander high-medieval European core, each with its own architecture and character. Home to a mixed fantasy population — orcs and other races/factions each holding their own corner of the city. Gallery includes ground-level streets and a dusk-lit town square.",
    deadline: "1 month",
    size: "500×500",
    price: "€800",
    image: "/portfolio/ironholt.png",
    gallery: ["/portfolio/ironholt-2.png", "/portfolio/ironholt-3.png"],
  },
  {
    slug: "prismport",
    title: "Prismport",
    tag: "Personal project",
    summary: "A vibrant, rainbow-colored island city with a bustling harbor.",
    description:
      "A lively island city with glowing terracotta towers, a covered market street and a small harbor, all wrapped in dense jungle. Built as a personal project exploring bold, saturated color.",
    deadline: "1 week",
    size: "300×300",
    price: "personal project",
    image: "/portfolio/prismport.png",
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
    price: "€450",
    image: "/portfolio/nova-ringport.png",
  },
  {
    slug: "amethyst-grove",
    title: "Amethyst Grove",
    tag: "Order",
    summary: "A glowing violet fantasy-medieval village surrounded by oversized magic flora.",
    description:
      "A small fantasy-medieval village bathed in purple light, framed by oversized magic blossoms and floating platforms. Built as a study in purple and violet lighting.",
    deadline: "1 week",
    size: "150×150",
    price: "€150",
    image: "/portfolio/amethyst-grove.png",
  },
  {
    slug: "voidframe-enclave",
    title: "Voidframe Enclave",
    tag: "Order",
    summary: "A city sealed inside a glowing wireframe dome, floating above alien terrain.",
    description:
      "A compact futuristic city enclosed in a glowing geodesic dome, set above a pink alien landscape. A sci-fi showcase build.",
    deadline: "2 weeks",
    size: "200×200",
    price: "€300",
    image: "/portfolio/voidframe-enclave.jpg",
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}
