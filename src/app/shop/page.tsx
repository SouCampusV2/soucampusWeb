import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shop — SouCampus builds",
};

export default function ShopPage() {
  return (
    <main className="w-full mx-auto max-w-6xl flex-1 px-6 pb-16 sm:pb-28">
      <div className="max-w-2xl pt-20">
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
