import type { Metadata } from "next";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/Button";
import { VirusCheckedNote } from "@/components/VirusCheckedNote";

export const metadata: Metadata = {
  title: "Submitted for review",
  robots: { index: false },
};

// Экран после отправки карты автором. Близнец
// admin/products/new/submitted, но «дальше» у автора другое: очереди
// разбора он не видит, его карта — в собственном списке.
// ?checked=1 ставит форма, когда КАЖДЫЙ файл прошёл антивирус на VPS
// (UploadMapForm, 24.11). Параметр в адресе подделать может только сам
// человек для себя — пометка ничего не открывает, только сообщает.
export default async function CreatorMapSubmittedPage({
  searchParams,
}: {
  searchParams: Promise<{ checked?: string }>;
}) {
  const { checked } = await searchParams;
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
      {checked === "1" && (
        <div className="mt-3">
          <VirusCheckedNote>Every file was checked for viruses</VirusCheckedNote>
        </div>
      )}
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
