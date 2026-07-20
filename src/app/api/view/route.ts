import { createHash, randomUUID } from "crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isTrackablePath } from "@/lib/views";

// Считать просмотры при рендере страницы нельзя: страницы статические
// (revalidate = 60), HTML собирается раз в минуту, а не на каждого
// посетителя — счётчик считал бы пересборки, а не людей. Поэтому сигнал
// шлёт браузер сюда, а этот обработчик выполняется на каждый запрос.
export const dynamic = "force-dynamic";

const COOKIE_NAME = "scv_visitor";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 года

// Антинакрутка: cookie чистится в два клика, инкогнито обходит её вовсе.
// Поэтому вторым слоем ограничиваем, сколько НОВЫХ уникальных может
// прийти с одного адреса за час. Не абсолютная защита, но превращает
// накрутку из "нажать F5 двадцать раз" в осмысленную работу.
const MAX_NEW_VIEWS_PER_IP_PER_HOUR = 20;

function hashIp(ip: string, userAgent: string) {
  const salt = process.env.VIEW_HASH_SALT;
  if (!salt) throw new Error("Не задан VIEW_HASH_SALT (см. .env.example)");
  // Сам IP не сохраняем никуда: он считается персональными данными, а
  // для нашей задачи достаточно необратимого отпечатка. Соль нужна,
  // чтобы хэш нельзя было подобрать перебором — адресов всего ~4 млрд.
  return createHash("sha256").update(`${salt}:${ip}:${userAgent}`).digest("hex");
}

export async function POST(request: Request) {
  let path: unknown;
  try {
    ({ path } = await request.json());
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 });
  }

  // Принимаем только известные адреса. Иначе кто угодно засорил бы
  // таблицу произвольными строками, и она росла бы бесконтрольно.
  if (typeof path !== "string" || !isTrackablePath(path)) {
    return NextResponse.json({ error: "path not trackable" }, { status: 400 });
  }

  const cookieStore = await cookies();
  const headerList = await headers();

  // Первый визит — выдаём новый id. Cookie ставится httpOnly: браузерный
  // JS его не прочитает и не подменит, работать с ним может только сервер.
  let visitorId = cookieStore.get(COOKIE_NAME)?.value;
  let isNewVisitor = false;
  if (!visitorId || !/^[0-9a-f-]{36}$/i.test(visitorId)) {
    visitorId = randomUUID();
    isNewVisitor = true;
  }

  // За прокси (Vercel) настоящий адрес приходит заголовком.
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0].trim() ||
    headerList.get("x-real-ip") ||
    "unknown";
  const ipHash = hashIp(ip, headerList.get("user-agent") ?? "");

  const db = getSupabaseAdmin();

  // Лимит проверяем только для новых посетителей: у того, кто уже имеет
  // cookie, повторная вставка всё равно ничего не добавит (см. ниже),
  // а вот шквал новых id с одного адреса — как раз признак накрутки.
  if (isNewVisitor) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await db
      .from("page_views")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", hourAgo);

    if ((count ?? 0) >= MAX_NEW_VIEWS_PER_IP_PER_HOUR) {
      // Отвечаем как при успехе: посетителю знать о лимите незачем, а
      // ошибка в консоли только подсказала бы, что защита существует.
      return NextResponse.json({ ok: true });
    }
  }

  // Уникальность обеспечивает индекс page_views_unique_visitor, а не
  // проверка "а есть ли уже такая строка" перед вставкой: две вкладки,
  // открытые разом, обошли бы такую проверку. Здесь повторная вставка
  // просто ничего не делает.
  const { error } = await db
    .from("page_views")
    .upsert({ path, visitor_id: visitorId, ip_hash: ipHash }, {
      onConflict: "path,visitor_id",
      ignoreDuplicates: true,
    });

  if (error) {
    console.error("Не удалось записать просмотр:", error.message);
    // Счётчик — не то, ради чего человек пришёл на страницу. Молча
    // отвечаем успехом: показывать посетителю ошибку статистики незачем.
  }

  const response = NextResponse.json({ ok: true });
  if (isNewVisitor) {
    response.cookies.set(COOKIE_NAME, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }
  return response;
}
