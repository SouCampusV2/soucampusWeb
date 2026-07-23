import { describe, it, expect } from "vitest";
import { orderInputFromSession, type SessionLike } from "./orders";

// Граница "Checkout Session -> заказ в нашей БД" — чистая функция, как
// rowToProduct. Тесты здесь строже обычного: именно эта функция решает,
// считать ли оплату состоявшейся, ошибка стоит либо денег (не выдали
// оплаченное), либо файла (выдали неоплаченное).

const paidSession: SessionLike = {
  id: "cs_test_a1b2c3",
  payment_status: "paid",
  customer_details: { email: "buyer@example.com" },
  amount_total: 1500,
  currency: "eur",
  metadata: {
    product_id: "3f2c8a10-0000-4000-8000-000000000001",
    product_slug: "sky-cathedral",
    product_title: "Sky Cathedral",
  },
};

describe("orderInputFromSession", () => {
  it("переводит оплаченную сессию в заказ", () => {
    expect(orderInputFromSession(paidSession)).toEqual({
      stripeSessionId: "cs_test_a1b2c3",
      customerEmail: "buyer@example.com",
      totalCents: 1500,
      currency: "EUR",
      items: [
        {
          productId: "3f2c8a10-0000-4000-8000-000000000001",
          title: "Sky Cathedral",
          priceCents: 1500,
          quantity: 1,
        },
      ],
    });
  });

  it("НЕ принимает неоплаченную сессию", () => {
    // checkout.session.completed приходит и для отложенных способов
    // оплаты, когда деньги ещё не списаны — такую сессию записывать
    // нельзя, иначе файл уедет до оплаты.
    expect(
      orderInputFromSession({ ...paidSession, payment_status: "unpaid" })
    ).toBeNull();
  });

  it("НЕ принимает сессию без нашего товара в metadata", () => {
    // Сессия без product_id создана не нашим /api/checkout — что бы это
    // ни было, заказом нашего магазина оно не является.
    expect(orderInputFromSession({ ...paidSession, metadata: {} })).toBeNull();
    expect(orderInputFromSession({ ...paidSession, metadata: null })).toBeNull();
  });

  it("НЕ принимает сессию без суммы или с нулевой суммой", () => {
    expect(
      orderInputFromSession({ ...paidSession, amount_total: null })
    ).toBeNull();
    expect(orderInputFromSession({ ...paidSession, amount_total: 0 })).toBeNull();
  });

  it("подставляет запасной email, если Stripe его не отдал", () => {
    const noEmail = { ...paidSession, customer_details: null };
    expect(orderInputFromSession(noEmail)?.customerEmail).toBe("unknown");
  });

  it("нормализует валюту к верхнему регистру", () => {
    // Stripe отдаёт "eur", в наших таблицах валюта хранится как "EUR"
    // (products.price_currency) — на границе приводим к одному виду.
    expect(orderInputFromSession(paidSession)?.currency).toBe("EUR");
  });
});
