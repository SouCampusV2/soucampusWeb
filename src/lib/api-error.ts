// Разбор отказа от наших же обработчиков /api/* — одно место на всех.
//
// ЗАЧЕМ. Обработчики отвечают на отказ двумя полями: `error` — машинный
// код («already handled», «rate limited»), `message` — текст для человека
// со сроком («try again in 3 min»). Читали это семь компонентов, каждый
// своей копией `response.json().catch(() => null)` и своим порядком
// `message ?? error ?? "что-нибудь"`. Тексты фоллбэков уже разъехались —
// ровно та болезнь, что была у семи копий свечения и семи способов
// напечатать дату (отчёт 2026-08-24).
//
// ⚠️ ПОЧЕМУ ВОЗВРАЩАЕТ РАЗОБРАННОЕ, А НЕ ГОТОВУЮ СТРОКУ. Напрашивалось
// `readErrorMessage(response, fallback): string` — и это сломало бы два
// места из семи молча:
//
//   • ApplicationActions и ModerationActions ветвятся по КОДУ («already
//     handled» → «Someone already decided this one»), а не по тексту;
//   • AnnounceForm дописывает к пришедшему тексту свою фразу («Nothing
//     was delivered…»), а к собственному фоллбэку — не дописывает,
//     потому что она там уже есть. Ему нужно знать, ПРИШЁЛ ли текст,
//     а не получить подставленный за него.
//
// Общее у всех семи ровно одно — безопасно разобрать тело. Решение, что
// показать, остаётся на месте вызова: это про интерфейс, а не про сеть.
//
// Тело читается ОДИН раз: Response.json() у прочитанного ответа бросает
// «body stream already read», поэтому вызывать после этой функции ещё
// раз нельзя.

export type ApiError = {
  /** Машинный код от обработчика. null — тело пустое или не JSON. */
  code: string | null;
  /** Текст для человека. null — обработчик его не прислал. */
  message: string | null;
};

export async function readApiError(response: Response): Promise<ApiError> {
  // Отказ может прийти и не от нас: прокси и сама платформа отвечают
  // HTML-страницей. Поэтому не «разобрать и упасть», а «разобрать или
  // считать, что тела нет».
  const data = (await response.json().catch(() => null)) as
    | Record<string, unknown>
    | null;

  return {
    code: typeof data?.error === "string" ? data.error : null,
    message: typeof data?.message === "string" ? data.message : null,
  };
}
