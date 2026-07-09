import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — SouCampus builds",
};

// TODO: заменить "#" на реальную ссылку-приглашение Discord-сервера
const DISCORD_INVITE = "#";

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-3xl flex-1 px-6 py-24">
      <h1 className="text-4xl font-bold tracking-tight text-zinc-950 dark:text-white">
        Контакты
      </h1>
      <p className="mt-6 leading-7 text-zinc-700 dark:text-zinc-300">
        Заказы и вопросы — через Discord:
      </p>
      <a
        href={DISCORD_INVITE}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 inline-block text-lg font-semibold text-emerald-600 dark:text-emerald-400"
      >
        Присоединиться в Discord →
      </a>
      <p className="mt-8 text-sm text-zinc-500 dark:text-zinc-400">
        На сервере будет тикет-бот для оформления заказов.
      </p>
    </main>
  );
}
