// ============================================================
// КАКУЮ БАЗУ ПРОВЕРЯЕТ СКРИПТ — один ответ на всех.
//
// ⚠️ ЗАЧЕМ ЭТОТ ФАЙЛ ПОЯВИЛСЯ (2026-09-08). check:guards и check:limits
// держали выбор базы каждый у себя, и оба выбирали так:
//     PROD ? NEXT_PUBLIC_SUPABASE_URL : ..._PREVIEW ?? NEXT_PUBLIC_SUPABASE_URL
// В .env.local владельца обе пары указывают на ОДИН проект. Значит флаг
// --prod не переключал ничего, а скрипт при этом печатал «Проверяю ПРОД».
// Прогон «на обеих базах» был прогоном одной базы дважды — и запись об
// этом легла в документацию как факт.
//
// Скрипт, который врёт о том, что он проверил, хуже отсутствующего:
// отсутствующий не даёт уверенности, а этот даёт ложную. Поэтому здесь
// не «умное умолчание», а ОТКАЗ: не можешь назвать прод — не говори, что
// проверил прод.
// ============================================================
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

export function loadEnv() {
  for (const line of fs.readFileSync(path.join(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)$/);
    if (m) process.env[m[1]] = m[2].trim();
  }
}

// Ссылка проекта из адреса: https://<ref>.supabase.co. Печатаем её, а не
// голое «ПРОД», чтобы глазами было видно, куда скрипт на самом деле шёл.
export const projectRef = (url) => url?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? null;

/**
 * Возвращает { url, anonKey, serviceKey, label } или завершает процесс с
 * объяснением. `wantProd` — был ли передан --prod.
 */
export function pickTarget(wantProd) {
  const prodUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const previewUrl = process.env.NEXT_PUBLIC_SUPABASE_URL_PREVIEW;

  const url = wantProd ? prodUrl : previewUrl ?? prodUrl;
  const anonKey = wantProd
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_PREVIEW ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = wantProd
    ? process.env.SUPABASE_SERVICE_ROLE_KEY
    : process.env.SUPABASE_SERVICE_ROLE_KEY_PREVIEW ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceKey) {
    console.error("Не хватает переменных в .env.local (URL, ANON_KEY, SERVICE_ROLE_KEY).");
    process.exit(1);
  }

  // ⚠️ ГЛАВНАЯ ПРОВЕРКА ФАЙЛА. Просили прод, а адрес совпадает с preview
  // — значит настоящих прод-ключей на этой машине просто нет.
  if (wantProd && previewUrl && projectRef(prodUrl) === projectRef(previewUrl)) {
    console.error(
      `\nОтказ: просили прод, но NEXT_PUBLIC_SUPABASE_URL и ..._PREVIEW ведут в ОДИН проект (${projectRef(prodUrl)}).\n` +
        "Значит прод этим прогоном не проверить, а отчёт «Проверяю ПРОД» был бы неправдой.\n" +
        "Чтобы проверить прод, положите в .env.local прод-ключи как NEXT_PUBLIC_SUPABASE_URL /\n" +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY, а preview-ключи — в пары с _PREVIEW.\n"
    );
    process.exit(1);
  }

  return { url, anonKey, serviceKey, label: wantProd ? "ПРОД" : "preview" };
}
