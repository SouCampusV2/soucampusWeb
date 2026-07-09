import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop — SouCampus builds",
};

export default function ShopPage() {
  return (
    <main className="mx-auto flex max-w-3xl flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-zinc-950 dark:text-white">
        Магазин скоро откроется
      </h1>
      <p className="mt-4 text-zinc-600 dark:text-zinc-400">
        Здесь появятся цифровые товары — карты и другие Minecraft-проекты на
        продажу.
      </p>
    </main>
  );
}
