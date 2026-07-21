import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllReviews, getReview } from "@/lib/reviews";
import { Skeleton } from "@/components/Skeleton";

export async function generateStaticParams() {
  const reviews = await getAllReviews();
  return reviews.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const review = await getReview(slug);
  if (!review) return { title: "Not found" };

  return {
    title: `${review.name} — client review`,
    description: review.text,
    alternates: { canonical: `/reviews/${review.slug}` },
    openGraph: {
      type: "article",
      title: `${review.name} — client review`,
      description: review.text,
      url: `/reviews/${review.slug}`,
    },
  };
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const review = await getReview(slug);
  if (!review) notFound();

  return (
    <main className="w-full mx-auto max-w-6xl flex-1 px-6 py-16 sm:py-28">
      <div className="mx-auto max-w-2xl text-center">
        <Link href="/#reviews" className="text-sm font-medium text-orange-600">
          ← Home
        </Link>

        {/* TODO: this is a stub — flesh out into a real case study (photos,
            the project this client ordered, more of their words) once
            there's time to write one per review. Placeholder image below
            mirrors the avatar placeholder already used on the reviews
            carousel (ClientReviews.tsx). */}
        <div className="relative mx-auto mt-6 h-20 w-20 overflow-hidden rounded-full">
          <Skeleton className="h-full w-full" />
          <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#fbfbff] bg-[#fbfbff] text-sm dark:border-zinc-950 dark:bg-zinc-950">
            {review.flag}
          </span>
        </div>

        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-zinc-950 dark:text-zinc-50 sm:text-5xl">
          {review.name}
        </h1>
        <p className="mt-2 text-sm font-medium uppercase tracking-wide text-orange-600">
          {review.role}
        </p>

        <p className="mt-8 text-lg leading-8 text-zinc-700 dark:text-zinc-300">
          &ldquo;{review.text}&rdquo;
        </p>
      </div>
    </main>
  );
}
