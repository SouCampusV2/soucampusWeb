import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { notify, notifyEveryone } from "@/lib/notifications";
import { SITE_URL } from "@/lib/site";
import { getDiscordBotIdentity } from "@/lib/discord-identity";
import {
  announcementPayload,
  sendDiscordAnnouncement,
  type AnnouncePing,
} from "@/lib/discord-announce";

// Уведомление, написанное руками: всем аккаунтам (распродажа, смена
// правил) или одному человеку (ответ на заявку, предупреждение).
//
// Единственное уведомление, которое пишет ЧЕЛОВЕК, а не событие. Поэтому
// оно и единственное, у которого нет автоматики: рассылка «всем» — вещь
// необратимая (отозвать прочитанное нельзя), и запускать её должен
// осознанный клик владельца, а не срабатывание какого-нибудь триггера.
//
// С 26.10 объявление «всем» может уйти и в канал объявлений Discord
// (DISCORD_ANNOUNCE_WEBHOOK_URL) — или только туда. Личное сообщение
// одному человеку в Discord не уходит никогда: канал видят все.
export const dynamic = "force-dynamic";

const MAX_TITLE = 160;
const MAX_BODY = 1000;

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Лимит — ПОСЛЕ проверки прав: посторонний не должен расходовать
  // чужой счёт, и разница ответов (404 против 429) не должна
  // подсказывать ему, что обработчик существует.
  const limited = await enforceRateLimit("admin-announce", admin.id);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "bad body" }, { status: 400 });
  }

  const { title, text, href, userId, target, ping } = body as {
    title?: unknown;
    text?: unknown;
    href?: unknown;
    userId?: unknown;
    /** "both" | "site" | "discord"; без поля — только сайт, как раньше. */
    target?: unknown;
    ping?: unknown;
  };

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "title required" }, { status: 400 });
  }

  const notification = {
    kind: "announcement" as const,
    title: title.trim().slice(0, MAX_TITLE),
    body: typeof text === "string" && text.trim() ? text.trim().slice(0, MAX_BODY) : null,
    // Ссылка необязательна: «магазин закрыт на выходные» вести никуда не
    // обязано. Внешние адреса отсекает сам слой уведомлений.
    href: typeof href === "string" && href.trim() ? href.trim() : null,
  };

  // Одному человеку — когда выбран адресат; иначе веером всем. Личное
  // сообщение приходит тем же видом 'announcement': для получателя это
  // одно и то же — сайт что-то сказал, — а разбирать «личное или общее»
  // ему незачем.
  if (typeof userId === "string" && userId.length > 0) {
    await notify(userId, notification);
    return NextResponse.json({ ok: true, sent: 1 });
  }

  const toSite = target !== "discord";
  const toDiscord = target === "discord" || target === "both";
  const webhook = process.env.DISCORD_ANNOUNCE_WEBHOOK_URL;
  if (toDiscord && !webhook) {
    return NextResponse.json(
      { error: "DISCORD_ANNOUNCE_WEBHOOK_URL is not set — nothing was sent." },
      { status: 500 }
    );
  }

  // Сначала Discord: если канал откажет, сайт ещё ничего не разослал, и
  // человек получит честное «не ушло никуда», а не «ушло наполовину».
  if (toDiscord && webhook) {
    const pingValue: AnnouncePing = ping === "everyone" || ping === "here" ? ping : "none";
    // Подпись — имя и иконка бота (у вебхука витрины есть приложение; у
    // вебхука объявлений, созданного руками, его может не быть).
    const identity = await getDiscordBotIdentity(
      process.env.DISCORD_SHOWCASE_WEBHOOK_URL ?? webhook
    );
    const problem = await sendDiscordAnnouncement(
      webhook,
      announcementPayload(
        { title: notification.title, text: notification.body, href: notification.href, ping: pingValue },
        SITE_URL,
        identity
      )
    );
    if (problem) {
      console.error("Объявление в Discord не ушло:", problem);
      return NextResponse.json({ error: `Discord refused it: ${problem}` }, { status: 502 });
    }
  }

  const sent = toSite ? await notifyEveryone(notification) : 0;
  return NextResponse.json({ ok: true, sent, discord: toDiscord });
}
