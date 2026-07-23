import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { orderInputFromSession, recordPaidOrder } from "@/lib/orders";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

// Вебхук Stripe: сюда Stripe сам присылает событие "оплата прошла".
//
// Почему заказ фиксирует вебхук, а не редирект покупателя на страницу
// успеха: редиректа может НЕ БЫТЬ. Человек оплатил и закрыл вкладку —
// деньги списаны, а на success_url он не вернулся. Вебхук же Stripe
// доставляет сам и ретраит до трёх суток, пока не получит 200.
//
// Безопасность держится на подписи. URL вебхука публичный — POST сюда
// может отправить кто угодно, и без проверки любой желающий "сообщил"
// бы нам о несуществующей оплате и получил файл бесплатно. Поэтому
// каждое событие подписано секретом (STRIPE_WEBHOOK_SECRET), который
// знают только Stripe и наш сервер, и подпись считается от СЫРОГО тела
// запроса: распарсить JSON и собрать обратно нельзя — изменится хоть
// байт, подпись не сойдётся. Отсюда request.text(), а не request.json().
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    // Без секрета проверить подпись нечем — значит, не обрабатываем
    // ничего. Молча верить событиям "пока секрет не настроен" нельзя.
    console.error("STRIPE_WEBHOOK_SECRET не задан, вебхук отключён");
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "no signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(
      await request.text(),
      signature,
      secret
    );
  } catch {
    // Подпись не сошлась: либо подделка, либо не тот секрет в env.
    // 400 без подробностей — атакующему диагностика ни к чему.
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const input = orderInputFromSession(event.data.object);
    if (input) {
      // Про повторную доставку того же события заботится recordPaidOrder
      // (unique на stripe_session_id) — здесь просто пишем.
      await recordPaidOrder(input);
    }
  }
  // Остальные типы событий подтверждаем не глядя: отвечать 400 нельзя —
  // Stripe посчитает вебхук сломанным и будет ретраить впустую.

  return NextResponse.json({ received: true });
}
