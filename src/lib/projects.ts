export type Project = {
  slug: string;
  title: string;
  tag: string;
  summary: string;
  description: string;
  deadline: string;
  gallery: number;
};

export const projects: Project[] = [
  {
    slug: "medieval-castle",
    title: "Средневековый замок",
    tag: "Замки",
    summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    deadline: "2 недели",
    gallery: 6,
  },
  {
    slug: "survival-spawn",
    title: "Спавн для survival-сервера",
    tag: "Спавны",
    summary: "Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.",
    description:
      "Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    deadline: "10 дней",
    gallery: 8,
  },
  {
    slug: "fantasy-city",
    title: "Фэнтези-город",
    tag: "Города",
    summary: "Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.",
    description:
      "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.",
    deadline: "3 недели",
    gallery: 10,
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}
