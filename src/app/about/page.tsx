import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About me — SouCampus builds",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-3xl flex-1 px-6 py-24">
      <h1 className="text-4xl font-bold tracking-tight text-zinc-950 dark:text-white">
        Обо мне
      </h1>
      <p className="mt-6 leading-7 text-zinc-700 dark:text-zinc-300">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
        eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
        minim veniam, quis nostrud exercitation ullamco laboris nisi ut
        aliquip ex ea commodo consequat.
      </p>
    </main>
  );
}
