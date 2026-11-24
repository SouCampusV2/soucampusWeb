// Письмо о покупке (2026-11-24). Чистая функция: заказ на входе, тема,
// текст и HTML на выходе — без сети, поэтому под тестами.
//
// Зачем, кроме удобства. По праву ЕС продавец цифрового товара обязан
// прислать подтверждение договора «на долговечном носителе» — письмо им
// является, страница сайта нет. В подтверждении должны быть: кто продал и
// как с ним связаться, что куплено и за сколько, и — раз покупатель
// отказался от 14 дней на отзыв — само его согласие на немедленную
// доставку. Текст согласия берётся из legal.ts (тот же, на который
// ставилась галочка), продавец — оттуда же.
//
// Вёрстка — таблицами и инлайн-стилями, как шаблоны писем Supabase
// (supabase/email-templates/): почтовые клиенты режут внешний CSS.

import { SELLER, WAIVER_TEXT } from "@/lib/legal";
import { SITE_NAME, SITE_URL, SUPPORT_EMAIL } from "@/lib/site";

export type PurchaseEmailInput = {
  items: { title: string; priceCents: number; quantity: number }[];
  totalCents: number;
  currency: string;
  /** Номер заказа для письма — хвост id сессии Stripe, не весь id. */
  orderRef: string;
  date: Date;
};

export function formatMoney(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Короткий номер: последние 8 символов id сессии, заглавными. */
export function orderRefFrom(sessionId: string): string {
  return sessionId.slice(-8).toUpperCase();
}

export function buildPurchaseEmail(input: PurchaseEmailInput): {
  subject: string;
  text: string;
  html: string;
} {
  const purchasesUrl = `${SITE_URL}/purchases`;
  const refundsUrl = `${SITE_URL}/terms#refunds`;
  const total = formatMoney(input.totalCents, input.currency);
  const date = input.date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const subject =
    input.items.length === 1
      ? `Your map “${input.items[0].title}” is ready to download`
      : `Your ${input.items.length} maps are ready to download`;

  const lines = input.items.map((item) => {
    const qty = item.quantity > 1 ? ` × ${item.quantity}` : "";
    return { title: `${item.title}${qty}`, price: formatMoney(item.priceCents * item.quantity, input.currency) };
  });

  const text = [
    `Thanks for your purchase on ${SITE_NAME}!`,
    "",
    `Order ${input.orderRef} · ${date}`,
    ...lines.map((l) => `- ${l.title}: ${l.price}`),
    `Total paid: ${total}`,
    "",
    `Download your files any time: ${purchasesUrl}`,
    "",
    "Before paying you confirmed:",
    `"${WAIVER_TEXT}"`,
    `If a file is broken or not what the page describes, write to us and we will fix it or refund you: ${refundsUrl}`,
    "",
    `Seller: ${SELLER.name}, ${SELLER.address} · ${SUPPORT_EMAIL}`,
  ].join("\n");

  const rows = lines
    .map(
      (l) => `<tr>
<td style="padding:10px 0; border-bottom:1px solid #f0f0f2; font-size:15px; color:#09090b;">${escapeHtml(l.title)}</td>
<td align="right" style="padding:10px 0; border-bottom:1px solid #f0f0f2; font-size:15px; color:#09090b; white-space:nowrap;">${escapeHtml(l.price)}</td>
</tr>`
    )
    .join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light" />
<title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0; padding:0; background-color:#eef0f4;">
<div style="display:none; max-height:0; overflow:hidden; opacity:0;">Your files are in My purchases. Total paid ${escapeHtml(total)}.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#eef0f4;">
<tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#fbfbff; border:1px solid #e4e4e7; border-radius:20px; overflow:hidden; font-family:'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
<tr><td style="padding:24px 32px; border-bottom:1px solid #f0f0f2;">
<a href="${SITE_URL}" style="text-decoration:none; font-size:20px; font-weight:800; letter-spacing:-0.5px; color:#f97316;">SouCampus</a>
</td></tr>
<tr><td style="padding:32px;">
<h1 style="margin:0 0 8px; font-size:24px; line-height:1.25; font-weight:800; color:#09090b;">Thanks for your purchase!</h1>
<p style="margin:0 0 24px; font-size:14px; color:#71717a;">Order ${escapeHtml(input.orderRef)} · ${escapeHtml(date)}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${rows}
<tr>
<td style="padding:12px 0 0; font-size:15px; font-weight:700; color:#09090b;">Total paid</td>
<td align="right" style="padding:12px 0 0; font-size:15px; font-weight:700; color:#09090b; white-space:nowrap;">${escapeHtml(total)}</td>
</tr>
</table>
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0;">
<tr><td align="center" bgcolor="#f97316" style="border-radius:9999px;">
<a href="${purchasesUrl}" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:700; color:#09090b; text-decoration:none; border-radius:9999px;">Download in My purchases</a>
</td></tr>
</table>
<p style="margin:0 0 8px; font-size:13px; line-height:1.6; color:#71717a;">Before paying you confirmed: “${escapeHtml(WAIVER_TEXT)}”</p>
<p style="margin:0; font-size:13px; line-height:1.6; color:#71717a;">If a file is broken or not what the page describes, write to us and we will fix it or refund you. <a href="${refundsUrl}" style="color:#f97316;">Refund policy</a></p>
</td></tr>
<tr><td style="padding:24px 32px; background-color:#f4f4f7; border-top:1px solid #e4e4e7; font-size:12px; line-height:1.6; color:#a1a1aa;">
Seller: ${escapeHtml(SELLER.name)}, ${escapeHtml(SELLER.address)} · <a href="mailto:${SUPPORT_EMAIL}" style="color:#a1a1aa;">${SUPPORT_EMAIL}</a><br />
You get this email because you bought a map on ${SITE_NAME}.
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

  return { subject, text, html };
}
