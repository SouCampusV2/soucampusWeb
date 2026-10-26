import { describe, it, expect } from "vitest";
import { ANNOUNCE_COLOR, announcementPayload, sendDiscordAnnouncement } from "./discord-announce";
import { FALLBACK_IDENTITY, getDiscordBotIdentity, parseWebhookUrl } from "./discord-identity";

const SITE = "https://soucampus.online";

describe("объявление в Discord", () => {
  it("эмбед с оранжевой плашкой, путь — полной ссылкой, пинг снаружи эмбеда", () => {
    const payload = announcementPayload(
      { title: "Summer sale", text: "30% off all maps.", href: "/marketplace", ping: "everyone" },
      SITE,
      FALLBACK_IDENTITY
    );
    expect(payload.content).toBe("@everyone");
    expect(payload.allowed_mentions).toEqual({ parse: ["everyone"] });
    expect(payload.embeds).toEqual([
      {
        title: "Summer sale",
        description: "30% off all maps.",
        url: "https://soucampus.online/marketplace",
        color: ANNOUNCE_COLOR,
      },
    ]);
    expect(ANNOUNCE_COLOR).toBe(0xf97316);
  });

  it("без пинга никого не будит и не шлёт пустых полей", () => {
    const payload = announcementPayload({ title: "Hi", text: null, href: null, ping: "none" }, SITE, FALLBACK_IDENTITY);
    expect(payload.allowed_mentions).toEqual({ parse: [] });
    expect(payload.content).toBeUndefined();
    expect(payload.embeds).toEqual([{ title: "Hi", color: ANNOUNCE_COLOR }]);
    expect(payload.username).toBe("BoCampus");
  });

  it("длинный заголовок режется по пределу Discord", () => {
    const payload = announcementPayload({ title: "x".repeat(300), text: null, href: null, ping: "none" }, SITE, FALLBACK_IDENTITY);
    expect(payload.embeds[0].title).toHaveLength(256);
  });

  it("отказ Discord возвращается текстом", async () => {
    const fetchFn = (async () => new Response("bad", { status: 400 })) as unknown as typeof fetch;
    const problem = await sendDiscordAnnouncement("https://discord.com/api/webhooks/1/a", announcementPayload({ title: "x", text: null, href: null, ping: "none" }, SITE, FALLBACK_IDENTITY), fetchFn);
    expect(problem).toMatch(/400/);
  });
});

describe("подпись бота", () => {
  it("разбирает ссылку вебхука и не путает её с чужой", () => {
    expect(parseWebhookUrl("https://discord.com/api/webhooks/123/abc-DEF_9")).toEqual({ id: "123", token: "abc-DEF_9" });
    expect(parseWebhookUrl("https://evil.com/api/webhooks/123/abc")).toBeNull();
  });

  it("берёт имя и иконку приложения, владеющего вебхуком", async () => {
    const fetchFn = (async (url: string) => {
      if (url.includes("/webhooks/")) return new Response(JSON.stringify({ application_id: "777" }));
      return new Response(JSON.stringify({ name: "BoCampus", icon: "hash1" }));
    }) as unknown as typeof fetch;
    expect(await getDiscordBotIdentity("https://discord.com/api/webhooks/1/tok", fetchFn)).toEqual({
      username: "BoCampus",
      avatarUrl: "https://cdn.discordapp.com/app-icons/777/hash1.png?size=256",
    });
  });

  it("вебхук, созданный руками (без приложения), — запасная подпись", async () => {
    const fetchFn = (async () => new Response(JSON.stringify({ application_id: null }))) as unknown as typeof fetch;
    expect(await getDiscordBotIdentity("https://discord.com/api/webhooks/1/tok", fetchFn)).toEqual(FALLBACK_IDENTITY);
    expect(await getDiscordBotIdentity(undefined, fetchFn)).toEqual(FALLBACK_IDENTITY);
  });
});
