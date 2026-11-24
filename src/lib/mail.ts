// Отправка писем самим сайтом (с 2026-11-24, первое — письмо о покупке).
//
// До этого сайт писем не слал вовсе: регистрацию и сброс пароля отправляет
// Supabase Auth через тот же ящик Hostinger. Здесь — тот же ящик и те же
// настройки SMTP, только из нашего кода. Серверный модуль: пароль ящика в
// браузер попасть не должен.
//
// Переменные (Vercel, Production и Preview):
//   SMTP_HOST   smtp.hostinger.com
//   SMTP_PORT   465 (SSL с первого байта)
//   SMTP_USER   полный адрес ящика, например support@soucampus.online
//   SMTP_PASS   пароль этого ящика
//   MAIL_FROM   необязательно: «SouCampus builds <support@soucampus.online>»
//
// ⚠️ Нет переменных — письмо не уходит, и это не ошибка: так живут
// локальная разработка и preview до настройки. Сбой отправки тоже не
// бросается наружу — письмо уходит из вебхука Stripe, и упавший SMTP не
// должен превращаться в «вебхук не доставлен» (Stripe начал бы повторять
// уже записанный заказ). Вызывающий получает false и пишет в лог.
//
// У почты Hostinger суточный лимит отправки. На десятках покупок в день
// это не важно; вырастем — переезд на Resend (IDEAS.md, «Почта под сайт»),
// и меняется только этот файл.

import { createTransport } from "nodemailer";

type Transport = ReturnType<typeof createTransport>;

export type MailMessage = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

let transport: Transport | null | undefined;

function getTransport(): Transport | null {
  if (transport !== undefined) return transport;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) {
    transport = null;
    return transport;
  }
  const port = Number(process.env.SMTP_PORT ?? 465);
  transport = createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    // Вебхук Stripe ждёт ответа; повисший SMTP не должен держать его
    // дольше нескольких секунд.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transport;
}

/** true — письмо принято сервером; false — не настроено или не ушло. */
export async function sendMail(message: MailMessage): Promise<boolean> {
  const t = getTransport();
  if (!t) {
    console.warn("[mail] SMTP не настроен, письмо не отправлено:", message.subject);
    return false;
  }
  const from = process.env.MAIL_FROM ?? `SouCampus builds <${process.env.SMTP_USER}>`;
  try {
    await t.sendMail({ from, ...message });
    return true;
  } catch (err) {
    console.error("[mail] письмо не ушло:", err instanceof Error ? err.message : err);
    return false;
  }
}
