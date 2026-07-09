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
    tag: "Спавн",
    summary: "Яркий и живой спавн для маркетплейса, доступен для покупки.",
    description:
      "Заказная постройка BlueSpawn для маркетплейса — доступна к покупке любым игроком за $8.90. Яркий, милый и живой спавн: тропическая растительность, аккуратная застройка и детально проработанные локации, которые приятно исследовать. Построен за неделю.",
    deadline: "1 неделя",
    size: "250×250",
    price: "150€",
    image: "/portfolio/bluespawn.webp",
  },
  {
    slug: "pirate-rpg",
    title: "Пиратская RPG-карта",
    tag: "RPG-карта",
    summary: "Огромная пиратская карта с десятками зданий и проработанным экстерьером.",
    description:
      "Масштабный заказ на огромную RPG-карту в пиратской тематике. Построено множество домов, проработан экстерьер каждой локации — вложено много сил и деталей. Яркая, насыщенная и по-настоящему масштабная карта. Строилась месяц совместно с другими билдерами.",
    deadline: "1 месяц",
    size: "2000×2000",
    price: "командный проект",
    image: "/portfolio/pirate-rpg.jpeg",
  },
  {
    slug: "sky-cathedral",
    title: "Небесный собор",
    tag: "Личный проект",
    summary: "Детальная церковь на парящих островах — эксперимент и вдохновение.",
    description:
      "Личный проект без заказчика — построен из вдохновения и в качестве эксперимента. Детальная церковь на парящих островах среди сакур. Построен за неделю.",
    deadline: "1 неделя",
    size: "350×350",
    price: "личный проект",
    image: "/portfolio/sky-cathedral.png",
  },
  {
    slug: "dragon-shrine",
    title: "Святилище дракона",
    tag: "Trial-работа",
    summary: "Атмосферное святилище с органичной резьбой дракона над храмовым комплексом.",
    description:
      "Trial-работа для одной из билд-студий. Нереально атмосферная постройка: органика в виде масштабного дракона, парящего над храмовым комплексом. Построена за 2 недели.",
    deadline: "2 недели",
    size: "350×350",
    price: "trial",
    image: "/portfolio/dragon-shrine.png",
  },
];

export function getProject(slug: string) {
  return projects.find((p) => p.slug === slug);
}
