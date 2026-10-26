import type { Metadata } from "next";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/Button";

export const metadata: Metadata = {
  title: "Submitted for review",
  robots: { index: false },
};

// Экран после отправки карты автором. Близнец
// admin/products/new/submitted, но «дальше» у автора другое: очереди
// разбора он не видит, его карта — в собственном списке.
export default function CreatorMapSubmittedPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 pb-28 pt-24 text-center">
      <CheckCircle
        size={56}
        weight="fill"
        className="mx-auto text-orange-500 dark:text-orange-400"
      />
      <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        Submitted for review
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        Your map is in the queue. It reaches the marketplace once it&apos;s
        approved, and you&apos;ll get a notification either way.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="/resources">Your resources</Button>
        <Button href="/marketplace" variant="secondary">
          Marketplace
        </Button>
      </div>
    </main>
  );
}
