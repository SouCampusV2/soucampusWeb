// ============================================================
// Убрать файлы карт и скриншоты из Storage.
//
// Запуск:  npm run clear:storage
//
// Пара к supabase/cleanup_products_2026-08-16.sql. Тот сносит строки в
// базе, этот — файлы, и разделены они не по вкусу, а потому что иначе
// нельзя: Supabase запрещает `delete from storage.objects` триггером
// storage.protect_delete —
//
//   ERROR 42501: Direct deletion from storage tables is not allowed.
//
// Запрет правильный. Строка в storage.objects — это учётная запись о
// файле, а сам файл лежит в объектном хранилище. Удалив строку из SQL,
// получаешь файл, за который платишь, но которого больше нет ни в одном
// списке: удалить его потом уже нечем. Storage API убирает обе половины
// разом, поэтому единственный честный путь — через него.
//
// ⚠️ УДАЛЯЕТ БЕЗВОЗВРАТНО и только два бакета: product-files (файлы
// карт) и product-images (обложки, галереи, картинки из описаний).
// Бакет avatars НЕ трогает — аватары принадлежат аккаунтам, а не картам.
//
// ⚠️ Работает с той базой, что прописана в .env.local. Перед прогоном на
// проде убедись, что там прод-ключи, — скрипт про это не догадается.
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

// Корень проекта — от расположения скрипта, а не жёстким путём: иначе он
// работал бы только на одной машине (тот же приём, что в check-views.mjs).
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Нет NEXT_PUBLIC_SUPABASE_URL или SUPABASE_SERVICE_ROLE_KEY в .env.local");
  process.exit(1);
}

// Служебный ключ, а не анонимный: DELETE-политик у этих бакетов нет и не
// должно быть — иначе креатор удалял бы чужие файлы (docs/STRUCTURE.md).
const db = createClient(url, key);

const BUCKETS = ["product-files", "product-images"];

// Файлы лежат по папкам пользователей (`<user_id>/<файл>`), поэтому обход
// рекурсивный: list() отдаёт содержимое ОДНОЙ папки, а у папки нет своей
// строки — она существует ровно пока в ней что-то есть.
async function collect(bucket, prefix = "") {
  const { data, error } = await db.storage.from(bucket).list(prefix, { limit: 1000 });
  if (error) throw new Error(`${bucket}/${prefix}: ${error.message}`);

  const files = [];
  for (const entry of data ?? []) {
    const full = prefix ? `${prefix}/${entry.name}` : entry.name;
    // У папки нет id — по этому её и отличают от файла.
    if (entry.id === null) files.push(...(await collect(bucket, full)));
    else files.push(full);
  }
  return files;
}

let failed = false;

for (const bucket of BUCKETS) {
  const paths = await collect(bucket);

  if (paths.length === 0) {
    console.log(`${bucket}: пусто`);
    continue;
  }

  // Пачками по 100: remove() принимает список, но огромный запрос легко
  // упирается в лимиты — а частичный отказ тут разбирать неприятно.
  for (let i = 0; i < paths.length; i += 100) {
    const batch = paths.slice(i, i + 100);
    const { error } = await db.storage.from(bucket).remove(batch);
    if (error) {
      console.error(`${bucket}: не удалось удалить ${batch.length} шт. — ${error.message}`);
      failed = true;
    }
  }

  console.log(`${bucket}: удалено ${paths.length}`);
  for (const p of paths.slice(0, 10)) console.log(`  ${p}`);
  if (paths.length > 10) console.log(`  … и ещё ${paths.length - 10}`);
}

// Ненулевой код возврата, если хоть одна пачка не удалилась: иначе
// «удалено» в логе соседствовало бы с тихо оставшимися файлами.
process.exit(failed ? 1 : 0);
