// Требования к паролю — ОДИН источник на регистрацию и на сброс.
//
// Раньше список жил внутри AuthForm. Со сбросом пароля появилось второе
// место, где нужны ровно те же правила и ровно тот же чеклист под полем:
// разъехавшись, они дали бы абсурд вроде «пароль, который нельзя было
// придумать при регистрации, но можно поставить при сбросе».
export const PASSWORD_RULES: { label: string; test: (p: string) => boolean }[] = [
  { label: "At least 8 characters", test: (p) => p.length >= 8 },
  { label: "An uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { label: "A lowercase letter", test: (p) => /[a-z]/.test(p) },
  { label: "A number", test: (p) => /[0-9]/.test(p) },
  { label: "A symbol (!?@#…)", test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export function passwordMeetsRules(password: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}

// Переводим технические сообщения Supabase в человеческие. Заодно
// страхуемся от пустого/мусорного текста (был случай, когда ошибка
// триггера БД приходила как "{}").
export function friendlyAuthError(message?: string): string {
  const m = (message ?? "").toLowerCase();
  if (
    m.includes("already registered") ||
    m.includes("already exists") ||
    m.includes("user already")
  ) {
    return "This email is already registered — try signing in instead.";
  }
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "Wrong email or password.";
  }
  // Ссылка из письма одноразовая и живёт около часа.
  if (m.includes("expired") || m.includes("invalid token")) {
    return "This link has expired. Request a new one below.";
  }
  // Supabase запрещает ставить пароль, совпадающий с текущим.
  if (m.includes("should be different") || m.includes("same as the old")) {
    return "That's your current password — pick a different one.";
  }
  return message && message !== "{}"
    ? message
    : "Something went wrong. Please try again.";
}
