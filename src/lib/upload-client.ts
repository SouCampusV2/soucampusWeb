import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { PRODUCT_FILES_BUCKET } from "@/lib/orders";

// Браузерная половина шлюза загрузки (2026-09-11).
//
// Обе формы карты — UploadMapForm (новая карта) и EditMapForm (замена
// файла) — грузят файл ОДИНАКОВО, и до сегодняшнего дня это были две
// копии одного кода в разных файлах. Раз путь всё равно переписывается,
// он переписывается один раз и в одном месте: правило про две галереи в
// этих же формах (CLAUDE.md → «Тех-долг») стоит там же не зря.
//
// Здесь нет ни одного РЕШЕНИЯ — ни размера, ни расширения, ни пути.
// Всё это говорит сервер. Задача этого файла — три шага подряд и
// внятная ошибка наружу.

/** Что показать человеку, когда шлюз отказал. */
async function problemFrom(response: Response): Promise<string> {
  const body = (await response.json().catch(() => ({}))) as {
    error?: string;
    message?: string;
  };
  // message — человеческий текст (его кладёт лимит частоты: «try again
  // in 3 min»), error — машинный код. Показываем первое, если есть.
  return (
    body.message ??
    body.error ??
    "Couldn't upload the map file. Try again in a moment."
  );
}

/**
 * Загрузить файл карты через шлюз и вернуть путь в бакете.
 *
 * Бросает Error с текстом для человека — формы ловят его тем же
 * catch'ем, что и всё остальное.
 */
export async function uploadMapFile(file: File): Promise<string> {
  // 1) Разрешение. Сервер проверяет права, лимит, размер и расширение,
  // сам строит путь и выдаёт одноразовый токен ровно на него.
  const signResponse = await fetch("/api/creator/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "sign",
      fileName: file.name,
      size: file.size,
    }),
  });
  if (!signResponse.ok) throw new Error(await problemFrom(signResponse));
  const { path, token } = (await signResponse.json()) as {
    path: string;
    token: string;
  };

  // 2) Сами байты — напрямую в Storage, мимо наших функций. Не обход
  // шлюза, а обход потолка тела запроса у Vercel (~4.5 МБ при файле до
  // 15): разрешение на эту запись уже выдали мы, на один конкретный
  // путь и один раз.
  const { error: uploadError } = await createSupabaseBrowser()
    .storage.from(PRODUCT_FILES_BUCKET)
    .uploadToSignedUrl(path, token, file, {
      contentType: file.type || "application/octet-stream",
    });
  if (uploadError) {
    throw new Error(`Couldn't upload the map file: ${uploadError.message}`);
  }

  // 3) Проверка того, что легло на самом деле: размер у Storage и
  // первые байты ranged-запросом. Не сошлось — сервер удалит объект и
  // объяснит, почему.
  const confirmResponse = await fetch("/api/creator/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "confirm", path, fileName: file.name }),
  });
  if (!confirmResponse.ok) throw new Error(await problemFrom(confirmResponse));

  return path;
}
