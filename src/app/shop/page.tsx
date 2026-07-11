import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop — SouCampus builds",
};

export default function ShopPage() {
  return (
    <main className="mx-auto flex max-w-6xl flex-1 flex-col items-center justify-center px-6 py-28 text-center">
      <div className="max-w-2xl">
        <h1 className="text-4xl font-extrabold tracking-tight text-zinc-950 sm:text-5xl">
          Shop opening soon
        </h1>
        <p className="mt-4 text-zinc-600">
          Digital products will appear here — maps and other Minecraft
          projects for sale.
        </p>
      </div>
    </main>
  );
}
