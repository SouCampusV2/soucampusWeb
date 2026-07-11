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
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}
