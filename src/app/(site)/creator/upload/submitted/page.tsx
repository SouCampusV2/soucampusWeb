import type { Metadata } from "next";
import { Unbounded } from "next/font/google";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/Button";
import { PageGlow } from "@/components/PageGlow";

const displayFont = Unbounded({ weight: "800", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Submitted for review",
  robots: { index: false },
};

export default function UploadSubmittedPage() {
  return (
    <main className="relative w-full overflow-x-clip px-6">
      <PageGlow color="rgba(249,115,22,0.28)" />
      <section className="relative flex flex-col items-center pb-28 pt-24 text-center">
        <CheckCircle size={56} weight="fill" className="text-orange-500 dark:text-orange-400" />
        <h1
          className={`${displayFont.className} mt-6 text-3xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-4xl`}
        >
          Submitted for review
        </h1>
        <p className="mx-auto mt-4 max-w-md text-zinc-600 dark:text-zinc-400">
          Thanks — your map is in the queue. It&apos;ll appear on your
          profile and the shop once it&apos;s approved.
        </p>
        <div className="mt-8 flex gap-3">
          <Button href="/resources" variant="secondary">
            Your resources
          </Button>
          <Button href="/shop">Back to shop</Button>
        </div>
      </section>
    </main>
  );
}
