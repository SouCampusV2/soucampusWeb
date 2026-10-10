import { formatDayMonthYear } from "@/lib/dates";
import { oembedBody } from "@/lib/share";
import { UPDATES, getUpdate } from "@/lib/updates";

// Строка автора с датой — «SouCampus · What's new · 25 Sep 2026». Своя у
// каждого поста, поэтому файл на пост, а не на вид. Собирается на сборке
// из того же UPDATES, что и сами страницы.
//
// Только посты: у работ портфолио настоящей даты нет (см. oembedBody).
// Чужой вид или чужой слаг — 404.
//
// Дата — та же formatDayMonthYear, что над заголовком поста: на странице
// и в карточке она обязана читаться одинаково.

export const dynamic = "force-static";

export function generateStaticParams() {
  return UPDATES.map((post) => ({ kind: "updates", slug: post.slug }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string; slug: string }> },
) {
  const { kind, slug } = await params;
  const post = kind === "updates" ? getUpdate(slug) : undefined;
  if (!post) {
    return new Response("Not found", { status: 404 });
  }
  return Response.json(oembedBody("updates", formatDayMonthYear(post.date)));
}
