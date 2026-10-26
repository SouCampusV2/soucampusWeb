import { describe, it, expect } from "vitest";
import { announcementContent, announcementPayload, sendDiscordAnnouncement } from "./discord-announce";
import { FALLBACK_IDENTITY, getDiscordBotIdentity, parseWebhookUrl } from "./discord-identity";

const SITE = "https://soucampus.online";

describe("объявление в Discord", () => {
  it("заголовок крупно, путь — полной ссылкой, пинг в конце", () => {
    expect(
      announcementContent({ title: "Summer sale", text: "30% off all maps.", href: "/marketplace", ping: "everyone" }, SITE)
    ).toBe("## Summer sale\n30% off all maps.\nhttps://soucampus.online/marketplace\n@everyone");
  });

  it("без пинга никого не будит", () => {
    const payload = announcementPayload({ title: "Hi", text: null, href: null, ping: "none" }, SITE, FALLBACK_IDENTITY);
    expect(payload.allowed_mentions).toEqual({ parse: [] });
    expect(payload.content).toBe("## Hi");
    expect(payload.username).toBe("BoCampus");
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
