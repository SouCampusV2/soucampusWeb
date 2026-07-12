import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { Skeleton } from "@/components/Skeleton";

// Same display font as the homepage Hero — rhymes the site's hero headings.
const displayFont = Unbounded({
  weight: "800",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "About me — SouCampus builds",
};

export default function AboutPage() {
  return (
    <main className="w-full mx-auto max-w-6xl flex-1 px-6 pb-28">
      <div className="grid gap-12 pt-28 sm:grid-cols-2 sm:items-start">
        <div>
          <h1
            className={`${displayFont.className} text-4xl leading-tight tracking-tight text-zinc-950 sm:text-5xl`}
          >
            About me
          </h1>
          <p className="mt-6 leading-7 text-zinc-700">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut
            enim ad minim veniam, quis nostrud exercitation ullamco laboris
            nisi ut aliquip ex ea commodo consequat.
          </p>
        </div>

        {/* TODO: replace with a real photo */}
        <div className="relative aspect-square overflow-hidden rounded-3xl">
          <Skeleton className="h-full w-full" />
          <span className="absolute inset-0 flex items-center justify-center text-sm font-medium text-zinc-400">
            Photo coming soon
          </span>
        </div>
      </div>
    </main>
  );
}
