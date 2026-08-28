import type { Metadata } from "next";
import { CheckCircle } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/Button";

export const metadata: Metadata = {
  title: "Submitted for review",
  robots: { index: false },
};

// Экран после отправки. Переехал сюда вместе с самой формой
// (2026-08-28) — почему, разобрано в ../page.tsx.
//
// Кнопки ведут в админку, а не на /resources и /marketplace, как
// раньше: человек, дошедший до этого экрана, пришёл из каталога
// админки, и естественное «дальше» для него — очередь разбора, где его
// карта только что оказалась.
export default function AddMapSubmittedPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 text-center">
      <CheckCircle
        size={56}
        weight="fill"
        className="mx-auto text-orange-500 dark:text-orange-400"
      />
      <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50">
        Submitted for review
      </h1>
      <p className="mx-auto mt-3 max-w-md text-sm text-zinc-500 dark:text-zinc-400">
        The map is in the queue. It reaches the marketplace once it&apos;s
        approved — your own maps go through the same review as anyone
        else&apos;s.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <Button href="/admin/moderation">Open the queue</Button>
        <Button href="/admin/products" variant="secondary">
          Back to the catalog
        </Button>
      </div>
    </div>
  );
}
