import { SHARE_KINDS, oembedBody, type ShareKind } from "@/lib/share";

// oEmbed — маленький JSON, из которого Discord берёт строку автора над
// карточкой («SouCampus · Portfolio»), как у постов X. Ссылку на него
// ставит shareMetadata() в <head> каждой страницы-«поста».
//
// Этот файл — общий на ВИД карточки: у работ строка автора одна на всех.
// У постов строка своя (с датой) — /oembed/updates/<slug>, соседний
// обработчик. Всё собирается на сборке — функция на каждый заход
// Discord'а не нужна.
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
  return Response.json(oembedBody(kind as ShareKind));
}
