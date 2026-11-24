// Живые цифры Discord-сервера студии (24.11): сколько участников и сколько
// онлайн. Discord отдаёт их по ссылке-приглашению без ключей
// (with_counts=true). Кэш — 10 минут: цифра «онлайн» и так приблизительная,
// а дёргать Discord на каждый заход незачем. Ошибка — null, и карточка
// просто без строки с цифрами.

import { DISCORD_INVITE } from "@/lib/site";

export type DiscordStats = { members: number; online: number };

export async function getDiscordStats(): Promise<DiscordStats | null> {
  const code = DISCORD_INVITE.split("/").pop();
  if (!code) return null;
  try {
    const response = await fetch(`https://discord.com/api/v10/invites/${code}?with_counts=true`, {
      next: { revalidate: 600 },
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { approximate_member_count?: number; approximate_presence_count?: number };
    if (typeof json.approximate_member_count !== "number") return null;
    return { members: json.approximate_member_count, online: json.approximate_presence_count ?? 0 };
  } catch {
    return null;
  }
}
