import Stripe from "stripe";

// Тот же ленивый singleton, что у getSupabase()/getSupabaseAdmin(): импорт
// файла ничего не требует, клиент создаётся при первом реальном обращении.
// Секретный ключ живёт только на сервере (route handlers) — без префикса
// NEXT_PUBLIC_, физически не попадает в браузерный бандл.
let client: Stripe | null = null;

export function getStripe() {
  if (typeof window !== "undefined") {
    throw new Error(
      "getStripe() вызван в браузере. Секретный ключ Stripe должен " +
        "использоваться только на сервере (route handlers)."
    );
  }

  if (client) return client;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "Не задан STRIPE_SECRET_KEY. См. .env.example — ключ берётся в " +
        "Stripe Dashboard → Developers → API keys (test mode)."
    );
  }

  client = new Stripe(secretKey);
  return client;
}
