// ============================================================
// ПРОВЕРКА ЛИМИТОВ ЧАСТОТЫ (миграция 20260823120000_api_rate_limits).
//
// Запуск:  npm run check:limits            — preview-база (по умолчанию)
//          npm run check:limits -- --prod  — прод
//
// Это НЕ часть npm test и не гоняется в CI — намеренно, как и
// check-views.mjs. Всё проверяемое здесь — поведение ЖИВОЙ базы: права на
// функцию, скользящее окно, разделение счетов. Чистой функции тут нет
// вовсе, а мок ответил бы то, что мы в него сами и заложили.
//
// ЗАЧЕМ ОТДЕЛЬНЫЙ СКРИПТ. Пункты из TEMP.md, раздел 0, ждали ручной
// проверки пять сессий подряд, потому что каждый требовал залезть в
// консоль браузера и вспомнить, что именно набирать. Проверка, которую не
// делают, ничего не проверяет.
//
// ГЛАВНОЕ ЗДЕСЬ — ПЕРВЫЙ ТЕСТ. Postgres выдаёт execute на новую функцию
// роли PUBLIC ПО УМОЛЧАНИЮ, и `revoke` в миграции — единственное, что это
// снимает. Не сработал revoke — функция открыта любому посетителю сайта,
// а выглядит всё абсолютно исправным.
//
// ⚠️ ЧТО СКРИПТ ПИШЕТ В БАЗУ. Только строки в ops.rate_events, и только со
// своими bucket'ами вида `check:<случайное>` — с настоящими счетами
// ('checkout', 'admin-announce') они не пересекаются никак. Окна берутся
// короткие (секунды), поэтому строки протухают сразу; в конце скрипт
// добивает их вызовом с истёкшим окном — функция сама удаляет свои
// протухшие строки той же пары (bucket, actor).
// ============================================================
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

// Корень проекта — от расположения скрипта, а не жёстким путём: иначе он
// работал бы только на одной машине.
import { loadEnv, pickTarget, projectRef } from "./db-target.mjs";

// По умолчанию preview: на проде эти же вызовы оставят строки в живой
// таблице. Сторож выбора базы — в db-target.mjs.
loadEnv();
const PROD = process.argv.includes("--prod");
const { url, anonKey, serviceKey, label } = pickTarget(PROD);

// anon — ключ, который лежит в браузере у КАЖДОГО посетителя. Именно он
// должен получать отказ.
const asVisitor = createClient(url, anonKey);
// service_role — наш сервер. Ему функция разрешена явным grant'ом.
const asServer = createClient(url, serviceKey);

const call = (client, bucket, actor, limit, windowSeconds) =>
  client.rpc("consume_rate_limit", {
    p_bucket: bucket,
    p_actor: actor,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let passed = 0;
let failed = 0;
const usedBuckets = new Set();
const bucket = (name) => {
  const b = `check:${name}:${randomUUID().slice(0, 8)}`;
  usedBuckets.add(b);
  return b;
};

function check(name, ok, detail = "") {
  if (ok) {
    passed++;
    console.log(`  ok    ${name}`);
  } else {
    failed++;
    console.log(`  FAIL  ${name}${detail ? `\n        ${detail}` : ""}`);
  }
}

async function main() {
  console.log(`\nПроверяю ${label}: ${projectRef(url)}\n`);

  // ---------------------------------------------------------
  // 1. Права. Самое важное в файле.
  // ---------------------------------------------------------
  console.log("Права на функцию и таблицу");

  const visitorCall = await call(asVisitor, "check:forbidden", "nobody", 1, 60);
  check(
    "посторонний НЕ может вызвать consume_rate_limit",
    visitorCall.error !== null,
    visitorCall.error === null
      ? `функция вернула ${JSON.stringify(visitorCall.data)} вместо ошибки прав — ` +
        "revoke из миграции не сработал, функция открыта всему интернету"
      : ""
  );

  // Косвенная, но полезная проверка: таблица счёта живёт в схеме ops, а
  // она не выставлена наружу. Если однажды кто-то добавит ops в Exposed
  // schemas, RLS останется единственной защитой — и этот тест скажет,
  // что положение изменилось.
  const visitorRead = await asVisitor.from("rate_events").select("id").limit(1);
  check(
    "посторонний НЕ читает журнал событий",
    visitorRead.error !== null,
    visitorRead.error === null ? "таблица ops.rate_events доступна анонимному ключу" : ""
  );

  const serverCall = await call(asServer, bucket("smoke"), "actor", 5, 60);
  check(
    "наш сервер функцию вызвать МОЖЕТ",
    serverCall.error === null && serverCall.data === 0,
    serverCall.error ? serverCall.error.message : `вернулось ${JSON.stringify(serverCall.data)}`
  );

  // ---------------------------------------------------------
  // 2. Собственно лимит.
  // ---------------------------------------------------------
  console.log("\nСчёт и отказ");

  const b1 = bucket("limit");
  const actor = `actor:${randomUUID()}`;
  const first = await call(asServer, b1, actor, 3, 60);
  const second = await call(asServer, b1, actor, 3, 60);
  const third = await call(asServer, b1, actor, 3, 60);
  const fourth = await call(asServer, b1, actor, 3, 60);

  check(
    "первые три вызова проходят (0 = можно)",
    [first, second, third].every((r) => r.error === null && r.data === 0),
    [first, second, third].map((r) => r.error?.message ?? r.data).join(", ")
  );
  check(
    "четвёртый отказывает",
    fourth.error === null && fourth.data > 0,
    `вернулось ${JSON.stringify(fourth.data)}`
  );
  check(
    "отказ называет, сколько ждать, и не больше окна",
    fourth.data > 0 && fourth.data <= 60,
    `retryAfter = ${fourth.data}`
  );

  // ---------------------------------------------------------
  // 3. Счета раздельные. Ровно этот пункт стоит в TEMP.md: рассылка не
  //    должна съедать лимит модерации.
  // ---------------------------------------------------------
  console.log("\nЧужие счета не смешиваются");

  const otherBucket = await call(asServer, bucket("other"), actor, 3, 60);
  check(
    "другое действие того же человека не задето",
    otherBucket.error === null && otherBucket.data === 0,
    `вернулось ${JSON.stringify(otherBucket.data)}`
  );

  const otherActor = await call(asServer, b1, `actor:${randomUUID()}`, 3, 60);
  check(
    "тот же счёт у другого человека свободен",
    otherActor.error === null && otherActor.data === 0,
    `вернулось ${JSON.stringify(otherActor.data)}`
  );

  // ---------------------------------------------------------
  // 4. Окно СКОЛЬЗЯЩЕЕ, а не «счётчик, обнуляемый по часам».
  //
  // Это то, ради чего в базе лежит журнал событий, а не одно число:
  // счётчик с обнулением даёт двойной лимит на стыке периодов.
  // ---------------------------------------------------------
  console.log("\nОкно скользящее (ждём 3 секунды)");

  const b2 = bucket("window");
  const w1 = await call(asServer, b2, actor, 1, 2);
  const w2 = await call(asServer, b2, actor, 1, 2);
  await sleep(2600);
  const w3 = await call(asServer, b2, actor, 1, 2);

  check("в окне — отказ", w1.data === 0 && w2.data > 0, `${w1.data}, ${w2.data}`);
  check(
    "после окна снова можно, само, без вмешательства",
    w3.error === null && w3.data === 0,
    `вернулось ${JSON.stringify(w3.data)}`
  );

  // ---------------------------------------------------------
  // 5. Бессмысленные аргументы функция отвергает, а не считает.
  // ---------------------------------------------------------
  console.log("\nЗащита от бессмыслицы");

  const zero = await call(asServer, bucket("bad"), actor, 0, 60);
  check("лимит 0 — ошибка, а не тихое «можно»", zero.error !== null, JSON.stringify(zero.data));

  const noActor = await call(asServer, bucket("bad"), null, 5, 60);
  check("actor = null — ошибка", noActor.error !== null, JSON.stringify(noActor.data));

  // ---------------------------------------------------------
  // Уборка. Функция сама удаляет протухшие строки той пары
  // (bucket, actor), с которой её позвали, — поэтому достаточно позвать
  // её ещё раз с окном в одну секунду по каждому bucket'у, что скрипт
  // занимал. Строки, оставшиеся от отказов, к этому моменту уже старше
  // секунды.
  // ---------------------------------------------------------
  await sleep(1100);
  for (const b of usedBuckets) {
    await call(asServer, b, actor, 1000, 1);
  }

  console.log(`\nИтог: ${passed} ok, ${failed} fail\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
