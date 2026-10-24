import { formatBytes } from "@/lib/upload-limits";

// Квоты автора — сколько карт и сколько места один человек может занять.
//
// Лимит частоты (rate-limit.ts) отвечает на «как быстро», квота — на
// «сколько всего». Без квоты автор со статусом за неделю спокойно, в
// рамках лимитов, кладёт в платное хранилище сотню карт по 15 МБ и
// забивает очередь модерации так, что карты остальных в ней тонут.
//
// Два потолка, и оба про ЧУЖИХ авторов:
//  * карт «на разборе» одновременно — бережёт очередь владельца;
//  * объём файлов карт на аккаунт — бережёт хранилище. Удалённые карты
//    считаются тоже: их файл хранится, чтобы покупатели скачивали
//    оплаченное (решение 10.09), то есть место он занимает.
//
// ⚠️ Админа квоты не касаются. Владелец — единственный автор площадки и
// загружает свои карты пачками; потолок, придуманный против спама,
// упирался бы в него первым.
//
// Числа — решение о продукте, поэтому здесь, а не в базе (тот же довод,
// что у rate-limit.ts). Функция чистая: считает обработчик, решает она.

export const MAX_PENDING_MAPS = 5;
export const MAX_MAP_STORAGE_BYTES = 500 * 1024 * 1024; // 500 МБ на автора

export type QuotaUsage = {
  /** Карт в состоянии pending прямо сейчас. */
  pendingMaps: number;
  /** Сумма file_size_bytes по всем картам автора, удалённые тоже. */
  storedBytes: number;
};

/** null — можно; строка — причина отказа для человека. */
export function checkCreatorQuota(
  usage: QuotaUsage,
  incomingBytes: number,
  isAdmin: boolean
): string | null {
  if (isAdmin) return null;

  if (usage.pendingMaps >= MAX_PENDING_MAPS) {
    return `You already have ${usage.pendingMaps} maps waiting for review. Wait for a decision on one of them before sending another.`;
  }

  if (usage.storedBytes + incomingBytes > MAX_MAP_STORAGE_BYTES) {
    const left = Math.max(0, MAX_MAP_STORAGE_BYTES - usage.storedBytes);
    return `Your maps take up ${formatBytes(usage.storedBytes)} of ${formatBytes(MAX_MAP_STORAGE_BYTES)}, and this file needs ${formatBytes(incomingBytes)} (${formatBytes(left)} left). Write to support if you need more room.`;
  }

  return null;
}
