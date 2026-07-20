// ============================================================
// РУЧНАЯ интеграционная проверка счётчика просмотров.
//
// Запуск:  npm run check:views   (нужен поднятый npm run dev на :3000)
//
// Это НЕ часть npm test и не гоняется в CI — намеренно. Скрипт ходит по
// настоящему HTTP в запущенный сервер и пишет в НАСТОЯЩУЮ базу: проверить
// подпись cookie, лимит с одного адреса и гонку двух вкладок иначе нельзя,
// это поведение живого обработчика, а не чистой функции.
//
// Все запросы идут с адресов 203.0.113.x (TEST-NET-3, зарезервирован для
// документации — настоящих посетителей оттуда не бывает). В конце скрипт
// удаляет всё, что создал, по ip_hash этих адресов, в блоке finally —
// уборка происходит даже если проверка упала посередине.
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// Корень проекта — от расположения скрипта, а не жёстким путём:
// иначе он работал бы только на одной машине.
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const BASE = "http://localhost:3000";
const SALT = process.env.VIEW_HASH_SALT;
const hashIp = (ip) => createHash("sha256").update(`${SALT}:${ip}`).digest("hex");

const testIps = new Set();

async function post(pathname, { ip = "203.0.113.1", cookie } = {}) {
  testIps.add(ip);
  const headers = { "Content-Type": "application/json", "x-forwarded-for": ip };
  if (cookie) headers["Cookie"] = `scv_visitor=${cookie}`;
  const res = await fetch(`${BASE}/api/view`, {
    method: "POST",
    headers,
    body: JSON.stringify({ path: pathname }),
  });
  const setCookie = res.headers.get("set-cookie") || "";
  const issued = (setCookie.match(/scv_visitor=([^;]+)/) || [])[1];
  return { status: res.status, issued };
}

async function rowsFor(ip) {
  const { data } = await db.from("page_views").select("path, visitor_id").eq("ip_hash", hashIp(ip));
  return data ?? [];
}

let passed = 0, failed = 0;
function check(name, ok, extra = "") {
  if (ok) { passed++; console.log(`  ✅ ${name}`); }
  else { failed++; console.log(`  ❌ ${name} ${extra}`); }
}

async function main() {
  console.log("\n── 1. Базовая запись и дедупликация ──");
  const ip1 = "203.0.113.10";
  const a = await post("/about", { ip: ip1 });
  check("новый посетитель -> 200", a.status === 200, `(${a.status})`);
  check("сервер выдал подписанную cookie", !!a.issued && a.issued.includes("."));
  await new Promise((r) => setTimeout(r, 400));
  check("создалась 1 строка", (await rowsFor(ip1)).length === 1);

  await post("/about", { ip: ip1, cookie: a.issued });
  await new Promise((r) => setTimeout(r, 400));
  check("повтор той же страницы не создаёт строку", (await rowsFor(ip1)).length === 1);

  await post("/terms", { ip: ip1, cookie: a.issued });
  await new Promise((r) => setTimeout(r, 400));
  check("другая страница добавляет строку", (await rowsFor(ip1)).length === 2);

  console.log("\n── 2. Подделка cookie ──");
  const ip2 = "203.0.113.20";
  const forged = await post("/about", { ip: ip2, cookie: "11111111-2222-3333-4444-555555555555" });
  check("голый uuid не принимается — выдана новая cookie", !!forged.issued);
  await new Promise((r) => setTimeout(r, 400));
  const forgedRows = await rowsFor(ip2);
  check(
    "в базу попал id сервера, а не подсунутый",
    forgedRows.length === 1 && forgedRows[0].visitor_id !== "11111111-2222-3333-4444-555555555555",
    JSON.stringify(forgedRows)
  );

  const tampered = await post("/shop", { ip: ip2, cookie: `${forgedRows[0].visitor_id}.tamperedsignature` });
  check("испорченная подпись -> выдана новая cookie", !!tampered.issued);

  console.log("\n── 3. Проверка адреса страницы ──");
  check("выдуманный путь -> 400", (await post("/выдумка", { ip: ip1 })).status === 400);
  check("путь вне списка -> 400", (await post("/admin", { ip: ip1 })).status === 400);
  check("заглавные в slug -> 400", (await post("/portfolio/BlueSpawn", { ip: ip1 })).status === 400);
  const badJson = await fetch(`${BASE}/api/view`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: "не json",
  });
  check("битый JSON -> 400", badJson.status === 400, `(${badJson.status})`);

  console.log("\n── 4. Одновременные запросы (две вкладки) ──");
  const ip3 = "203.0.113.30";
  const first = await post("/contact", { ip: ip3 });
  await new Promise((r) => setTimeout(r, 400));
  await Promise.all(Array.from({ length: 6 }, () => post("/contact", { ip: ip3, cookie: first.issued })));
  await new Promise((r) => setTimeout(r, 600));
  check("6 параллельных запросов -> ровно 1 строка", (await rowsFor(ip3)).length === 1);

  console.log("\n── 5. Уникальность по сайту ──");
  const ip4 = "203.0.113.40";
  const walker = await post("/", { ip: ip4 });
  for (const p of ["/portfolio", "/about", "/contact", "/terms"]) {
    await post(p, { ip: ip4, cookie: walker.issued });
  }
  await new Promise((r) => setTimeout(r, 600));
  const walkerRows = await rowsFor(ip4);
  const distinct = new Set(walkerRows.map((r) => r.visitor_id)).size;
  check("один человек, 5 страниц -> 5 строк", walkerRows.length === 5, `(${walkerRows.length})`);
  check("но посетитель при этом один", distinct === 1, `(${distinct})`);

  console.log("\n── 6. Лимит с одного адреса ──");
  const ipFlood = "203.0.113.50";
  for (let i = 0; i < 62; i++) await post("/about", { ip: ipFlood });
  await new Promise((r) => setTimeout(r, 800));
  const flood = await rowsFor(ipFlood);
  check("62 новых посетителя с одного IP -> записано не больше 60", flood.length <= 60, `(${flood.length})`);
  check("но и не заблокировано слишком рано", flood.length >= 55, `(${flood.length})`);

  const ipClean = "203.0.113.60";
  await post("/about", { ip: ipClean });
  await new Promise((r) => setTimeout(r, 400));
  check("другой IP лимитом не задет", (await rowsFor(ipClean)).length === 1);

  console.log("\n── 7. Смена User-Agent не даёт новый лимит ──");
  const ipUa = "203.0.113.70";
  await post("/about", { ip: ipUa });
  await new Promise((r) => setTimeout(r, 300));
  const before = (await rowsFor(ipUa)).length;
  const res = await fetch(`${BASE}/api/view`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": ipUa, "User-Agent": "completely-different-browser" },
    body: JSON.stringify({ path: "/terms" }),
  });
  await new Promise((r) => setTimeout(r, 400));
  const after = await rowsFor(ipUa);
  check("строки с разным UA имеют один ip_hash", after.length === before + 1 && res.status === 200);
}

(async () => {
  try {
    await main();
  } catch (e) {
    failed++;
    console.log("\n💥 тест упал:", e.message);
  } finally {
    let removed = 0;
    for (const ip of testIps) {
      const { data } = await db.from("page_views").delete().eq("ip_hash", hashIp(ip)).select("id");
      removed += (data ?? []).length;
    }
    console.log(`\n── Уборка ── удалено тестовых строк: ${removed}`);
    const { count } = await db.from("page_views").select("*", { count: "exact", head: true });
    console.log(`осталось в таблице: ${count} (настоящие посетители)`);
    console.log(`\nИТОГО: ${passed} пройдено, ${failed} провалено`);
    process.exit(failed ? 1 : 0);
  }
})();
