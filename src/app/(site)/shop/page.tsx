import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop",
  // Заглушка, ещё не наполнена — прячем от индексации, чтобы пустая страница
  // не попадала в выдачу. Снять noindex, когда магазин заработает (Этап 4).
  robots: { index: false, follow: true },
};

export default function ShopPage() {
  return (
    <main className="w-full mx-auto max-w-6xl flex-1 px-6 pb-16 sm:pb-28">
      <div className="max-w-2xl pt-20">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
          Shop opening soon
        </h1>
        <p className="mt-4 text-zinc-600 dark:text-zinc-400">
          Digital products will appear here — maps and other Minecraft
          projects for sale.
        </p>
      </div>
    </main>
  );
}
