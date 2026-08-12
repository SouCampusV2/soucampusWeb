import { describe, it, expect } from "vitest";
import { orderInputFromLineItems, type SessionLike, type LineItemLike } from "./orders";

// Граница "Checkout Session + её строки -> заказ в нашей БД" — чистая
// функция, как rowToProduct. Тесты здесь строже обычного: именно эта
// функция решает, считать ли оплату состоявшейся, ошибка стоит либо
// денег (не выдали оплаченное), либо файла (выдали неоплаченное).

const paidSession: SessionLike = {
  id: "cs_test_a1b2c3",
  payment_status: "paid",
  customer_details: { email: "buyer@example.com" },
  amount_total: 4000,
  currency: "eur",
};

const oneItem: LineItemLike[] = [
  {
    productId: "3f2c8a10-0000-4000-8000-000000000001",
    title: "Sky Cathedral",
    unitAmountCents: 1500,
    quantity: 1,
  },
];

const twoItems: LineItemLike[] = [
  ...oneItem,
  {
    productId: "3f2c8a10-0000-4000-8000-000000000002",
    title: "Ironholt Keep",
    unitAmountCents: 2500,
    quantity: 1,
  },
];

describe("orderInputFromLineItems", () => {
  it("переводит оплаченную сессию с одной позицией в заказ", () => {
    expect(orderInputFromLineItems({ ...paidSession, amount_total: 1500 }, oneItem)).toEqual({
      stripeSessionId: "cs_test_a1b2c3",
      customerEmail: "buyer@example.com",
      userId: null,
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

  it("переводит корзину из нескольких товаров в несколько позиций заказа", () => {
    // Подэтап C: корзина — не только один товар с quantity=1, но и
    // разные товары в одном заказе (в отличие от количества одного и
    // того же товара, для чего quantity и существует на уровне позиции).
    const input = orderInputFromLineItems(paidSession, twoItems);
    expect(input?.items).toHaveLength(2);
    expect(input?.totalCents).toBe(4000);
    expect(input?.items.map((i) => i.title)).toEqual(["Sky Cathedral", "Ironholt Keep"]);
  });

  it("сохраняет quantity позиции (несколько штук одного товара)", () => {
    const twoOfSame: LineItemLike[] = [{ ...oneItem[0], quantity: 3 }];
    const input = orderInputFromLineItems({ ...paidSession, amount_total: 4500 }, twoOfSame);
    expect(input?.items[0]).toEqual({
      productId: "3f2c8a10-0000-4000-8000-000000000001",
      title: "Sky Cathedral",
      priceCents: 1500,
      quantity: 3,
    });
  });

  it("НЕ принимает неоплаченную сессию", () => {
    // checkout.session.completed приходит и для отложенных способов
    // оплаты, когда деньги ещё не списаны — такую сессию записывать
    // нельзя, иначе файл уедет до оплаты.
    expect(
      orderInputFromLineItems({ ...paidSession, payment_status: "unpaid" }, oneItem)
    ).toBeNull();
  });

  it("НЕ принимает сессию без ни одной нашей позиции", () => {
    // Пустой список строк — например, все line_items сессии оказались не
    // нашими товарами (см. фильтр в buildPaidOrderFromSession).
    expect(orderInputFromLineItems(paidSession, [])).toBeNull();
  });

  it("НЕ принимает сессию без суммы или с отрицательной суммой", () => {
    expect(
      orderInputFromLineItems({ ...paidSession, amount_total: null }, oneItem)
    ).toBeNull();
    expect(
      orderInputFromLineItems({ ...paidSession, amount_total: -1 }, oneItem)
    ).toBeNull();
  });

  it("принимает заказ на нулевую сумму — корзину из одних бесплатных карт", () => {
    // Раньше здесь стояло обратное: нулевая сумма считалась порченой
    // сессией. Пока все карты стоили денег, разница не проявлялась, а с
    // появлением бесплатных ровно это и выбрасывало их из заказа.
    const free: LineItemLike[] = [
      {
        productId: "3f2c8a10-0000-4000-8000-000000000003",
        title: "Starter Hub",
        unitAmountCents: 0,
        quantity: 1,
      },
    ];
    const input = orderInputFromLineItems({ ...paidSession, amount_total: 0 }, free);
    expect(input?.items).toHaveLength(1);
    expect(input?.items[0].priceCents).toBe(0);
  });

  it("держит бесплатную карту в одном заказе с платной", () => {
    // Тот самый случай владельца: купил две карты разом, одна бесплатная —
    // в заказ попадала только платная, и в My purchases приезжала одна.
    const mixed: LineItemLike[] = [
      ...oneItem,
      {
        productId: "3f2c8a10-0000-4000-8000-000000000003",
        title: "Starter Hub",
        unitAmountCents: 0,
        quantity: 1,
      },
    ];
    const input = orderInputFromLineItems({ ...paidSession, amount_total: 1500 }, mixed);
    expect(input?.items).toHaveLength(2);
    expect(input?.items.map((i) => i.title)).toContain("Starter Hub");
  });

  it("подставляет запасной email, если Stripe его не отдал", () => {
    const noEmail = { ...paidSession, customer_details: null };
    expect(orderInputFromLineItems(noEmail, oneItem)?.customerEmail).toBe("unknown");
  });

  it("берёт userId из client_reference_id (id аккаунта покупателя)", () => {
    const withUser = { ...paidSession, client_reference_id: "user-123" };
    expect(orderInputFromLineItems(withUser, oneItem)?.userId).toBe("user-123");
    // Без поля (старые сессии/гость) — null, заказ привязан только к email.
    expect(orderInputFromLineItems(paidSession, oneItem)?.userId).toBeNull();
  });

  it("нормализует валюту к верхнему регистру", () => {
    // Stripe отдаёт "eur", в наших таблицах валюта хранится как "EUR"
    // (products.price_currency) — на границе приводим к одному виду.
    expect(orderInputFromLineItems(paidSession, oneItem)?.currency).toBe("EUR");
  });
});
