import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createSupabaseServer } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { checkPortfolioUrl, checkDiscord } from "@/lib/contact-links";
import { CREATOR_SIGNUPS_OPEN } from "@/lib/flags";

// Заявка на статус креатора — через свой обработчик, а не из браузера.
//
// До заморозки 20.08 заявка вставлялась в creator_applications прямо из
// формы, и разрешала это политика "submit own application". Заморозка
// политику сняла, а миграция советовала вернуть её при разморозке. Не
// возвращаем: с 21.09 из браузера в базу не пишется ничего (шлюз записи,
// docs/ARCHITECTURE.md § 5.4), и вернуть политику значит открыть
// четырнадцатый путь мимо него. Доказательство закрытого пути — снятая
// политика, и она остаётся снятой.
//
// Что держит этот обработчик, и раньше не держал никто, кроме формы:
//  * галочку «мне есть 18» — дата пишется сервером, а не приходит от
//    клиента (docs/SCANNER.md § 1, решение владельца);
//  * уже креатор заявку не подаёт;
//  * лимит частоты.
// Проверка ссылок стоит и здесь, и в базе (20260811140000): база отсекает
// мусор, а здесь человеку объясняют, какое поле чинить.
export const dynamic = "force-dynamic";

const MAX_ABOUT = 2000;

export async function POST(request: Request) {
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "auth required" }, { status: 401 });
  }

  // Флаг здесь — настоящий запрет, а не кнопка: путь в базу у заявки
  // теперь один, и он проходит через эту строку. Пока приём закрыт,
  // заявку не подать ни формой, ни запросом мимо неё.
  if (!CREATOR_SIGNUPS_OPEN) {
    return NextResponse.json(
      { error: "Creator applications are closed right now." },
      { status: 403 }
    );
  }

  const limited = await enforceRateLimit("creator-application", user.id);
  if (limited) return limited;

  const body = (await request.json().catch(() => ({}))) as {
    about?: unknown;
    portfolio?: unknown;
    discord?: unknown;
    adult?: unknown;
  };

  const about = typeof body.about === "string" ? body.about.trim() : "";
  if (!about) {
    return NextResponse.json(
      { error: "Tell us a little about your building." },
      { status: 400 }
    );
  }

  // Строго true, а не «что-то правдивое»: подтверждение возраста — это
  // поставленная галочка, а не непустая строка в теле запроса.
  if (body.adult !== true) {
    return NextResponse.json(
      { error: "Creators on SouCampus must be 18 or older." },
      { status: 400 }
    );
  }

  const link = checkPortfolioUrl(typeof body.portfolio === "string" ? body.portfolio : "");
  const contact = checkDiscord(typeof body.discord === "string" ? body.discord : "");
  if (!link.ok || !contact.ok) {
    return NextResponse.json(
      {
        error: "Check the highlighted fields.",
        portfolioError: link.ok ? null : link.error,
        discordError: contact.ok ? null : contact.error,
      },
      { status: 400 }
    );
  }

  const db = getSupabaseAdmin();

  const { data: profile } = await db
    .from("profiles")
    .select("is_creator")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.is_creator) {
    return NextResponse.json(
      { error: "You're already a creator." },
      { status: 409 }
    );
  }

  const { error } = await db.from("creator_applications").insert({
    user_id: user.id,
    about: about.slice(0, MAX_ABOUT),
    // Нормализованные значения, а не то, что набрано: у ссылки дописана
    // схема, у ника срезана @ и приведён регистр.
    portfolio_url: link.value || null,
    discord: contact.value || null,
    adult_confirmed_at: new Date().toISOString(),
  });

  if (error) {
    // Частичный уникальный индекс не даёт завести вторую ОТКРЫТУЮ
    // заявку — это не поломка, а ровно нужное поведение.
    if (error.code === "23505") {
      return NextResponse.json(
        { error: "You already have an application waiting. We'll get back to you on it." },
        { status: 409 }
      );
    }
    // Наружу тихо, внутрь громко: на другом конце любой вошедший.
    console.error("Заявка в креаторы: вставка не удалась:", error.message);
    return NextResponse.json(
      { error: "Could not send the application. Try again in a moment." },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
