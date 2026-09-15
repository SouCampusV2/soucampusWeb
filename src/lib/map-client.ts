import type { MapSubmission } from "@/lib/map-submission";
import { problemFromGateway } from "@/lib/upload-client";

// Браузерная половина шлюза записи карты (2026-09-13), путь №2.
//
// Здесь, как и в upload-client.ts, нет ни одного РЕШЕНИЯ: ни состояния,
// ни slug, ни веса файла, ни того, уходит ли карта на повторную
// проверку. Всё это говорит сервер. Задача этого файла — отправить
// содержимое и донести до формы внятную ошибку.

async function post(body: unknown): Promise<{ slug: string }> {
  const response = await fetch("/api/creator/map", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await problemFromGateway(response));
  return (await response.json()) as { slug: string };
}

/** Новая карта. Возвращает её slug — она уже в очереди на разбор. */
export function createMap(map: MapSubmission): Promise<{ slug: string }> {
  return post({ action: "create", map });
}

/** Правка своей карты. */
export function updateMap(
  productId: string,
  map: MapSubmission
): Promise<{ slug: string }> {
  return post({ action: "update", productId, map });
}
