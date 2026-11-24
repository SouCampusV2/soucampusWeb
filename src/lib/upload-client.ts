import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { PRODUCT_FILES_BUCKET } from "@/lib/orders-shape";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/products";
import { AVATARS_BUCKET, PORTFOLIO_IMAGES_BUCKET } from "@/lib/upload-limits";

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

/**
 * Что показать человеку, когда шлюз отказал.
 *
 * Общая на оба шлюза — загрузку файла и запись карты (map-client.ts):
 * разбор ответа у них дословно одинаков, а разъехавшись, они однажды
 * по-разному покажут одно и то же 429.
 */
export async function problemFromGateway(response: Response): Promise<string> {
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
/**
 * onChecked — сообщить форме, прошёл ли файл антивирус на самом деле
 * (ответ confirm, поле scanned; 24.11). Нужен для пометки «✓ Checked for
 * viruses»: без сканера на сервере её показывать нельзя.
 */
export type OnChecked = (scanned: boolean) => void;

export async function uploadMapFile(file: File, onChecked?: OnChecked): Promise<string> {
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
  if (!signResponse.ok) throw new Error(await problemFromGateway(signResponse));
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
  if (!confirmResponse.ok) throw new Error(await problemFromGateway(confirmResponse));

  // Проверенный файл уже на постоянном пути: путь из sign больше не годится.
  const { path: finalPath, scanned } = (await confirmResponse.json()) as {
    path: string;
    scanned?: boolean;
  };
  onChecked?.(scanned === true);
  return finalPath;
}

/**
 * Загрузить картинку через шлюз и вернуть ПУБЛИЧНУЮ ссылку на неё.
 *
 * kind решает всё остальное: "product" — обложка, галерея и картинки
 * описания карты (бакет product-images, нужен статус креатора),
 * "avatar" и "banner" — картинки профиля (бакет avatars, хватает
 * входа). Путь в
 * обоих случаях строит сервер: здесь его не видно нарочно.
 *
 * Бросает Error с текстом для человека — формы ловят его тем же
 * catch'ем, что и всё остальное.
 */
export async function uploadImage(
  file: File,
  kind: "product" | "avatar" | "banner" | "portfolio",
  onChecked?: OnChecked
): Promise<string> {
  const sign = await fetch("/api/creator/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "sign",
      kind,
      fileName: file.name,
      size: file.size,
    }),
  });
  if (!sign.ok) throw new Error(await problemFromGateway(sign));
  // Куда загружать, называет сервер: с 12.11 непроверенная картинка
  // ложится в отдельный закрытый бакет, а не в тот, где будет жить
  // (аудит 2026-11, S-19). `bucket` ниже — уже про готовую картинку.
  const {
    path,
    token,
    bucket: uploadBucket,
  } = (await sign.json()) as { path: string; token: string; bucket: string };

  const bucket =
    kind === "product"
      ? PRODUCT_IMAGES_BUCKET
      : kind === "portfolio"
        ? PORTFOLIO_IMAGES_BUCKET
        : AVATARS_BUCKET;
  const supabase = createSupabaseBrowser();

  // Байты — напрямую в Storage по одноразовому токену, мимо наших
  // функций: тот же обход потолка тела запроса у Vercel, что у файла
  // карты. Разрешение на эту запись уже выдали мы, на один путь.
  const { error: uploadError } = await supabase.storage
    .from(uploadBucket)
    .uploadToSignedUrl(path, token, file, {
      contentType: file.type || "application/octet-stream",
    });
  if (uploadError) {
    throw new Error(`Couldn't upload the image: ${uploadError.message}`);
  }

  // Проверка того, что легло: размер у Storage и первые байты. Для
  // аватара этот же шаг переставляет файл с временного пути на
  // постоянный, поэтому ссылку строим по пути ИЗ ОТВЕТА, а не по тому,
  // который выдал sign.
  const confirm = await fetch("/api/creator/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "confirm", kind, path, fileName: file.name }),
  });
  if (!confirm.ok) throw new Error(await problemFromGateway(confirm));
  const { path: finalPath, scanned } = (await confirm.json()) as {
    path: string;
    scanned?: boolean;
  };
  onChecked?.(scanned === true);

  const { data } = supabase.storage.from(bucket).getPublicUrl(finalPath);
  // ?v=… у аватара и баннера сбивает кэш браузера и CDN: путь
  // постоянный, и без метки после замены показался бы старый файл.
  // У карты и портфолио путь каждый раз новый — метка там не нужна.
  return kind === "avatar" || kind === "banner"
    ? `${data.publicUrl}?v=${Date.now()}`
    : data.publicUrl;
}
