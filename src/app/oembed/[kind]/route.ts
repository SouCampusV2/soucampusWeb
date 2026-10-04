import { SITE_NAME, SITE_URL } from "@/lib/site";
import { SHARE_KINDS, type ShareKind } from "@/lib/share";

// oEmbed — маленький JSON, из которого Discord берёт строку автора над
// карточкой («SouCampus · Portfolio»), как у постов X. Ссылку на него
// ставит shareMetadata() в <head> каждой страницы-«поста».
//
// Файл один на ВИД карточки, а не на страницу: автор у всех работ один и
// тот же. Поэтому адрес без параметров, и всё собирается на сборке —
// функция на каждый заход Discord'а не нужна.
//
// Вне /api намеренно: там живут обработчики с лимитами и правами, а это
// статический файл.

export const dynamic = "force-static";

export function generateStaticParams() {
  return Object.keys(SHARE_KINDS).map((kind) => ({ kind }));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ kind: string }> },
) {
  const { kind } = await params;
  if (!(kind in SHARE_KINDS)) {
    return new Response("Not found", { status: 404 });
  }

  return Response.json({
    version: "1.0",
    type: "link",
    author_name: `SouCampus · ${SHARE_KINDS[kind as ShareKind]}`,
    author_url: SITE_URL,
    provider_name: SITE_NAME,
    provider_url: SITE_URL,
  });
}
