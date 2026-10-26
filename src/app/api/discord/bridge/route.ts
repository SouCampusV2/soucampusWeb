import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { getAdminIds, notifyMany } from "@/lib/notifications";
import {
  checkBridgeBody,
  fetchDiscordImage,
  verifyBridgeSignature,
  type BridgeKind,
  type PortfolioDraft,
} from "@/lib/discord-bridge";

// Вход для Discord-бота BoCampus (фаза 4 бота, 2026-10-27).
//
// Бот с согласия клиента присылает черновик работы или отзыв. Здесь —
// только приём: проверить подпись, проверить тело, скопировать фото к себе
// и положить строку в discord_inbox со статусом pending. Публикует
// владелец в /admin/discord. Ничего из присланного не появляется на сайте
// само — это решение, а не недоделка: секрет может утечь, а клиент мог
// передумать.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Сырое тело: подпись считается от байтов, а не от пересобранного JSON.
  const raw = await request.text();
  const problem = verifyBridgeSignature(
    process.env.DISCORD_BRIDGE_SECRET ?? "",
    request.headers.get("x-bocampus-timestamp"),
    request.headers.get("x-bocampus-signature"),
    raw
  );
  if (problem) {
    // Наружу — 404, как у админки: существование входа не подтверждаем.
    // Внутрь — причина, иначе сломанную настройку не найти.
    console.warn(`[discord-bridge] отказ: ${problem}`);
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  // Лимит — после подписи (правило 23.08): посторонний не тратит счёт.
  const limited = await enforceRateLimit("discord-bridge", "bocampus-bot");
  if (limited) return limited;

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }
  const bad = checkBridgeBody(body);
  if (bad) return NextResponse.json({ error: bad }, { status: 400 });
  const { key, kind, payload } = body as { key: string; kind: BridgeKind; payload: Record<string, unknown> };

  const db = getSupabaseAdmin();

  // Повтор (бот ретраит после таймаута) — не ошибка: отвечаем ok, второй
  // раз ничего не делаем. Проверка до копирования фото — чтобы не качать
  // их дважды.
  const { data: existing } = await db.from("discord_inbox").select("key").eq("key", key).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, duplicate: true });

  // Фото — сразу к себе: ссылки Discord протухают примерно через сутки.
  // Битое фото не валит черновик: владелец добавит своё в админке.
  const imageUrls: string[] = [];
  if (kind === "portfolio_draft") {
    const draft = payload as unknown as PortfolioDraft;
    for (const [i, url] of draft.images.entries()) {
      const image = await fetchDiscordImage(url);
      if ("error" in image) {
        console.warn(`[discord-bridge] фото ${i} пропущено: ${image.error}`);
        continue;
      }
      const path = `discord/${draft.ticketId}/${i}.${image.ext}`;
      const { error } = await db.storage
        .from("portfolio-images")
        .upload(path, image.bytes, { contentType: image.contentType, upsert: true });
      if (error) {
        console.warn(`[discord-bridge] фото ${i} не загрузилось: ${error.message}`);
        continue;
      }
      imageUrls.push(db.storage.from("portfolio-images").getPublicUrl(path).data.publicUrl);
    }
  }

  const { error } = await db
    .from("discord_inbox")
    .insert({ key, kind, payload, image_urls: imageUrls })
    .select("key")
    .single();
  // 23505 — гонка двух одинаковых запросов: второй проиграл, это тот же ok.
  if (error && error.code !== "23505") {
    console.error("[discord-bridge] не записалось:", error.message);
    return NextResponse.json({ error: "store failed" }, { status: 500 });
  }

  await notifyMany(await getAdminIds(), {
    kind: "discord_inbox",
    title: kind === "review" ? "New review from Discord" : "New portfolio draft from Discord",
    body: kind === "review" ? "A client agreed to show their review." : "A client agreed to show their build.",
    href: "/admin/discord",
  });

  return NextResponse.json({ ok: true });
}
