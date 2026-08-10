import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { notifyEveryone } from "@/lib/notifications";

// Объявление всем аккаунтам: распродажа, смена правил, крупная новость.
//
// Единственное уведомление, которое пишет ЧЕЛОВЕК, а не событие. Поэтому
// оно и единственное, у которого нет автоматики: рассылка «всем» — вещь
// необратимая (отозвать прочитанное нельзя), и запускать её должен
// осознанный клик владельца, а не срабатывание какого-нибудь триггера.
export const dynamic = "force-dynamic";

const MAX_TITLE = 160;
const MAX_BODY = 1000;

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  const { title, text, href } = body as {
    title?: unknown;
    text?: unknown;
    href?: unknown;
  };

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const sent = await notifyEveryone({
    kind: "announcement",
    title: title.trim().slice(0, MAX_TITLE),
    body: typeof text === "string" && text.trim() ? text.trim().slice(0, MAX_BODY) : null,
    // Ссылка необязательна: «магазин закрыт на выходные» вести никуда не
    // обязано. Внешние адреса отсекает сам слой уведомлений.
    href: typeof href === "string" && href.trim() ? href.trim() : null,
  });

  return NextResponse.json({ ok: true, sent });
}
