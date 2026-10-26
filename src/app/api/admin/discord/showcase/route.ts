import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/admin";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import {
  channelWebhook,
  checkPost,
  isShowcaseChannel,
  SHOWCASE_CHANNELS,
  deletePost,
  isShowcasePostShape,
  normalizeShowcasePost,
  publishPost,
  updatePost,
  type ShowcaseChannel,
  type ShowcasePost,
} from "@/lib/discord-showcase";

// Посты витрины в Discord из админки (2026-10-27): сохранить черновик,
// опубликовать, поправить опубликованный, убрать из Discord, удалить.
// Вебхук — свой у каждого канала (SHOWCASE_CHANNELS; выдаёт бот:
// /setup site_channel). Канал пост помнит в discord_posts.channel: Update и
// Remove идут туда, куда пост ушёл (27.10).
export const dynamic = "force-dynamic";

type Body =
  | {
      action: "save";
      id?: string;
      projectSlug: string | null;
      productSlug?: string | null;
      channel?: string;
      post: ShowcasePost;
    }
  | { action: "publish"; id: string }
  | { action: "update"; id: string }
  | { action: "unpublish"; id: string }
  | { action: "delete"; id: string };

export async function POST(request: Request) {
  const admin = await getAdminUser();
  if (!admin) return NextResponse.json({ error: "not found" }, { status: 404 });

  const limited = await enforceRateLimit("admin-action", admin.id);
  if (limited) return limited;

  const body = (await request.json().catch(() => null)) as Body | null;
  if (!body || typeof body !== "object") return NextResponse.json({ error: "bad request" }, { status: 400 });
  const db = getSupabaseAdmin();

  if (body.action === "save") {
    // Черновик сохраняется и с ошибками (недописанный пост — нормальный
    // черновик); проверка — при публикации. Форму строки проверяем всегда.
    const channel = body.channel ?? "portfolio";
    if (!isShowcasePostShape(body.post) || !isShowcaseChannel(channel)) {
      return NextResponse.json({ error: "bad request" }, { status: 400 });
    }
    // Опубликованный пост в другой канал не переезжает: его сообщение
    // знает только вебхук старого канала. Сначала Remove, потом Publish.
    if (body.id) {
      const { data: current } = await db.from("discord_posts").select("status, channel").eq("id", body.id).maybeSingle();
      if (current?.status === "published" && current.channel !== channel) {
        return NextResponse.json({ error: "Remove it from Discord before moving it to another channel." }, { status: 409 });
      }
    }
    const row = {
      project_slug: body.projectSlug,
      product_slug: body.productSlug ?? null,
      channel,
      post: body.post,
      updated_at: new Date().toISOString(),
    };
    const result = body.id
      ? await db.from("discord_posts").update(row).eq("id", body.id).select("id").single()
      : await db.from("discord_posts").insert({ ...row, created_by: admin.id }).select("id").single();
    if (result.error) {
      console.error("Discord-пост: не сохранился:", result.error.message);
      return NextResponse.json({ error: "Couldn't save the draft." }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: result.data.id });
  }

  const { data: row, error } = await db.from("discord_posts").select("*").eq("id", body.id).maybeSingle();
  if (error || !row) return NextResponse.json({ error: "Post not found." }, { status: 404 });

  if (body.action === "delete") {
    // Удалить можно только черновик: опубликованный сначала убрать из Discord,
    // иначе в канале останется сообщение, которым больше нечем управлять.
    if (row.status !== "draft") return NextResponse.json({ error: "Remove it from Discord first." }, { status: 409 });
    const { error: deleteError } = await db.from("discord_posts").delete().eq("id", row.id);
    if (deleteError) {
      console.error("Discord-пост: не удалился:", deleteError.message);
      return NextResponse.json({ error: "Couldn't delete the draft." }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  const channel: ShowcaseChannel = isShowcaseChannel(row.channel) ? row.channel : "portfolio";
  const { envVar, setupKind, color } = SHOWCASE_CHANNELS[channel];
  const webhook = channelWebhook(channel);
  if (!webhook) {
    return NextResponse.json(
      { error: `${envVar} is not set. Get it in Discord with /setup site_channel kind:${setupKind}.` },
      { status: 500 }
    );
  }
  // Через перевод: пост первого редактора (эмбед, до вечера 26.10) тоже
  // должен публиковаться, обновляться и убираться из канала.
  const post = normalizeShowcasePost(row.post);
  if (!post) return NextResponse.json({ error: "This post can't be read." }, { status: 400 });

  if (body.action === "publish" || body.action === "update") {
    const problem = checkPost(post);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  }

  if (body.action === "publish") {
    if (row.status === "published") return NextResponse.json({ error: "Already published — use Update." }, { status: 409 });
    const sent = await publishPost(webhook, post, fetch, color);
    if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 502 });
    await db
      .from("discord_posts")
      .update({ status: "published", message_id: sent.messageId, published_at: new Date().toISOString() })
      .eq("id", row.id);
    return NextResponse.json({ ok: true, messageId: sent.messageId });
  }

  if (body.action === "update") {
    if (row.status !== "published") return NextResponse.json({ error: "Not published yet." }, { status: 409 });
    const sent = await updatePost(webhook, row.message_id, post, fetch, color);
    if (!sent.ok) return NextResponse.json({ error: sent.error }, { status: 502 });
    await db.from("discord_posts").update({ updated_at: new Date().toISOString() }).eq("id", row.id);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "unpublish") {
    if (row.status !== "published") return NextResponse.json({ error: "Not published." }, { status: 409 });
    const removed = await deletePost(webhook, row.message_id);
    if (!removed.ok) return NextResponse.json({ error: removed.error }, { status: 502 });
    // Обратно в черновики: пост можно поправить и выложить снова.
    await db.from("discord_posts").update({ status: "draft", message_id: null, published_at: null }).eq("id", row.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "bad request" }, { status: 400 });
}
