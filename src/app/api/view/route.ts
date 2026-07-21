import { createHash } from "crypto";
import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { isTrackablePath } from "@/lib/views";
import { issueVisitorId, readVisitorId } from "@/lib/visitor-cookie";

// Считать просмотры при рендере страницы нельзя: страницы статические
// (revalidate = 60), HTML собирается раз в минуту, а не на каждого
// посетителя — счётчик считал бы пересборки, а не людей. Поэтому сигнал
// шлёт браузер сюда, а этот обработчик выполняется на каждый запрос.
export const dynamic = "force-dynamic";

const COOKIE_NAME = "scv_visitor";

// 13 месяцев. Было два года, сокращено осознанно (2026-07-20): это тот
// срок, который европейские регуляторы называют предельным для cookie
// измерения посещаемости — при нём такая cookie обычно подпадает под
// исключение "своя статистика посещаемости" и не требует баннера
// согласия. Остальные условия исключения мы и так выполняем: cookie
// только своя, никакой слежки между сайтами, никакой передачи данных,
// наружу отдаётся только агрегат, IP не хранится (см. hashIp ниже).
// Полноценная политика конфиденциальности — вместе с Terms of Service,
// Этап 4. Юридической консультацией это не является.
const COOKIE_MAX_AGE = 60 * 60 * 24 * 395;

// Сколько РАЗНЫХ посетителей может появиться с одного адреса за час.
// Считаем именно посетителей, а не строки: один увлечённый человек
// обходит все 16 работ и создаёт 16 записей — при подсчёте строк он
// съедал бы почти весь лимит и блокировал следующего гостя с того же
// адреса (офис, общий wi-fi, мобильный оператор с общим NAT).
const MAX_NEW_VISITORS_PER_IP_PER_HOUR = 60;

// Сколько строк максимум смотрим при подсчёте лимита. Ограничение есть
// всегда — иначе однажды запрос вытянет всю таблицу за час.
const RATE_LIMIT_SCAN = 500;

function requireSecret() {
  const salt = process.env.VIEW_HASH_SALT;
  if (!salt) throw new Error("Не задан VIEW_HASH_SALT (см. .env.example)");
  return salt;
}

// Сам IP не сохраняем: он считается персональными данными, а для нашей
// задачи достаточно необратимого отпечатка. Соль нужна, чтобы хэш нельзя
// было подобрать перебором — адресов всего около четырёх миллиардов.
//
// Только адрес, без User-Agent: раньше он входил в хэш, и достаточно
// было менять строку браузера, чтобы каждый раз получать чистый лимит.
function hashIp(ip: string, secret: string) {
  return createHash("sha256").update(`${secret}:${ip}`).digest("hex");
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

  const secret = requireSecret();
  const cookieStore = await cookies();
  const headerList = await headers();

  // Пустая, испорченная или поддельная cookie — всё это "новый
  // посетитель". Подпись проверяется внутри readVisitorId, поэтому
  // "я уже был тут" больше нельзя просто заявить (см. visitor-cookie.ts).
  const known = readVisitorId(cookieStore.get(COOKIE_NAME)?.value, secret);
  const issued = known ? null : issueVisitorId(secret);
  const visitorId = known ?? issued!.id;

  // За прокси (Vercel) настоящий адрес приходит заголовком.
  const ip =
    headerList.get("x-forwarded-for")?.split(",")[0].trim() ||
    headerList.get("x-real-ip") ||
    "unknown";
  const ipHash = hashIp(ip, secret);

  const db = getSupabaseAdmin();

  // Лимит проверяем только для новых посетителей: у того, кто уже имеет
  // подписанную cookie, повторная вставка на ту же страницу всё равно
  // ничего не добавит, а шквал НОВЫХ id с одного адреса — как раз
  // признак накрутки.
  if (issued) {
    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recent } = await db
      .from("page_views")
      .select("visitor_id")
      .eq("ip_hash", ipHash)
      .gte("created_at", hourAgo)
      .limit(RATE_LIMIT_SCAN);

    const distinctVisitors = new Set(
      (recent ?? []).map((r) => r.visitor_id as string)
    ).size;

    if (distinctVisitors >= MAX_NEW_VISITORS_PER_IP_PER_HOUR) {
      // Отвечаем как при успехе: посетителю знать о лимите незачем, а
      // ошибка в консоли только подсказала бы, что защита существует.
      return NextResponse.json({ ok: true });
    }
  }

  // Уникальность обеспечивает индекс page_views_unique_visitor_day, а не
  // проверка "а есть ли уже такая строка" перед вставкой: две вкладки,
  // открытые разом, обошли бы такую проверку. Здесь повторная вставка
  // просто ничего не делает.
  //
  // onConflict обязан в точности совпадать с этим индексом, иначе
  // Postgres отвечает "нет подходящего ограничения" и не пишет ничего.
  // Колонку day не передаём: её ставит значение по умолчанию
  // (current_date), тем же временем сервера БД, что и границы периодов
  // в site_view_counts — если считать день на стороне Node, около
  // полуночи они разъедутся.
  const { error } = await db
    .from("page_views")
    .upsert({ path, visitor_id: visitorId, ip_hash: ipHash }, {
      onConflict: "path,visitor_id,day",
      ignoreDuplicates: true,
    });

  if (error) {
    // Посетителю отвечаем успехом — он пришёл не за статистикой, и
    // ронять ему страницу из-за счётчика незачем. Но в лог пишем как об
    // ошибке: ровно на этом месте уже один раз обожглись — обработчик
    // бодро отдавал 200, а в базу не попадало ни строки, потому что
    // onConflict разъехался с индексом после миграции. Наружу тихо,
    // внутрь громко.
    console.error("НЕ УДАЛОСЬ ЗАПИСАТЬ ПРОСМОТР:", error.message, { path });
  }

  const response = NextResponse.json({ ok: true });
  if (issued) {
    response.cookies.set(COOKIE_NAME, issued.cookieValue, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: COOKIE_MAX_AGE,
      path: "/",
    });
  }
  return response;
}
