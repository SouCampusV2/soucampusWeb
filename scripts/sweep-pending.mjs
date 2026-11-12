// ============================================================
// node scripts/sweep-pending.mjs — убрать брошенные pending-файлы из
// ПУБЛИЧНЫХ бакетов (аудит 2026-11, S-19).
//
// До 12.11 непроверенная картинка ложилась в публичный бакет под именем
// pending-… и оставалась там, если человек не вызвал confirm. Новые
// загрузки идут в закрытый бакет image-pending, но старые хвосты лежат
// где лежали и открываются по прямой ссылке. Этот скрипт их находит и,
// если попросить, удаляет.
//
//   node scripts/sweep-pending.mjs                  preview, только показать
//   node scripts/sweep-pending.mjs --delete         preview, удалить
//   node scripts/sweep-pending.mjs --prod           прод, только показать
//   node scripts/sweep-pending.mjs --prod --delete  прод, удалить
//
// Без --delete не меняет ничего. Трогает только объекты, чьё имя
// начинается с pending- и которым больше часа: свежий pending может быть
// чьей-то загрузкой, идущей прямо сейчас.
// ============================================================
import { createClient } from "@supabase/supabase-js";
import { loadEnv, pickTarget, projectRef } from "./db-target.mjs";

loadEnv();
const wantProd = process.argv.includes("--prod");
const doDelete = process.argv.includes("--delete");
const { url, serviceKey, label } = pickTarget(wantProd);

const db = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BUCKETS = ["avatars", "product-images", "portfolio-images"];
const HOUR_MS = 60 * 60 * 1000;
const PAGE = 1000;

/** Все записи одной папки, страницами: list отдаёт не больше PAGE за раз. */
async function listAll(bucket, folder) {
  const found = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await db.storage.from(bucket).list(folder, { limit: PAGE, offset });
    if (error) throw new Error(`${bucket}/${folder}: ${error.message}`);
    found.push(...(data ?? []));
    if (!data || data.length < PAGE) return found;
  }
}

console.log(
  `${doDelete ? "УДАЛЯЮ" : "Показываю (без --delete ничего не меняется)"}: ${label} (${projectRef(url)})\n`
);

const now = Date.now();
let total = 0;
let bytes = 0;

for (const bucket of BUCKETS) {
  // Верхний уровень бакета — папки, по одной на человека (и discord/ у
  // портфолио). У папки нет id, у файла он есть.
  const top = await listAll(bucket, "");
  const folders = top.filter((entry) => entry.id === null).map((entry) => entry.name);

  const stale = [];
  for (const folder of folders) {
    for (const file of await listAll(bucket, folder)) {
      if (!file.name.startsWith("pending-")) continue;
      if (now - new Date(file.created_at ?? 0).getTime() <= HOUR_MS) continue;
      stale.push({ path: `${folder}/${file.name}`, size: file.metadata?.size ?? 0 });
    }
  }

  const size = stale.reduce((sum, file) => sum + file.size, 0);
  console.log(`${bucket}: ${stale.length} файлов, ${(size / 1024 / 1024).toFixed(1)} МБ`);
  for (const file of stale.slice(0, 10)) console.log(`    ${file.path}`);
  if (stale.length > 10) console.log(`    … и ещё ${stale.length - 10}`);

  total += stale.length;
  bytes += size;

  if (doDelete && stale.length) {
    // Пачками: remove принимает список, но не бесконечный.
    for (let i = 0; i < stale.length; i += 100) {
      const batch = stale.slice(i, i + 100).map((file) => file.path);
      const { error } = await db.storage.from(bucket).remove(batch);
      if (error) throw new Error(`${bucket}: удаление не удалось: ${error.message}`);
    }
    console.log("    удалено");
  }
}

console.log(`\nИтог: ${total} файлов, ${(bytes / 1024 / 1024).toFixed(1)} МБ${doDelete ? " — удалено" : ""}`);
