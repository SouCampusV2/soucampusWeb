import { problemFromGateway } from "@/lib/upload-client";

// Браузерная половина трёх шлюзов — комментариев, откликов и
// уведомлений (2026-09-21).
//
// Здесь нет ни одного РЕШЕНИЯ: ни кто может писать, ни как часто, ни
// что считается покупкой. Всё это говорит сервер. Задача файла — один
// fetch и внятная ошибка наружу, одинаково во всех местах.
//
// Разбор ответа взят у шлюза загрузки (problemFromGateway): message —
// человеческий текст (его кладёт лимит частоты), error — машинный код.
// Свой разбор здесь однажды показал бы то же 429 другими словами.

async function post(url: string, body: unknown): Promise<void> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await problemFromGateway(response));
}

/** Написать комментарий. Бросает Error с текстом для человека. */
export async function postComment(productId: string, body: string): Promise<void> {
  return post("/api/comments", { action: "create", productId, body });
}

/** Удалить комментарий: свой, или чужой под своей картой. */
export async function deleteComment(commentId: string): Promise<void> {
  return post("/api/comments", { action: "delete", commentId });
}

/** Поставить оценку звёздами (1–5). Может только купивший. */
export async function rateProduct(productId: string, stars: number): Promise<void> {
  return post("/api/feedback", { action: "rate", productId, stars });
}

/** Поставить или снять реакцию. */
export async function setReaction(productId: string, on: boolean): Promise<void> {
  return post("/api/feedback", { action: "react", productId, on });
}

/** Отметить свои уведомления прочитанными. */
export async function markNotificationsRead(ids: string[]): Promise<void> {
  return post("/api/notifications", { action: "read", ids });
}

/** Удалить свои уведомления. */
export async function deleteNotifications(ids: string[]): Promise<void> {
  return post("/api/notifications", { action: "delete", ids });
}
